import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle, Shield, Flag, MessageSquare, CheckCircle, X, BookOpen, Image, Tv, User,
  ExternalLink, EyeOff, Eye, Trash2, Clock,
} from "lucide-react";
import { api as backendApi, type TimeoutDuration } from "@/lib/api";
import type { ReportStatus, ReportType, StoryType } from "@/types/domain";

interface ReportRow {
  id: string;
  report_type: ReportType;
  status: ReportStatus;
  reason: string;
  details: string | null;
  created_at: string;
  admin_notes: string | null;
  story_id: string | null;
  chapter_id: string | null;
  episode_id: string | null;
  comment_id: string | null;
  reported_user_id: string | null;
  reporter_id: string;
  dmca_claimant_name: string | null;
  dmca_claimant_email: string | null;
  dmca_original_work_url: string | null;

  reporter_profile: { username: string | null } | null;
  story_title: string | null;
  chapter_title: string | null;
  episode_title: string | null;
  comment_excerpt: string | null;
  reported_username: string | null;
  target: ReportTarget | null;
  reported_timeout_until: string | null;
  reporter_timeout_until: string | null;
}

// The most specific piece of content a report points at, with where to view it
interface ReportTarget {
  kind: "story" | "chapter" | "episode" | "comment";
  id: string;
  href: string;
  reviewStatus: string | null;
  exists: boolean;
}

type UpdateStatus = "resolved" | "dismissed" | "reviewing";

const reportTypeConfig: Record<ReportType, { label: string; icon: React.ElementType; color: string }> = {
  dmca:    { label: "DMCA",    icon: AlertTriangle, color: "text-destructive" },
  content: { label: "Content", icon: Flag,          color: "text-warning" },
  user:    { label: "User",    icon: Shield,         color: "text-muted-foreground" },
};

const statusVariants: Record<ReportStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending:   "secondary",
  reviewing: "outline",
  resolved:  "default",
  dismissed: "destructive",
};

function stripHtml(html: string, maxLen = 80): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

const readerPath = (type: StoryType | undefined, storyId: string, chapterId: string) =>
  `/read/${type === "manga" || type === "comic" ? "manga" : "novel"}/${storyId}/${chapterId}`;

const TIMEOUT_OPTIONS: { value: TimeoutDuration; label: string }[] = [
  { value: "1h",  label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "3d",  label: "3 days" },
  { value: "7d",  label: "7 days" },
  { value: "30d", label: "30 days" },
];

interface TimeoutTarget {
  userId: string;
  username: string | null;
  role: "reported user" | "reporter";
}

