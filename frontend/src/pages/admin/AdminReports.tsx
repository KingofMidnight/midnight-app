import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Shield, Flag, MessageSquare, CheckCircle, X, BookOpen, Image, Tv, User } from "lucide-react";
import { api as backendApi } from "@/lib/api";
import type { ReportStatus, ReportType } from "@/types/domain";

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
}

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
  return text.length > maxLen ? text.slice(0, maxLen) + "â€¦" : text;
}

interface ReportCardProps {
  report: ReportRow;
  onUpdate: (id: string, status: "resolved" | "dismissed" | "reviewing", notes?: string) => Promise<void>;
}

const ReportCard = ({ report: r, onUpdate }: ReportCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(r.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  const typeInfo = reportTypeConfig[r.report_type] ?? reportTypeConfig.content;
  const TypeIcon = typeInfo.icon;

  const subject =
    r.story_title ??
    r.chapter_title ??
    r.episode_title ??
    (r.comment_excerpt ? `"${r.comment_excerpt}"` : null) ??
    r.reported_username ??
    "â€”";

  const act = async (status: "resolved" | "dismissed" | "reviewing") => {
    setSaving(true);
    await onUpdate(r.id, status, notes || undefined);
    setSaving(false);
  };

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
            <span className="text-sm font-medium truncate">{r.reason}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {subject} Â· by {r.reporter_profile?.username ?? "Unknown"} Â· {new Date(r.created_at).toLocaleDateString()}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {}
          <div className="p-3 rounded-lg bg-secondary/40 text-sm space-y-1">
            {r.story_title    && <p><span className="text-muted-foreground">Story:</span> {r.story_title}</p>}
            {r.chapter_title  && <p><span className="text-muted-foreground">Chapter:</span> {r.chapter_title}</p>}
            {r.episode_title  && <p><span className="text-muted-foreground">Episode:</span> {r.episode_title}</p>}
            {r.comment_excerpt && <p><span className="text-muted-foreground">Comment:</span> {r.comment_excerpt}</p>}
            {r.reported_username && <p><span className="text-muted-foreground">Reported user:</span> @{r.reported_username}</p>}
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
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => act("reviewing")} disabled={saving} className="gap-1">
              <MessageSquare className="h-3 w-3" /> Reviewing
            </Button>
            <Button size="sm" onClick={() => act("resolved")} disabled={saving} className="gap-1">
              <CheckCircle className="h-3 w-3" /> Resolve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => act("dismissed")} disabled={saving} className="gap-1">
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

    const reporterIds  = [...new Set(rawReports.map((r) => r.reporter_id).filter(Boolean))];
    const reportedIds  = [...new Set(rawReports.map((r) => r.reported_user_id).filter(Boolean))];
    const storyIds     = [...new Set(rawReports.map((r) => r.story_id).filter(Boolean))];
    const chapterIds   = [...new Set(rawReports.map((r) => r.chapter_id).filter(Boolean))];
    const episodeIds   = [...new Set(rawReports.map((r) => r.episode_id).filter(Boolean))];
    const commentIds   = [...new Set(rawReports.map((r) => (r as any).comment_id).filter(Boolean))];

    const allProfileIds = [...new Set([...reporterIds, ...reportedIds])];

    const [profilesRes, storiesRes, chaptersRes, episodesRes, commentsRes] = await Promise.all([
      allProfileIds.length
        ? supabase.from("profiles").select("id, username").in("id", allProfileIds)
        : Promise.resolve({ data: [] }),
      storyIds.length
        ? supabase.from("stories").select("id, title").in("id", storyIds)
        : Promise.resolve({ data: [] }),
      chapterIds.length
        ? supabase.from("chapters").select("id, title").in("id", chapterIds)
        : Promise.resolve({ data: [] }),
      episodeIds.length
        ? supabase.from("episodes").select("id, title").in("id", episodeIds)
        : Promise.resolve({ data: [] }),
      commentIds.length
        ? supabase.from("comments").select("id, content").in("id", commentIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap: Record<string, string> = {};
    (profilesRes.data ?? []).forEach((p: any) => { profileMap[p.id] = p.username; });

    const storyMap: Record<string, string> = {};
    (storiesRes.data ?? []).forEach((s: any) => { storyMap[s.id] = s.title; });

    const chapterMap: Record<string, string> = {};
    (chaptersRes.data ?? []).forEach((c: any) => { chapterMap[c.id] = c.title; });

    const episodeMap: Record<string, string> = {};
    (episodesRes.data ?? []).forEach((e: any) => { episodeMap[e.id] = e.title; });

    const commentMap: Record<string, string> = {};
    (commentsRes.data ?? []).forEach((c: any) => { commentMap[c.id] = stripHtml(c.content); });

    const enriched: ReportRow[] = rawReports.map((r: any) => ({
      ...r,
      comment_id: r.comment_id ?? null,
      reporter_profile:   { username: profileMap[r.reporter_id] ?? null },
      story_title:        r.story_id   ? (storyMap[r.story_id]     ?? null) : null,
      chapter_title:      r.chapter_id ? (chapterMap[r.chapter_id] ?? null) : null,
      episode_title:      r.episode_id ? (episodeMap[r.episode_id] ?? null) : null,
      comment_excerpt:    r.comment_id ? (commentMap[r.comment_id] ?? null) : null,
      reported_username:  r.reported_user_id ? (profileMap[r.reported_user_id] ?? null) : null,
    }));

    setReports(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: "resolved" | "dismissed" | "reviewing", admin_notes?: string) => {
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
    stories:  reports.filter((r) => r.story_id && !r.chapter_id && !r.episode_id && !r.comment_id),
    chapters: reports.filter((r) => !!r.chapter_id),
    episodes: reports.filter((r) => !!r.episode_id),
    comments: reports.filter((r) => !!(r as any).comment_id),
    users:    reports.filter((r) => !!r.reported_user_id && !r.story_id && !r.chapter_id && !r.episode_id && !(r as any).comment_id),
  };

  const tabs: { key: keyof typeof byCategory; label: string; icon: React.ElementType }[] = [
    { key: "all",      label: "All",      icon: Flag        },
    { key: "stories",  label: "Stories",  icon: BookOpen    },
    { key: "chapters", label: "Chapters", icon: Image       },
    { key: "episodes", label: "Episodes", icon: Tv          },
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "users",    label: "Users",    icon: User        },
  ];

  const pendingCount = reports.filter((r) => r.status === "pending").length;

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
                  <ReportCard key={r.id} report={r} onUpdate={updateStatus} />
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

