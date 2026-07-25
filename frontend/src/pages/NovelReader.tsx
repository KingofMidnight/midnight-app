import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Settings, ArrowLeft, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GoogleAd from "@/components/GoogleAd";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { sanitizeChapterContent } from "@/utils/sanitize";
import { saveReadingProgress } from "@/services/progressService";
import ContentComments from "@/components/ContentComments";

const fonts = [
  { label: "Overpass", value: "'Overpass', sans-serif" },
  { label: "Georgia",  value: "Georgia, serif" },
  { label: "System",   value: "system-ui, sans-serif" },
  { label: "Monospace",value: "'Source Code Pro', monospace" },
];

interface ChapterRow {
  id: string;
  chapter_number: number;
  title: string;
  review_status: string;
}

interface ChapterFull extends ChapterRow {
  content: string | null;
  image_urls: string[] | null;
  story_id: string;
  created_at: string;
  updated_at: string;
}

const NovelReader = () => {
  const { storyId, chapterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState<{ id: string; title: string } | null>(null);
  const [chapter, setChapter] = useState<ChapterFull | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState(fonts[0].value);
  const [maxWidth, setMaxWidth] = useState(720);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storyId || !chapterId) return;
    const load = async () => {
      const [storyRes, chapRes, allChaps] = await Promise.all([
        supabase.from("stories").select("id, title").eq("id", storyId).single(),
        supabase.from("chapters").select("*").eq("id", chapterId).single(),
        supabase.from("chapters").select("id, chapter_number, title, review_status").eq("story_id", storyId).order("chapter_number"),
      ]);
      if (storyRes.data) setStory(storyRes.data);
      if (chapRes.data) setChapter(chapRes.data as ChapterFull);
      if (allChaps.data) setChapters(allChaps.data.filter((c) => c.review_status === "approved") as ChapterRow[]);
      setLoading(false);
    };
    load();
  }, [storyId, chapterId]);

  useEffect(() => {
    if (!user || !storyId || !chapterId || chapters.length === 0) return;
    const isLastChapter = chapters[chapters.length - 1]?.id === chapterId;
    saveReadingProgress({ userId: user.id, storyId, chapterId, isLastEntry: isLastChapter });
  }, [chapterId, user, storyId, chapters]);

  const currentIdx = chapters.findIndex((c) => c.id === chapterId);
  const prevChap = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextChap = currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

  const goTo = useCallback((ch: ChapterRow) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(`/read/novel/${storyId}/${ch.id}`);
  }, [navigate, storyId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 bg-card border-border p-4 space-y-4">
                <DropdownMenuLabel className="text-foreground">Reader Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Font Size</span>
                    <span className="text-sm text-foreground">{fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setFontSize(Math.max(12, fontSize - 1))}><Minus className="h-3 w-3" /></Button>
                    <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} min={12} max={28} step={1} className="flex-1" />
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setFontSize(Math.min(28, fontSize + 1))}><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Line Spacing</span>
                    <span className="text-sm text-foreground">{lineHeight.toFixed(1)}</span>
                  </div>
                  <Slider value={[lineHeight]} onValueChange={([v]) => setLineHeight(v)} min={1.2} max={2.5} step={0.1} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Width</span>
                    <span className="text-sm text-foreground">{maxWidth}px</span>
                  </div>
                  <Slider value={[maxWidth]} onValueChange={([v]) => setMaxWidth(v)} min={480} max={960} step={20} />
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Font</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {fonts.map((f) => (
                      <Button key={f.label} size="sm" variant={fontFamily === f.value ? "default" : "secondary"} onClick={() => setFontFamily(f.value)} className="text-xs">{f.label}</Button>
                    ))}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Main Content */}
      <article
        className="container py-8 mx-auto animate-fade-in prose-invert"
        style={{ maxWidth: `${maxWidth}px`, fontSize: `${fontSize}px`, lineHeight, fontFamily }}
        dangerouslySetInnerHTML={{ __html: sanitizeChapterContent(chapter?.content || "<p>No content.</p>") }}
      />

      {/* Mobile Ad - Bottom */}
      <div className="md:hidden px-4 py-4">
        <GoogleAd slot={import.meta.env.VITE_ADSENSE_NOVEL_MOBILE_BOTTOM} format="horizontal" className="w-full" style={{ minHeight: "90px" }} />
      </div>

      {chapter && (
        <div className="container mx-auto py-6" style={{ maxWidth: `${maxWidth}px` }}>
          <ContentComments storyId={chapter.story_id} chapterId={chapter.id} currentUserId={user?.id} title="Chapter Comments" />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="container py-3 flex justify-between gap-3">
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
        </div>
      </div>
    </div>
  );
};

export default NovelReader;

