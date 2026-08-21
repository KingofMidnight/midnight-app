import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Tv, List } from "lucide-react";
import { saveReadingProgress } from "@/services/progressService";
import ContentComments from "@/components/ContentComments";

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  embed_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
}

const AnimePlayer = () => {
  const { storyId, episodeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState<{ id: string; title: string } | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [current, setCurrent] = useState<Episode | null>(null);
  const [showList, setShowList] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!storyId) return;
      const [storyRes, epsRes] = await Promise.all([
        supabase.from("stories").select("id, title").eq("id", storyId).single(),
        supabase.from("episodes").select("*").eq("story_id", storyId).eq("review_status", "approved").order("episode_number"),
      ]);
      if (storyRes.data) setStory(storyRes.data);
      if (epsRes.data) {
        setEpisodes(epsRes.data);
        const ep = episodeId ? epsRes.data.find((e) => e.id === episodeId) : epsRes.data[0];
        setCurrent(ep || epsRes.data[0] || null);
      }
      setLoading(false);
    };
    load();
  }, [storyId, episodeId]);

  useEffect(() => {
    if (!user || !current || !storyId || episodes.length === 0) return;
    const isLastEpisode = episodes[episodes.length - 1]?.id === current.id;
    saveReadingProgress({ userId: user.id, storyId, episodeId: current.id, isLastEntry: isLastEpisode });
  }, [current, user, storyId, episodes]);

  const currentIdx = episodes.findIndex((e) => e.id === current?.id);
  const prevEp = currentIdx > 0 ? episodes[currentIdx - 1] : null;
  const nextEp = currentIdx < episodes.length - 1 ? episodes[currentIdx + 1] : null;

  const goTo = useCallback((ep: Episode) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrent(ep);
    navigate(`/watch/${storyId}/${ep.id}`, { replace: true });
  }, [navigate, storyId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );

  if (!story || !current) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <p className="text-muted-foreground">No episodes found.</p>
      <Button asChild variant="outline"><Link to="/browse">Browse</Link></Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-12">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link to={`/story/${storyId}`}><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{story.title}</p>
              <p className="text-xs text-muted-foreground">Episode {current.episode_number}: {current.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={!prevEp} onClick={() => prevEp && goTo(prevEp)} className="gap-1 text-muted-foreground">
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="ghost" size="sm" disabled={!nextEp} onClick={() => nextEp && goTo(nextEp)} className="gap-1 text-muted-foreground">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowList(!showList)}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="flex-1">
          <div className="max-w-5xl mx-auto py-4 px-4">
            {current.embed_url ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={current.embed_url}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
                  referrerPolicy="strict-origin-when-cross-origin"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="aspect-video bg-card rounded-lg flex items-center justify-center border border-border">
                <div className="text-center text-muted-foreground">
                  <Tv className="h-16 w-16 mx-auto mb-3 opacity-30" />
                  <p>No video source available for this episode.</p>
                </div>
              </div>
            )}
            <div className="mt-4 space-y-1">
              <h2 className="text-xl font-bold">Episode {current.episode_number}: {current.title}</h2>
              {current.duration_minutes && (
                <p className="text-sm text-muted-foreground">{current.duration_minutes} min</p>
              )}
            </div>

            <div className="mt-8">
              <ContentComments storyId={story.id} episodeId={current.id} currentUserId={user?.id} title="Episode Comments" />
            </div>
          </div>
        </div>

        {showList && (
          <div className="w-72 border-l border-border bg-card overflow-y-auto max-h-[calc(100vh-48px)] sticky top-12">
            <div className="p-3 border-b border-border">
              <h3 className="font-semibold text-sm">Episodes ({episodes.length})</h3>
            </div>
            <div className="divide-y divide-border">
              {episodes.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => goTo(ep)}
                  className={`w-full text-left p-3 hover:bg-secondary/50 transition-colors ${
                    ep.id === current.id ? "bg-primary/10 border-l-2 border-primary" : ""
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">Ep. {ep.episode_number}</p>
                  <p className="text-xs text-muted-foreground truncate">{ep.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="container py-3 flex justify-between gap-3">
          <Button
            variant="outline"
            disabled={!prevEp}
            onClick={() => prevEp && goTo(prevEp)}
            className="gap-2 flex-1 sm:flex-none"
          >
            <ChevronLeft className="h-4 w-4" />
            {prevEp ? `Ep. ${prevEp.episode_number}: ${prevEp.title}` : "Previous"}
          </Button>
          <Button
            variant={!nextEp ? "outline" : "default"}
            onClick={() => nextEp ? goTo(nextEp) : navigate(`/story/${storyId}`)}
            className="gap-2 flex-1 sm:flex-none"
          >
            {nextEp ? `Ep. ${nextEp.episode_number}: ${nextEp.title}` : "Back to Story"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnimePlayer;

