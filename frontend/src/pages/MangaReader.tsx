import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GoogleAd from "@/components/GoogleAd";
import { saveReadingProgress } from "@/services/progressService";
import ContentComments from "@/components/ContentComments";
import ChapterChoices from "@/components/ChapterChoices";
import type { Story, Chapter } from "@/types/domain";

type ChapterRow = Pick<Chapter, "id" | "chapter_number" | "title" | "review_status">;
type StoryRow = Pick<Story, "id" | "title" | "is_cyoa">;

const MangaReader = () => {
  const { storyId, chapterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState<StoryRow | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storyId || !chapterId) return;
    const load = async () => {
      const [storyRes, chapRes, allChaps] = await Promise.all([
        supabase.from("stories").select("id, title, is_cyoa").eq("id", storyId).single(),
        supabase.from("chapters").select("*").eq("id", chapterId).single(),
        supabase.from("chapters").select("id, chapter_number, title, review_status").eq("story_id", storyId).order("chapter_number"),
      ]);
      if (storyRes.data) setStory(storyRes.data);
      if (chapRes.data) setChapter(chapRes.data);
      if (allChaps.data) setChapters(allChaps.data.filter((c) => c.review_status === "approved"));
      setLoading(false);
    };
    load();
  }, [storyId, chapterId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [chapterId]);

  useEffect(() => {
    if (!user || !storyId || !chapterId || chapters.length === 0) return;
    const isLastChapter = chapters[chapters.length - 1]?.id === chapterId;
    saveReadingProgress({ userId: user.id, storyId, chapterId, isLastEntry: isLastChapter });
  }, [chapterId, user, storyId, chapters]);

  const currentIdx = chapters.findIndex((c) => c.id === chapterId);
  const prevChap = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextChap = currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

  const goTo = (ch: ChapterRow) => navigate(`/read/manga/${storyId}/${ch.id}`);
  const goToChapterId = (chapterIdToGo: string) => navigate(`/read/manga/${storyId}/${chapterIdToGo}`);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-12">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link to={`/story/${storyId}`}><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{story?.title}</p>
              {chapter && <p className="text-xs text-muted-foreground">Ch. {chapter.chapter_number}: {chapter.title}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={!prevChap} onClick={() => prevChap && goTo(prevChap)} className="gap-1 text-muted-foreground">
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="ghost" size="sm" disabled={!nextChap} onClick={() => nextChap && goTo(nextChap)} className="gap-1 text-muted-foreground">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-1">
        {(chapter?.image_urls ?? []).map((img, i) => (
          <div key={i} className="relative group">
            <img src={img} alt={`Page ${i + 1}`} className="w-full h-auto" loading="lazy" />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs bg-background/80 backdrop-blur-sm text-muted-foreground px-2 py-1 rounded">
                {i + 1} / {chapter?.image_urls?.length}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="md:hidden px-4 py-4">
        <GoogleAd slot={import.meta.env.VITE_ADSENSE_MANGA_MOBILE_BOTTOM} format="horizontal" className="w-full" style={{ minHeight: "90px" }} />
      </div>

      {story?.is_cyoa && chapter && (
        <div className="max-w-3xl mx-auto px-4 py-6">
          <ChapterChoices chapterId={chapter.id} onChoose={goToChapterId} />
        </div>
      )}

      <div className="border-t border-border">
        <div className="container py-4 flex justify-between gap-3">
          {story?.is_cyoa ? (
            <Button
              variant="outline"
              onClick={() => navigate(`/story/${storyId}`)}
              className="gap-2 flex-1"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Story
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={!prevChap}
                onClick={() => prevChap && goTo(prevChap)}
                className="gap-2 flex-1 sm:flex-none"
              >
                <ChevronLeft className="h-4 w-4" />
                {prevChap ? `Ch. ${prevChap.chapter_number}: ${prevChap.title}` : "Previous"}
              </Button>
              <Button
                variant={!nextChap ? "outline" : "default"}
                onClick={() => nextChap ? goTo(nextChap) : navigate(`/story/${storyId}`)}
                className="gap-2 flex-1 sm:flex-none"
              >
                {nextChap ? `Ch. ${nextChap.chapter_number}: ${nextChap.title}` : "Back to Story"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {chapter && (
        <div className="max-w-3xl mx-auto px-4 py-6">
          <ContentComments storyId={chapter.story_id} chapterId={chapter.id} currentUserId={user?.id} title="Chapter Comments" />
        </div>
      )}
    </div>
  );
};

export default MangaReader;
