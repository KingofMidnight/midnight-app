import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, X, Eye, User, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { api as backendApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { StoryWithProfile, ChapterWithStory, EpisodeWithStory } from "@/types/domain";

type ReviewTarget =
  | { kind: "story";   id: string; title: string; createdBy: string | null; profileUsername: string | null }
  | { kind: "chapter"; id: string; title: string; createdBy: string | null; storyTitle: string | null }
  | { kind: "episode"; id: string; title: string; createdBy: string | null; storyTitle: string | null };

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

const AdminContentReview = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryWithProfile[]>([]);
  const [chapters, setChapters] = useState<ChapterWithStory[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeWithStory[]>([]);
  const [loading, setLoading] = useState(true);

  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected" | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewReasonError, setReviewReasonError] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const [reviewerInfo, setReviewerInfo] = useState<{ username: string | null; display_name: string | null; avatar_url: string | null } | null>(null);
  const [authorSearch, setAuthorSearch] = useState("");
  const [authorResults, setAuthorResults] = useState<ProfileRow[]>([]);
  const [editingAuthorFor, setEditingAuthorFor] = useState<string | null>(null);
  const [authorSearchLoading, setAuthorSearchLoading] = useState(false);

  const load = useCallback(async () => {
    try {

      const { data: storiesData, error: storiesError } = await supabase
        .from("stories")
        .select("*")
        .eq("review_status", "pending")
        .order("created_at", { ascending: false });

      if (storiesError) {
        console.error("Stories error:", storiesError);
        return;
      }

      if (storiesData && storiesData.length > 0) {
        const creatorIds = storiesData.map(s => s.created_by).filter((v): v is string => !!v);
        if (creatorIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", creatorIds);

          if (profilesError) {
            console.error("Profiles error:", profilesError);
          } else {

            const storiesWithProfiles = storiesData.map(story => ({
              ...story,
              profiles: profilesData?.find(p => p.id === story.created_by) || null
            }));
            setStories(storiesWithProfiles as unknown as StoryWithProfile[]);
          }
        } else {
          setStories(storiesData as unknown as StoryWithProfile[]);
        }
      } else {
        setStories([]);
      }

      const [chaptersRes, episodesRes] = await Promise.all([
        supabase
          .from("chapters")
          .select("*, stories(title, type, created_by)")
          .eq("review_status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("episodes")
          .select("*, stories(title, type, created_by)")
          .eq("review_status", "pending")
          .order("created_at", { ascending: false }),
      ]);

      if (chaptersRes.data) {
        setChapters(chaptersRes.data as unknown as ChapterWithStory[]);
      }
      if (episodesRes.data) {
        setEpisodes(episodesRes.data as unknown as EpisodeWithStory[]);
      }
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReviewerInfo = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .single();
    if (data) {
      setReviewerInfo(data);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchReviewerInfo(); }, [fetchReviewerInfo]);

  const notify = async (userId: string, title: string, message: string, link?: string) => {
    await supabase.from("notifications").insert({
      user_id: userId, type: "review", title, message, link: link ?? null,
    });
  };

  const openReview = (target: ReviewTarget, status: "approved" | "rejected") => {
    setReviewTarget(target);
    setReviewStatus(status);
    setReviewReason("");
    setReviewReasonError(false);
  };

  const confirmReview = async () => {
    if (!reviewTarget || !reviewStatus) return;

    const reason = reviewReason.trim();
    if (!reason) {
      setReviewReasonError(true);
      return;
    }

    setReviewing(true);
    const messageBase = `${reviewStatus === "approved" ? "Approved" : "Rejected"}: ${reason}`;

    try {
      if (reviewTarget.kind === "story") {
        await backendApi.admin.reviewStory(reviewTarget.id, reviewStatus);
        if (reviewTarget.createdBy) {
          await notify(
            reviewTarget.createdBy,
            `Story ${reviewStatus}`,
            `Your story "${reviewTarget.title}" was ${messageBase}`,
            `/story/${reviewTarget.id}`
          );
        }
      } else if (reviewTarget.kind === "chapter") {
        await backendApi.admin.reviewChapter(reviewTarget.id, reviewStatus);
        if (reviewTarget.createdBy) {
          await notify(
            reviewTarget.createdBy,
            `Chapter ${reviewStatus}`,
            `Chapter "${reviewTarget.title}" was ${messageBase}`
          );
        }
      } else {
        await backendApi.admin.reviewEpisode(reviewTarget.id, reviewStatus);
        if (reviewTarget.createdBy) {
          await notify(
            reviewTarget.createdBy,
            `Episode ${reviewStatus}`,
            `Episode "${reviewTarget.title}" was ${messageBase}`
          );
        }
      }

      toast({ title: `${reviewTarget.kind} ${reviewStatus}` });
      setReviewTarget(null);
      setReviewStatus(null);
      setReviewReason("");
      setReviewReasonError(false);
      load();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setReviewing(false);
    }
  };

  const searchAuthors = async (q: string) => {
    if (!q.trim()) { setAuthorResults([]); return; }
    setAuthorSearchLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(8);
    setAuthorResults((data ?? []) as ProfileRow[]);
    setAuthorSearchLoading(false);
  };

  const assignAuthor = async (storyId: string, profile: ProfileRow) => {
    const { error } = await supabase
      .from("stories")
      .update({ created_by: profile.id, author_name: profile.display_name ?? profile.username })
      .eq("id", storyId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Author updated", description: `Assigned to ${profile.display_name ?? profile.username}` });
    setEditingAuthorFor(null);
    setAuthorSearch("");
    setAuthorResults([]);
    load();
  };

  const totalPending = stories.length + chapters.length + episodes.length;

  return (
    <>
      <Dialog open={!!reviewTarget} onOpenChange={(open) => { if (!open) { setReviewTarget(null); setReviewStatus(null); setReviewReason(""); setReviewReasonError(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewStatus === "approved"
                ? <CheckCircle className="h-5 w-5 text-success" />
                : <X className="h-5 w-5 text-destructive" />}
              {reviewStatus === "approved" ? "Approve" : "Reject"} {reviewTarget?.kind}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="p-3 rounded-lg bg-secondary/50 text-sm space-y-2">
              <div>
                <p className="font-medium">{reviewTarget?.title}</p>
                {reviewTarget?.kind === "story" && reviewTarget.profileUsername && (
                  <p className="text-xs text-muted-foreground mt-0.5">by @{reviewTarget.profileUsername}</p>
                )}
                {(reviewTarget?.kind === "chapter" || reviewTarget?.kind === "episode") && reviewTarget.storyTitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">from "{reviewTarget.storyTitle}"</p>
                )}
              </div>
              <div className="border-t border-border pt-2 flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Reviewing as: <span className="font-medium text-foreground">{reviewerInfo?.display_name || reviewerInfo?.username || "Admin"}</span>
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                Reason <span className="text-xs text-destructive">*</span> <span className="text-xs">(required â€” included in notification)</span>
              </label>
              <Textarea
                placeholder={reviewStatus === "approved" ? "e.g. Great content, well formatted." : "e.g. Violates guidelines, please revise."}
                value={reviewReason}
                onChange={(e) => {
                  setReviewReason(e.target.value);
                  setReviewReasonError(false);
                }}
                className={`bg-background border-border resize-none text-sm ${reviewReasonError ? "border-destructive" : ""}`}
                rows={3}
                autoFocus
              />
              {reviewReasonError && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> Reason is required
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setReviewTarget(null); setReviewStatus(null); }} disabled={reviewing}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                variant={reviewStatus === "rejected" ? "destructive" : "default"}
                onClick={confirmReview}
                disabled={reviewing}
              >
                {reviewStatus === "approved"
                  ? <CheckCircle className="h-4 w-4" />
                  : <X className="h-4 w-4" />}
                Confirm {reviewStatus === "approved" ? "Approval" : "Rejection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : totalPending === 0 ? (
          <p className="text-muted-foreground">No content pending review.</p>
        ) : (
          <Tabs defaultValue="stories">
            <TabsList className="bg-secondary border border-border">
              <TabsTrigger value="stories" className="data-[state=active]:bg-card">
                Stories {stories.length > 0 && `(${stories.length})`}
              </TabsTrigger>
              <TabsTrigger value="chapters" className="data-[state=active]:bg-card">
                Chapters {chapters.length > 0 && `(${chapters.length})`}
              </TabsTrigger>
              <TabsTrigger value="episodes" className="data-[state=active]:bg-card">
                Episodes {episodes.length > 0 && `(${episodes.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stories" className="mt-4 space-y-2">
              {stories.length === 0 ? (
                <p className="text-muted-foreground">No stories pending.</p>
              ) : stories.map((s) => (
                <div key={s.id} className="p-4 rounded-lg bg-card border border-border space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="capitalize text-xs">{s.type}</Badge>
                        <span className="font-medium">{s.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        by {s.profiles?.username ?? "Unknown"} â€¢ {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link to={`/story/${s.id}`}>
                          <Eye className="h-3 w-3" /> View
                        </Link>
                      </Button>
                      <Button size="sm" onClick={() => openReview({ kind: "story", id: s.id, title: s.title, createdBy: s.created_by ?? null, profileUsername: s.profiles?.username ?? null }, "approved")} className="gap-1">
                        <CheckCircle className="h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openReview({ kind: "story", id: s.id, title: s.title, createdBy: s.created_by ?? null, profileUsername: s.profiles?.username ?? null }, "rejected")} className="gap-1">
                        <X className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Author: {s.author_name ? (
                        <span className="text-foreground font-mono text-xs">{s.author_name}</span>
                      ) : (
                        <span className="text-warning">Not assigned</span>
                      )}
                    </p>

                    {editingAuthorFor === s.id ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            placeholder="Search by username or display name..."
                            value={authorSearch}
                            onChange={(e) => { setAuthorSearch(e.target.value); searchAuthors(e.target.value); }}
                            className="h-8 text-sm bg-background border-border"
                            autoFocus
                          />
                          {authorSearchLoading && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">searching...</span>
                          )}
                        </div>
                        {authorResults.length > 0 && (
                          <div className="border border-border rounded-lg bg-background divide-y divide-border">
                            {authorResults.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => assignAuthor(s.id, p)}
                                className="w-full flex items-center gap-3 p-2.5 hover:bg-secondary/50 transition-colors text-left"
                              >
                                <Avatar className="h-7 w-7">
                                  {p.avatar_url ? <AvatarImage src={p.avatar_url} /> : null}
                                  <AvatarFallback><User className="h-3.5 w-3.5" /></AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{p.display_name ?? p.username ?? "â€”"}</p>
                                  {p.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
                                </div>
                                <p className="ml-auto text-xs text-muted-foreground font-mono truncate max-w-[120px]">{p.id}</p>
                              </button>
                            ))}
                          </div>
                        )}
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setEditingAuthorFor(null); setAuthorSearch(""); setAuthorResults([]); }}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5" onClick={() => setEditingAuthorFor(s.id)}>
                        <User className="h-3 w-3" /> {s.created_by ? "Change author" : "Assign author"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="chapters" className="mt-4 space-y-2">
              {chapters.length === 0 ? (
                <p className="text-muted-foreground">No chapters pending.</p>
              ) : chapters.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border flex-wrap gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="capitalize text-xs">{ch.stories?.type ?? "?"}</Badge>
                    <span className="text-xs text-muted-foreground">{ch.stories?.title}</span>
                    <span className="font-medium">Ch. {ch.chapter_number}: {ch.title}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link to={`/read/${ch.stories?.type === 'manga' ? 'manga' : 'novel'}/${ch.story_id}/${ch.id}`}>
                        <Eye className="h-3 w-3" /> View
                      </Link>
                    </Button>
                    <Button size="sm" onClick={() => openReview({ kind: "chapter", id: ch.id, title: ch.title, createdBy: ch.stories?.created_by ?? null, storyTitle: ch.stories?.title ?? null }, "approved")} className="gap-1">
                      <CheckCircle className="h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openReview({ kind: "chapter", id: ch.id, title: ch.title, createdBy: ch.stories?.created_by ?? null, storyTitle: ch.stories?.title ?? null }, "rejected")} className="gap-1">
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="episodes" className="mt-4 space-y-2">
              {episodes.length === 0 ? (
                <p className="text-muted-foreground">No episodes pending.</p>
              ) : episodes.map((ep) => (
                <div key={ep.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border flex-wrap gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="capitalize text-xs">{ep.stories?.type ?? "?"}</Badge>
                    <span className="text-xs text-muted-foreground">{ep.stories?.title}</span>
                    <span className="font-medium">Ep. {ep.episode_number}: {ep.title}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link to={`/watch/${ep.story_id}/${ep.id}`}>
                        <Eye className="h-3 w-3" /> View
                      </Link>
                    </Button>
                    <Button size="sm" onClick={() => openReview({ kind: "episode", id: ep.id, title: ep.title, createdBy: ep.stories?.created_by ?? null, storyTitle: ep.stories?.title ?? null }, "approved")} className="gap-1">
                      <CheckCircle className="h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openReview({ kind: "episode", id: ep.id, title: ep.title, createdBy: ep.stories?.created_by ?? null, storyTitle: ep.stories?.title ?? null }, "rejected")} className="gap-1">
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
};

export default AdminContentReview;