// Timeout = the user can still sign in and read, but can't post or edit anything
// until it expires. `message` is stored for the upcoming user message system.
const TimeoutDialog = ({
  target, reportId, defaultReason, onClose, onDone,
}: {
  target: TimeoutTarget | null;
  reportId: string;
  defaultReason: string;
  onClose: () => void;
  onDone: () => void;
}) => {
  const { toast } = useToast();
  const [duration, setDuration] = useState<TimeoutDuration>("24h");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setDuration("24h");
    setReason(target.role === "reporter" ? "Abusive or false report" : defaultReason);
    setMessage("");
  }, [target, defaultReason]);

  const submit = async () => {
    if (!target || !reason.trim()) return;
    setSaving(true);
    try {
      await backendApi.admin.timeoutUser(target.userId, {
        duration,
        reason: reason.trim(),
        message: message.trim() || undefined,
        reportId,
      });
      toast({ title: `@${target.username ?? "user"} timed out for ${TIMEOUT_OPTIONS.find((o) => o.value === duration)?.label}` });
      onDone();
      onClose();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Timeout {target?.role} @{target?.username ?? "user"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            They can still sign in and read, but can't comment, review, rate, report, or publish/edit content until the timeout ends.
          </p>
          <Select value={duration} onValueChange={(v) => setDuration(v as TimeoutDuration)}>
            <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEOUT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Reason (required, internal)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-background border-border"
          />
          <Textarea
            placeholder="Message to the user (optional — shown once the message system is added)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-background border-border"
            rows={3}
          />
          <Button onClick={submit} disabled={saving || !reason.trim()} className="w-full gap-1.5">
            <Clock className="h-4 w-4" /> {saving ? "Applying..." : "Apply timeout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const formatUntil = (iso: string) => new Date(iso).toLocaleString();

interface ReportCardProps {
  report: ReportRow;
  onUpdate: (id: string, status: UpdateStatus, notes?: string) => Promise<void>;
  onReload: () => void;
}

const ReportCard = ({ report: r, onUpdate, onReload }: ReportCardProps) => {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(r.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  const typeInfo = reportTypeConfig[r.report_type] ?? reportTypeConfig.content;
  const TypeIcon = typeInfo.icon;
  const t = r.target;

  const subject =
    r.chapter_title ??
    r.episode_title ??
    r.story_title ??
    (r.comment_excerpt ? `"${r.comment_excerpt}"` : null) ??
    r.reported_username ??
    "—";

  const run = async (fn: () => Promise<void>, success: string) => {
    setSaving(true);
    try {
      await fn();
      toast({ title: success });
      onReload();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const act = async (status: UpdateStatus) => {
    setSaving(true);
    await onUpdate(r.id, status, notes || undefined);
    setSaving(false);
  };

  const setContentStatus = (status: "approved" | "rejected") => {
    if (!t || t.kind === "comment") return Promise.resolve();
    if (t.kind === "story") return backendApi.admin.reviewStory(t.id, status);
    if (t.kind === "chapter") return backendApi.admin.reviewChapter(t.id, status);
    return backendApi.admin.reviewEpisode(t.id, status);
  };

  const takeDown = () => {
    if (!t) return;
    const what = t.kind === "comment" ? "delete this comment" : `take down this ${t.kind} (hide it from the public)`;
    if (!confirm(`Are you sure you want to ${what} and resolve the report?`)) return;
    const note = [notes, t.kind === "comment" ? "[Comment deleted]" : `[${t.kind} taken down]`].filter(Boolean).join("\n");
    run(async () => {
      if (t.kind === "comment") await backendApi.admin.deleteComment(t.id);
      else await setContentStatus("rejected");
      await backendApi.admin.resolveReport(r.id, "resolved", note);
    }, t.kind === "comment" ? "Comment deleted, report resolved" : "Content taken down, report resolved");
  };

  const restore = () => {
    if (!t || !confirm(`Restore this ${t.kind} (make it public again)?`)) return;
    run(() => setContentStatus("approved"), "Content restored");
  };

  const [timeoutTarget, setTimeoutTarget] = useState<TimeoutTarget | null>(null);

  const removeTimeout = (userId: string, username: string | null) => {
    if (!confirm(`Remove the timeout for @${username ?? "this user"}?`)) return;
    run(() => backendApi.admin.removeTimeout(userId), "Timeout removed");
  };

  const takenDown = t?.reviewStatus === "rejected";

  const timeoutControls = (userId: string, username: string | null, role: TimeoutTarget["role"], until: string | null) =>
    until ? (
      <Button size="sm" variant="outline" onClick={() => removeTimeout(userId, username)} disabled={saving} className="gap-1">
        <Clock className="h-3 w-3" /> Remove {role} timeout (until {formatUntil(until)})
      </Button>
    ) : (
      <Button size="sm" variant="outline" onClick={() => setTimeoutTarget({ userId, username, role })} disabled={saving} className="gap-1 text-destructive">
        <Clock className="h-3 w-3" /> Timeout {role}
      </Button>
    );

  return (
    <div className="border border-border rounded-lg bg-card">
      <button
        className="w-full text-left p-4 flex items-center gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <TypeIcon className={`h-5 w-5 flex-shrink-0 ${typeInfo.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusVariants[r.status]} className="capitalize text-xs">{r.status}</Badge>
            <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
            {t && !t.exists && <Badge variant="outline" className="text-xs">Content deleted</Badge>}
            {takenDown && <Badge variant="destructive" className="text-xs">Taken down</Badge>}
            <span className="text-sm font-medium truncate">{r.reason}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {subject} · by {r.reporter_profile?.username ?? "Unknown"} · {new Date(r.created_at).toLocaleDateString()}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="p-3 rounded-lg bg-secondary/40 text-sm space-y-1">
            {r.story_title    && <p><span className="text-muted-foreground">Story:</span> {r.story_title}</p>}
            {r.chapter_title  && <p><span className="text-muted-foreground">Chapter:</span> {r.chapter_title}</p>}
            {r.episode_title  && <p><span className="text-muted-foreground">Episode:</span> {r.episode_title}</p>}
            {r.comment_excerpt && <p><span className="text-muted-foreground">Comment:</span> {r.comment_excerpt}</p>}
            {r.reported_username && <p><span className="text-muted-foreground">Reported user:</span> @{r.reported_username}</p>}
            {t?.reviewStatus && (
              <p><span className="text-muted-foreground">Content status:</span> <span className="capitalize">{t.reviewStatus}</span></p>
            )}
          </div>

          {/* Go to the reported content / people (opens in a new tab so the queue stays put) */}
          <div className="flex gap-2 flex-wrap">
            {t?.exists && (
              <Button asChild size="sm" variant="outline" className="gap-1">
                <Link to={t.href} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" /> Open reported {t.kind}
                </Link>
              </Button>
            )}
            {r.reported_user_id && (
              <Button asChild size="sm" variant="outline" className="gap-1">
                <Link to={`/profile/${r.reported_user_id}`} target="_blank" rel="noopener noreferrer">
                  <User className="h-3 w-3" /> Reported user
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="ghost" className="gap-1">
              <Link to={`/profile/${r.reporter_id}`} target="_blank" rel="noopener noreferrer">
                <User className="h-3 w-3" /> Reporter
              </Link>
            </Button>
          </div>

          {r.details && <p className="text-sm text-foreground/80">{r.details}</p>}

          {r.report_type === "dmca" && (
            <div className="p-3 bg-destructive/10 rounded-lg space-y-1 text-sm">
              <p className="font-medium text-destructive text-xs">DMCA Takedown Request</p>
              <p><strong>Claimant:</strong> {r.dmca_claimant_name ?? "N/A"}</p>
              <p><strong>Email:</strong> {r.dmca_claimant_email ?? "N/A"}</p>
              {r.dmca_original_work_url && (
                <p>
                  <strong>Original work:</strong>{" "}
                  <a href={r.dmca_original_work_url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                    {r.dmca_original_work_url}
                  </a>
                </p>
              )}
            </div>
          )}

          <Textarea
            placeholder="Admin notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-background border-border"
            rows={2}
          />

          {/* Moderation actions on the content itself */}
          {t?.exists && (
            <div className="flex gap-2 flex-wrap">
              {!takenDown && (
                <Button size="sm" variant="destructive" onClick={takeDown} disabled={saving} className="gap-1">
                  {t.kind === "comment" ? <Trash2 className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {t.kind === "comment" ? "Delete comment & resolve" : "Take down & resolve"}
                </Button>
              )}
              {takenDown && (
                <Button size="sm" variant="outline" onClick={restore} disabled={saving} className="gap-1">
                  <Eye className="h-3 w-3" /> Restore content
                </Button>
              )}
            </div>
          )}

          {/* Timeouts for either side of the report */}
          <div className="flex gap-2 flex-wrap">
            {r.reported_user_id && timeoutControls(r.reported_user_id, r.reported_username, "reported user", r.reported_timeout_until)}
            {timeoutControls(r.reporter_id, r.reporter_profile?.username ?? null, "reporter", r.reporter_timeout_until)}
          </div>

          <TimeoutDialog
            target={timeoutTarget}
            reportId={r.id}
            defaultReason={r.reason}
            onClose={() => setTimeoutTarget(null)}
            onDone={onReload}
          />

          {/* Report workflow */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => act("reviewing")} disabled={saving} className="gap-1">
              <MessageSquare className="h-3 w-3" /> Reviewing
            </Button>
            <Button size="sm" onClick={() => act("resolved")} disabled={saving} className="gap-1">
              <CheckCircle className="h-3 w-3" /> Resolve
            </Button>
            <Button size="sm" variant="secondary" onClick={() => act("dismissed")} disabled={saving} className="gap-1">
              <X className="h-3 w-3" /> Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminReports = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: rawReports, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !rawReports) {
      toast({ title: "Error loading reports", description: error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];
    const commentIds = uniq(rawReports.map((r) => r.comment_id));

    const commentsRes = commentIds.length
      ? await supabase.from("comments").select("id, content, story_id, chapter_id, episode_id").in("id", commentIds)
      : { data: [] as { id: string; content: string; story_id: string; chapter_id: string | null; episode_id: string | null }[] };
    const comments = commentsRes.data ?? [];

    // Include the parents of reported comments so their links can be built too
    const storyIds   = uniq([...rawReports.map((r) => r.story_id), ...comments.map((c) => c.story_id)]);
    const chapterIds = uniq([...rawReports.map((r) => r.chapter_id), ...comments.map((c) => c.chapter_id)]);
    const episodeIds = uniq([...rawReports.map((r) => r.episode_id), ...comments.map((c) => c.episode_id)]);
    const profileIds = uniq([...rawReports.map((r) => r.reporter_id), ...rawReports.map((r) => r.reported_user_id)]);

    const [profilesRes, storiesRes, chaptersRes, episodesRes, timeoutsRes] = await Promise.all([
      profileIds.length ? supabase.from("profiles").select("id, username").in("id", profileIds) : { data: [] },
      storyIds.length ? supabase.from("stories").select("id, title, type, review_status").in("id", storyIds) : { data: [] },
      chapterIds.length ? supabase.from("chapters").select("id, title, story_id, review_status").in("id", chapterIds) : { data: [] },
      episodeIds.length ? supabase.from("episodes").select("id, title, story_id, review_status").in("id", episodeIds) : { data: [] },
      profileIds.length
        ? supabase
            .from("user_moderation_actions")
            .select("user_id, expires_at")
            .eq("action_type", "timeout")
            .is("revoked_at", null)
            .gt("expires_at", new Date().toISOString())
            .in("user_id", profileIds)
        : { data: [] },
    ]);

    const timeoutUntil = new Map<string, string>();
    ((timeoutsRes.data ?? []) as { user_id: string; expires_at: string | null }[]).forEach((t) => {
      if (t.expires_at && (!timeoutUntil.has(t.user_id) || t.expires_at > timeoutUntil.get(t.user_id)!)) {
        timeoutUntil.set(t.user_id, t.expires_at);
      }
    });

    const byId = <T extends { id: string }>(rows: T[] | null) => new Map((rows ?? []).map((x) => [x.id, x]));
    const profiles = byId(profilesRes.data as { id: string; username: string | null }[]);
    const stories  = byId(storiesRes.data as { id: string; title: string; type: StoryType; review_status: string }[]);
    const chapters = byId(chaptersRes.data as { id: string; title: string; story_id: string; review_status: string }[]);
    const episodes = byId(episodesRes.data as { id: string; title: string; story_id: string; review_status: string }[]);
    const commentMap = byId(comments);

    const chapterHref = (chapterId: string, fallbackStoryId: string | null) => {
      const ch = chapters.get(chapterId);
      const storyId = ch?.story_id ?? fallbackStoryId;
      return storyId ? readerPath(stories.get(storyId)?.type, storyId, chapterId) : null;
    };
    const episodeHref = (episodeId: string, fallbackStoryId: string | null) => {
      const storyId = episodes.get(episodeId)?.story_id ?? fallbackStoryId;
      return storyId ? `/watch/${storyId}/${episodeId}` : null;
    };

    const targetOf = (r: (typeof rawReports)[number]): ReportTarget | null => {
      if (r.comment_id) {
        const c = commentMap.get(r.comment_id);
        const href = c
          ? (c.chapter_id && chapterHref(c.chapter_id, c.story_id)) ||
            (c.episode_id && episodeHref(c.episode_id, c.story_id)) ||
            `/story/${c.story_id}`
          : "";
        return { kind: "comment", id: r.comment_id, href, reviewStatus: null, exists: !!c };
      }
      if (r.chapter_id) {
        const ch = chapters.get(r.chapter_id);
        return { kind: "chapter", id: r.chapter_id, href: chapterHref(r.chapter_id, r.story_id) ?? "", reviewStatus: ch?.review_status ?? null, exists: !!ch };
      }
      if (r.episode_id) {
        const ep = episodes.get(r.episode_id);
        return { kind: "episode", id: r.episode_id, href: episodeHref(r.episode_id, r.story_id) ?? "", reviewStatus: ep?.review_status ?? null, exists: !!ep };
      }
      if (r.story_id) {
        const s = stories.get(r.story_id);
        return { kind: "story", id: r.story_id, href: `/story/${r.story_id}`, reviewStatus: s?.review_status ?? null, exists: !!s };
      }
      return null;
    };

    setReports(rawReports.map((r) => {
      const comment = r.comment_id ? commentMap.get(r.comment_id) : undefined;
      return {
        ...r,
        comment_id: r.comment_id ?? null,
        reporter_profile:  { username: profiles.get(r.reporter_id)?.username ?? null },
        story_title:       r.story_id   ? (stories.get(r.story_id)?.title ?? null) : null,
        chapter_title:     r.chapter_id ? (chapters.get(r.chapter_id)?.title ?? null) : null,
        episode_title:     r.episode_id ? (episodes.get(r.episode_id)?.title ?? null) : null,
        comment_excerpt:   comment ? stripHtml(comment.content) : null,
        reported_username: r.reported_user_id ? (profiles.get(r.reported_user_id)?.username ?? null) : null,
        target: targetOf(r),
        reported_timeout_until: r.reported_user_id ? (timeoutUntil.get(r.reported_user_id) ?? null) : null,
        reporter_timeout_until: timeoutUntil.get(r.reporter_id) ?? null,
      };
    }));
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: UpdateStatus, admin_notes?: string) => {
    try {
      await backendApi.admin.resolveReport(id, status, admin_notes);
      toast({ title: `Report ${status}` });
      load();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const byCategory = {
    all:      reports,
    stories:  reports.filter((r) => r.target?.kind === "story"),
    chapters: reports.filter((r) => r.target?.kind === "chapter"),
    episodes: reports.filter((r) => r.target?.kind === "episode"),
    comments: reports.filter((r) => r.target?.kind === "comment"),
    users:    reports.filter((r) => !r.target && !!r.reported_user_id),
  };

  const tabs: { key: keyof typeof byCategory; label: string; icon: React.ElementType }[] = [
    { key: "all",      label: "All",      icon: Flag        },
    { key: "stories",  label: "Stories",  icon: BookOpen    },
    { key: "chapters", label: "Chapters", icon: Image       },
    { key: "episodes", label: "Episodes", icon: Tv          },
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "users",    label: "Users",    icon: User        },
  ];

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="bg-secondary border border-border flex-wrap h-auto gap-1 p-1">
            {tabs.map(({ key, label, icon: Icon }) => {
              const count = byCategory[key].length;
              return (
                <TabsTrigger key={key} value={key} className="data-[state=active]:bg-card gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {count > 0 && (
                    <span className="ml-0.5 text-xs text-muted-foreground">({count})</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map(({ key }) => (
            <TabsContent key={key} value={key} className="mt-4 space-y-2">
              {byCategory[key].length === 0 ? (
                <p className="text-muted-foreground py-6 text-center">No reports in this category.</p>
              ) : (
                byCategory[key].map((r) => (
                  <ReportCard key={r.id} report={r} onUpdate={updateStatus} onReload={load} />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default AdminReports;
