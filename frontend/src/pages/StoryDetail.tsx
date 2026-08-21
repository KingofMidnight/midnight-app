import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Download, Trash2, Heart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Star, BookOpen, Image, Tv, ArrowLeft, Play,
  CheckCircle,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ContentComments from "@/components/ContentComments";
import StoryRelationships from "@/components/StoryRelationships";
import ReportDialog from "@/components/ReportDialog";
import { api } from "@/lib/api";
import type {
  Story, Chapter, Episode,
  ListType, StoryType,
} from "@/types/domain";

type ChapterRow = Pick<Chapter, "id" | "title" | "chapter_number" | "review_status">;
type EpisodeRow = Pick<Episode, "id" | "title" | "episode_number" | "review_status">;

const typeIcons: Record<StoryType, typeof BookOpen> = {
  novel: BookOpen,
  manga: Image,
  anime: Tv,
};

const StoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [myList, setMyList] = useState<ListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [viewCount, setViewCount] = useState<number>(0);
  const [userProgress, setUserProgress] = useState<{
    last_chapter_id: string | null;
    last_episode_id: string | null;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [storyRes, chapRes, epRes, ratingRes] = await Promise.all([
        supabase.from("stories").select("*").eq("id", id).single(),
        supabase.from("chapters").select("id, title, chapter_number, review_status").eq("story_id", id).order("chapter_number"),
        supabase.from("episodes").select("id, title, episode_number, review_status").eq("story_id", id).order("episode_number"),
        supabase.from("ratings").select("rating").eq("story_id", id),
      ]);

      if (storyRes.data) {
        setStory(storyRes.data);
        setViewCount(storyRes.data.view_count ?? 0);
      }
      setChapters((chapRes.data ?? []).filter((c) => c.review_status === "approved") as ChapterRow[]);
      setEpisodes((epRes.data ?? []).filter((e) => e.review_status === "approved") as EpisodeRow[]);

      if (ratingRes.data?.length) {
        const avg = ratingRes.data.reduce((a, r) => a + r.rating, 0) / ratingRes.data.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }

      if (user) {
        const [myRatingRes, myListRes, progressRes, favRes] = await Promise.all([
          supabase.from("ratings").select("rating").eq("story_id", id).eq("user_id", user.id).maybeSingle(),
          supabase.from("user_lists").select("list").eq("story_id", id).eq("user_id", user.id).maybeSingle(),
          supabase.from("user_progress").select("last_chapter_id, last_episode_id").eq("story_id", id).eq("user_id", user.id).maybeSingle(),
          supabase.from("user_favorites").select("id").eq("story_id", id).eq("user_id", user.id).maybeSingle(),
        ]);
        if (myRatingRes.data) setMyRating(myRatingRes.data.rating);
        if (myListRes.data) setMyList(myListRes.data.list);
        if (progressRes.data) setUserProgress(progressRes.data);
        if (favRes.data) setIsFavorited(true);
      }

      setLoading(false);
    };

    load();
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    api.views.record(id).then((count) => setViewCount(count)).catch(() => {});
  }, [id]);

  const handleRate = async (rating: number) => {
    if (!user || !id) return;
    setMyRating(rating);
    await supabase.from("ratings").upsert(
      { user_id: user.id, story_id: id, rating },
      { onConflict: "user_id,story_id" }
    );
  };

  const handleListChange = async (val: string) => {
    if (!user || !id) return;
    if (val === "none") {
      await supabase.from("user_lists").delete().eq("user_id", user.id).eq("story_id", id);
      setMyList(null);
    } else {
      await supabase.from("user_lists").upsert(
        { user_id: user.id, story_id: id, list: val as ListType },
        { onConflict: "user_id,story_id" }
      );
      setMyList(val as ListType);
    }
  };

  const handleExportEpub = async () => {
    if (!story) return;
    setExporting(true);
    try {
      await api.export.epub(story.id, story.title);
    } catch (err) {
      toast({ title: "Export failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to add favorites" });
      return;
    }
    if (!id || !story) return;
    try {
      if (isFavorited) {
        await supabase.from("user_favorites").delete().eq("user_id", user.id).eq("story_id", id);
        setIsFavorited(false);
        toast({ title: "Removed from favorites" });
      } else {
        await supabase.from("user_favorites").insert({ user_id: user.id, story_id: id });
        setIsFavorited(true);
        toast({ title: "Added to favorites" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  if (loading) return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card">
        <div className="container py-8">
          <div className="h-4 w-32 bg-secondary rounded animate-pulse mb-6" />
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-48 h-64 bg-secondary rounded-lg animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="h-8 w-64 bg-secondary rounded animate-pulse" />
              <div className="h-4 w-40 bg-secondary rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!story) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Story not found.</p>
    </div>
  );

  const Icon = typeIcons[story.type] ?? BookOpen;
  const isAnime = story.type === "anime";
  const isNovel = story.type === "novel";

  const getViewedChapterIds = (): Set<string> => {
    if (!userProgress?.last_chapter_id) return new Set();
    const last = chapters.find((c) => c.id === userProgress.last_chapter_id);
    if (!last) return new Set();
    return new Set(chapters.filter((c) => c.chapter_number <= last.chapter_number).map((c) => c.id));
  };

  const getViewedEpisodeIds = (): Set<string> => {
    if (!userProgress?.last_episode_id) return new Set();
    const last = episodes.find((e) => e.id === userProgress.last_episode_id);
    if (!last) return new Set();
    return new Set(episodes.filter((e) => e.episode_number <= last.episode_number).map((e) => e.id));
  };

  const viewedChapterIds = getViewedChapterIds();
  const viewedEpisodeIds = getViewedEpisodeIds();

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card">
        <div className="container py-8">
          <Link to="/browse" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to browse
          </Link>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-48 h-64 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              {story.cover_image_url ? (
                <img src={story.cover_image_url} alt={story.title} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Icon className="h-16 w-16 text-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="capitalize"><Icon className="h-3 w-3 mr-1" />{story.type}</Badge>
                <Badge variant="outline" className="capitalize">{story.status}</Badge>
                <Badge variant="outline" className="capitalize">{story.content_origin}</Badge>
              </div>
              <h1 className="text-3xl font-bold">{story.title}</h1>
              {story.created_by ? (
                <p className="text-muted-foreground">
                  by{" "}
                  <Link to={`/profile/${story.created_by}`} className="hover:text-primary transition-colors underline underline-offset-2">
                    {story.author_name || "Unknown author"}
                  </Link>
                </p>
              ) : (
                story.author_name && <p className="text-muted-foreground">by {story.author_name}</p>
              )}
              {story.description && (
                <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">{story.description}</p>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                {avgRating !== null && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <span className="text-sm font-medium">{avgRating}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">{viewCount.toLocaleString()} views</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {isAnime ? `${episodes.length} episodes` : `${chapters.length} chapters`}
                </span>
                {isNovel && chapters.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={exporting} onClick={handleExportEpub}>
                    <Download className="h-3.5 w-3.5" />
                    {exporting ? "Generatingâ€¦" : "Download EPUB"}
                  </Button>
                )}
              </div>
              {(story.genres ?? []).length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {story.genres!.map((g) => <Badge key={g} variant="outline" className="text-xs">{g}</Badge>)}
                </div>
              )}
              {user && (
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => handleRate(n)}>
                        <Star className={`h-5 w-5 transition-colors ${n <= myRating ? "text-warning fill-warning" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <Select value={myList ?? "none"} onValueChange={handleListChange}>
                    <SelectTrigger className="w-40 bg-card border-border">
                      <SelectValue placeholder="Add to list" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not listed</SelectItem>
                      <SelectItem value="reading">Reading</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="plan_to_read">Plan to Read</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={toggleFavorite} title={isFavorited ? "Remove from favorites" : "Add to favorites"}>
                    <Heart className={`h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                    {isFavorited ? "Favorited" : "Favorite"}
                  </Button>
                  <ReportDialog storyId={id} reportedUserId={story.created_by ?? undefined} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {isAnime ? (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" /> Episodes
            </h2>
            {episodes.length === 0 ? (
              <p className="text-muted-foreground">No episodes available yet.</p>
            ) : (
              <div className="grid gap-2">
                {episodes.map((ep) => {
                  const isViewed = viewedEpisodeIds.has(ep.id);
                  return (
                    <div
                      key={ep.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors group ${
                        isViewed
                          ? "bg-primary/10 border-primary/30 hover:border-primary/50"
                          : "bg-card border-border hover:border-primary/40"
                      }`}
                    >
                      <Link
                        to={`/watch/${story.id}/${ep.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        {isViewed
                          ? <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          : <Play className="h-4 w-4 text-primary flex-shrink-0" />}
                        <span className="text-sm font-medium whitespace-nowrap">Episode {ep.episode_number}</span>
                        <span className={`text-sm truncate ${isViewed ? "text-primary/70" : "text-muted-foreground"}`}>
                          {ep.title}
                        </span>
                        {isViewed && <span className="ml-auto text-xs text-primary/60 whitespace-nowrap pr-2">Watched</span>}
                      </Link>
                      {user && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <ReportDialog episodeId={ep.id} storyId={id} iconOnly />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Chapters
            </h2>
            {chapters.length === 0 ? (
              <p className="text-muted-foreground">No chapters available yet.</p>
            ) : (
              <div className="grid gap-2">
                {chapters.map((ch) => {
                  const isViewed = viewedChapterIds.has(ch.id);
                  return (
                    <div
                      key={ch.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors group ${
                        isViewed
                          ? "bg-primary/10 border-primary/30 hover:border-primary/50"
                          : "bg-card border-border hover:border-primary/40"
                      }`}
                    >
                      <Link
                        to={story.type === "novel"
                          ? `/read/novel/${story.id}/${ch.id}`
                          : `/read/manga/${story.id}/${ch.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        {isViewed
                          ? <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          : <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />}
                        <span className="text-sm font-medium whitespace-nowrap">Chapter {ch.chapter_number}</span>
                        <span className={`text-sm truncate ${isViewed ? "text-primary/70" : "text-muted-foreground"}`}>
                          {ch.title}
                        </span>
                        {isViewed && <span className="ml-auto text-xs text-primary/60 whitespace-nowrap pr-2">Read</span>}
                      </Link>
                      {user && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <ReportDialog chapterId={ch.id} storyId={id} iconOnly />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {story && <StoryRelationships storyId={story.id} />}

        {id && <ContentComments storyId={id} currentUserId={user?.id} />}
      </div>
    </div>
  );
};

export default StoryDetail;

