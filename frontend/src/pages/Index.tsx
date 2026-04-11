import { Link } from "react-router-dom";
import { BookOpen, Image, Tv, ArrowRight, TrendingUp, Clock } from "lucide-react";
import indexLogo from "@/assets/logo.png";
import heroBg from "@/assets/hero-bg.png";
import { Button } from "@/components/ui/button";
import ContentCard from "@/components/ContentCard";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { siteContent } from "@/lib/content";
import { useAuth } from "@/hooks/useAuth";

const contentSections = [
  { key: "novel", label: siteContent.categories.novels, icon: BookOpen, filter: "novel" },
  { key: "manga", label: siteContent.categories.manga, icon: Image, filter: "manga" },
  { key: "anime", label: siteContent.categories.anime, icon: Tv, filter: "anime" },
];

const Index = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionStories, setSectionStories] = useState<any[]>([]);
  const [continueReading, setContinueReading] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("stories").select("*").eq("review_status", "approved").order("created_at", { ascending: false }).limit(12);
      if (data) setStories(data);
    };
    load();
  }, []);

  useEffect(() => {
    if (!user) {
      setContinueReading([]);
      return;
    }
    const loadProgress = async () => {
      const { data: progress } = await supabase
        .from("user_progress")
        .select("*, stories(*)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(6);
      if (progress) {
        setContinueReading(progress.filter((p: any) => p.stories));
      }
    };
    loadProgress();
  }, [user]);

  useEffect(() => {
    if (!activeSection) {
      setSectionStories([]);
      return;
    }
    const load = async () => {
      const typeMap: Record<string, string[]> = {
        novel: ["novel"],
        manga: ["manga", "comic"],
        anime: ["anime", "cartoon"],
      };
      const types = typeMap[activeSection] || [activeSection];
      const { data } = await supabase
        .from("stories")
        .select("*")
        .eq("review_status", "approved")
        .in("type", types as any)
        .order("created_at", { ascending: false })
        .limit(12);
      setSectionStories(data || []);
    };
    load();
  }, [activeSection]);

  const t = siteContent;

  const getResumeLink = (progress: any) => {
    const story = progress.stories;
    const isAnime = ["anime", "cartoon", "audiobook"].includes(story.type);
    if (isAnime && progress.last_episode_id) {
      return `/watch/${story.id}/${progress.last_episode_id}`;
    }
    if (!isAnime && progress.last_chapter_id) {
      return story.type === "novel"
        ? `/read/novel/${story.id}/${progress.last_chapter_id}`
        : `/read/manga/${story.id}/${progress.last_chapter_id}`;
    }
    return `/story/${story.id}`;
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border min-h-[420px] flex items-center">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/75 backdrop-blur-sm" />
        </div>
        <div className="container relative py-16 md:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
              {t.hero.heading} <span className="text-gradient">{t.hero.headingHighlight}</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {t.hero.description}
            </p>
            <div className="flex gap-3 justify-center">
              <Button size="lg" asChild><Link to="/browse">{t.hero.ctaPrimary} <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/auth">{t.hero.ctaSecondary}</Link></Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Continue Reading */}
      {continueReading.length > 0 && (
        <section className="container py-10 border-b border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Continue your journey</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {continueReading.map((progress: any) => (
              <Link
                key={progress.id}
                to={getResumeLink(progress)}
                className="group rounded-lg overflow-hidden bg-card border border-border hover:border-primary/40 transition-all hover:shadow-md"
              >
                <div className="aspect-[3/4] bg-secondary relative">
                  {progress.stories.cover_image_url ? (
                    <img src={progress.stories.cover_image_url} alt={progress.stories.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-xs font-medium text-primary">Continue</span>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium truncate">{progress.stories.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{progress.stories.type}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Content Section Buttons */}
      <section className="border-b border-border">
        <div className="container py-6">
          <div className="flex gap-3 justify-center flex-wrap">
            {contentSections.map((sec) => (
              <Button
                key={sec.key}
                size="lg"
                variant={activeSection === sec.key ? "default" : "secondary"}
                onClick={() => setActiveSection(activeSection === sec.key ? null : sec.key)}
                className="gap-2 min-w-[140px]"
              >
                <sec.icon className="h-5 w-5" />
                {sec.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Section-specific stories */}
      {activeSection && sectionStories.length > 0 && (
        <section className="container py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{contentSections.find(s => s.key === activeSection)?.label}</h2>
            <Link to={`/browse?type=${activeSection}`} className="text-sm text-primary hover:underline flex items-center gap-1">
              {t.latest.viewAll} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {sectionStories.slice(0, 6).map((story) => <ContentCard key={story.id} story={story} />)}
          </div>
        </section>
      )}

      {/* Recent Stories */}
      {!activeSection && stories.length > 0 && (
        <section className="container py-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">{t.latest.title}</h2></div>
            <Link to="/browse" className="text-sm text-primary hover:underline flex items-center gap-1">{t.latest.viewAll} <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stories.slice(0, 6).map((story) => <ContentCard key={story.id} story={story} />)}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-border">
        <div className="container py-16">
          <div className="max-w-lg mx-auto text-center space-y-4">
            <img src={indexLogo} alt={t.logoAlt} className="h-12 w-12 mx-auto" />
            <h2 className="text-2xl font-bold">{t.cta.title}</h2>
            <p className="text-muted-foreground">{t.cta.description}</p>
            <Button size="lg" asChild><Link to="/auth">{t.cta.button}</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;

