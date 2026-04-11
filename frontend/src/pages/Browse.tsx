import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, BookOpen, Image, Tv, X, List, LayoutGrid, Rows3, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaginationControls from "@/components/PaginationControls";
import ContentCard from "@/components/ContentCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { siteContent } from "@/lib/content";
import type { Story } from "@/types/domain";

const PAGE_SIZE = 24;

const types = [
  { value: "all", label: siteContent.browse.typeAll, icon: Filter },
  { value: "novel", label: siteContent.categories.novels, icon: BookOpen },
  { value: "manga", label: siteContent.categories.manga, icon: Image },
  { value: "anime", label: siteContent.categories.anime, icon: Tv },
];

const statuses = ["ongoing", "completed", "hiatus"];

const allGenres = [
  "Action", "Adventure", "Comedy", "Cyberpunk", "Drama", "Fantasy",
  "Historical", "Horror", "Isekai", "Martial Arts", "Mecha", "Medical",
  "Mystery", "Psychological", "Reincarnation", "Romance", "School",
  "Sci-Fi", "Slice of Life", "Sports", "Super Power", "Supernatural",
  "Thriller", "Tragedy", "Contemporary",
];

const allTags = [
  "Anti-Hero", "Elderly Protagonist", "Ensemble Cast", "Female Protagonist", "Male Protagonist",
  "Primarily Adult Cast", "Primarily Animal Cast", "Primarily Child Cast", "Primarily Female Cast", "Primarily Male Cast",
  "Primarily Teen Cast", "Time Travel", "Virtual Reality", "Adventure", "Action", "Romance",
];

const orderOptions = [
  { value: "latest", label: "Latest update" },
  { value: "oldest", label: "Oldest" },
  { value: "title_asc", label: "Title A-Z" },
  { value: "title_desc", label: "Title Z-A" },
  { value: "most_viewed", label: "Most Viewed" },
];

type LayoutType = "grid" | "list-compact" | "list-large";
type SearchMode = "title" | "author";

const Browse = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [layout, setLayout] = useState<LayoutType>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("title");
  const [activeType, setActiveType] = useState(() => searchParams.get("type") ?? "all");
  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [genreQuery, setGenreQuery] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [statusQuery, setStatusQuery] = useState("");
  const [filteredGenreQuery, setFilteredGenreQuery] = useState("");
  const [filteredTagQuery, setFilteredTagQuery] = useState("");
  const [filteredStatusQuery, setFilteredStatusQuery] = useState("");
  const [genreInputFocused, setGenreInputFocused] = useState(false);
  const [tagInputFocused, setTagInputFocused] = useState(false);
  const [statusInputFocused, setStatusInputFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [orderBy, setOrderBy] = useState("latest");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const addGenre = (genre: string) => { if (!selectedGenres.includes(genre)) setSelectedGenres((p) => [...p, genre]); };
  const addTag = (tag: string) => { if (!selectedTags.includes(tag)) setSelectedTags((p) => [...p, tag]); };
  const addStatus = (status: string) => { if (!activeStatuses.includes(status)) setActiveStatuses((p) => [...p, status]); };
  const removeGenre = (g: string) => setSelectedGenres((p) => p.filter((x) => x !== g));
  const removeTag = (t: string) => setSelectedTags((p) => p.filter((x) => x !== t));
  const removeStatus = (s: string) => setActiveStatuses((p) => p.filter((x) => x !== s));

  const [stories, setStories] = useState<Story[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const t = siteContent.browse;

  useEffect(() => {
    if (user) {
      const loadFavorites = async () => {
        const { data } = await supabase.from("user_favorites" as any).select("story_id").eq("user_id", user.id);
        if (data) setFavoriteIds(new Set(data.map((f: any) => f.story_id)));
      };
      loadFavorites();
    } else {
      setFavoriteIds(new Set());
    }
  }, [user]);

  useEffect(() => {
    const type = searchParams.get("type") ?? "all";
    setActiveType(type);
    setPage(1);
  }, [searchParams]);

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    setPage(1);
    if (type === "all") searchParams.delete("type");
    else searchParams.set("type", type);
    setSearchParams(searchParams, { replace: true });
  };

  const toggleFavorite = async (story: Story) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to add favorites" });
      return;
    }
    try {
      const isFavorited = favoriteIds.has(story.id);
      if (isFavorited) {
        await supabase.from("user_favorites" as any).delete().eq("user_id", user.id).eq("story_id", story.id);
        setFavoriteIds((prev) => { const n = new Set(prev); n.delete(story.id); return n; });
        toast({ title: "Removed from favorites" });
      } else {
        await supabase.from("user_favorites" as any).insert({ user_id: user.id, story_id: story.id });
        setFavoriteIds((prev) => new Set(prev).add(story.id));
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

  useEffect(() => {
    const timer = setTimeout(() => setFilteredGenreQuery(genreQuery), 500);
    return () => clearTimeout(timer);
  }, [genreQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setFilteredTagQuery(tagQuery), 500);
    return () => clearTimeout(timer);
  }, [tagQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setFilteredStatusQuery(statusQuery), 500);
    return () => clearTimeout(timer);
  }, [statusQuery]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let storyIds: string[] | null = null;

        if (searchQuery && searchMode === "author") {
          const { data: matchedStories } = await supabase
            .from("stories")
            .select("id")
            .eq("review_status", "approved")
            .ilike("author_name", `%${searchQuery}%`);

          if (!matchedStories || matchedStories.length === 0) {
            setStories([]);
            setTotalCount(0);
            setLoading(false);
            return;
          }
          storyIds = matchedStories.map((s) => s.id);
        }

        let countQuery = supabase.from("stories").select("id", { count: "exact", head: true }).eq("review_status", "approved");
        let dataQuery = supabase.from("stories").select("*").eq("review_status", "approved");

        if (storyIds !== null) {
          countQuery = countQuery.in("id", storyIds);
          dataQuery = dataQuery.in("id", storyIds);
        } else if (searchQuery && searchMode === "title") {
          countQuery = countQuery.ilike("title", `%${searchQuery}%`);
          dataQuery = dataQuery.ilike("title", `%${searchQuery}%`);
        }

        if (activeType !== "all") {
          countQuery = countQuery.eq("type", activeType as any);
          dataQuery = dataQuery.eq("type", activeType as any);
        }

        if (activeStatuses.length > 0) {
          countQuery = countQuery.in("status", activeStatuses as any);
          dataQuery = dataQuery.in("status", activeStatuses as any);
        }

        if (selectedGenres.length > 0) {
          countQuery = countQuery.overlaps("genres", selectedGenres);
          dataQuery = dataQuery.overlaps("genres", selectedGenres);
        }

        if (selectedTags.length > 0) {
          countQuery = countQuery.overlaps("tags", selectedTags);
          dataQuery = dataQuery.overlaps("tags", selectedTags);
        }

        if (orderBy === "latest") dataQuery = dataQuery.order("created_at", { ascending: false });
        else if (orderBy === "oldest") dataQuery = dataQuery.order("created_at", { ascending: true });
        else if (orderBy === "title_asc") dataQuery = dataQuery.order("title", { ascending: true });
        else if (orderBy === "title_desc") dataQuery = dataQuery.order("title", { ascending: false });
        else if (orderBy === "most_viewed") dataQuery = dataQuery.order("view_count", { ascending: false });

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        dataQuery = dataQuery.range(from, to);

        const [countRes, dataRes] = await Promise.all([countQuery, dataQuery]);

        setTotalCount(countRes.count ?? 0);
        setStories((dataRes.data as Story[]) || []);
      } catch (err) {
        console.error("Browse fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeType, activeStatuses, searchQuery, searchMode, selectedGenres, selectedTags, orderBy, page]);

  const hasFilters = activeType !== "all" || activeStatuses.length > 0 || selectedGenres.length > 0 || selectedTags.length > 0 || searchQuery || orderBy !== "latest";

  const clearFilters = () => {
    setActiveType("all");
    setActiveStatuses([]);
    setSelectedGenres([]);
    setSelectedTags([]);
    setSearchQuery("");
    setOrderBy("latest");
    searchParams.delete("type");
    setSearchParams(searchParams, { replace: true });
  };

  const filteredGenres = allGenres.filter((g) => g.toLowerCase().includes(filteredGenreQuery.toLowerCase()));
  const filteredTags = allTags.filter((t) => t.toLowerCase().includes(filteredTagQuery.toLowerCase()));
  const filteredStatuses = statuses.filter((s) => s.toLowerCase().includes(filteredStatusQuery.toLowerCase()));
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="container py-6 sm:py-8 px-4 sm:px-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t.title}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{t.description}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md flex">
          <div className="relative flex flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder={searchMode === "author" ? "Search by author nameâ€¦" : t.searchPlaceholder}
              className="pl-10 bg-card border-border text-sm rounded-r-none border-r-0"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={searchMode} onValueChange={(v) => { setSearchMode(v as SearchMode); setPage(1); }}>
            <SelectTrigger className="w-28 bg-card border-border text-xs rounded-l-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="author">Author</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} className="gap-2 text-sm">
          <Filter className="h-4 w-4" /> {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground self-center text-sm">
            <X className="h-3.5 w-3.5" /> {t.clearFilters}
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {types.map((tp) => (
          <Button key={tp.value} size="sm" variant={activeType === tp.value ? "default" : "secondary"} onClick={() => handleTypeChange(tp.value)} className="gap-1.5 text-sm">
            <tp.icon className="h-3.5 w-3.5" />{tp.label}
          </Button>
        ))}
      </div>

      {showFilters && (
        <div className="p-4 sm:p-5 rounded-lg bg-card border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="w-full">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Genres</label>
              <div className="relative w-full">
                <div className="h-10 min-h-[2.5rem] flex items-center flex-wrap gap-1 px-2 border border-border rounded-md bg-secondary">
                  {selectedGenres.map((g) => (
                    <Badge key={g} className="gap-1">{g}<button type="button" onClick={() => removeGenre(g)}><X className="h-3.5 w-3.5" /></button></Badge>
                  ))}
                  <Input
                    placeholder="Type genres"
                    className="flex-1 border-none bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus:ring-0 focus:outline-none"
                    value={genreQuery}
                    onChange={(e) => setGenreQuery(e.target.value)}
                    onFocus={() => setGenreInputFocused(true)}
                    onBlur={() => setTimeout(() => setGenreInputFocused(false), 150)}
                    onKeyDown={(e) => { if (e.key === "Enter" && filteredGenres.length > 0) { e.preventDefault(); addGenre(filteredGenres[0]); setGenreQuery(""); } }}
                  />
                  {selectedGenres.length > 0 && <Button variant="ghost" size="icon" className="p-1" onClick={() => setSelectedGenres([])}><X className="h-3.5 w-3.5" /></Button>}
                </div>
                {(genreInputFocused || genreQuery) && (
                  <div className="absolute z-10 mt-1 w-full max-h-44 overflow-auto rounded-md border border-border bg-card shadow-lg">
                    {filteredGenres.filter((g) => !selectedGenres.includes(g)).map((g) => (
                      <button key={g} type="button" onMouseDown={(e) => { e.preventDefault(); addGenre(g); setGenreQuery(""); }} className="w-full px-2 py-1 text-left text-sm hover:bg-secondary">{g}</button>
                    ))}
                    {filteredGenres.filter((g) => !selectedGenres.includes(g)).length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">No matching genres</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags</label>
              <div className="relative w-full">
                <div className="h-10 min-h-[2.5rem] flex items-center flex-wrap gap-1 px-2 border border-border rounded-md bg-secondary">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} className="gap-1">{tag}<button type="button" onClick={() => removeTag(tag)}><X className="h-3.5 w-3.5" /></button></Badge>
                  ))}
                  <Input
                    placeholder="Type tags"
                    className="flex-1 border-none bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus:ring-0 focus:outline-none"
                    value={tagQuery}
                    onChange={(e) => setTagQuery(e.target.value)}
                    onFocus={() => setTagInputFocused(true)}
                    onBlur={() => setTimeout(() => setTagInputFocused(false), 150)}
                    onKeyDown={(e) => { if (e.key === "Enter" && filteredTags.length > 0) { e.preventDefault(); addTag(filteredTags[0]); setTagQuery(""); } }}
                  />
                  {selectedTags.length > 0 && <Button variant="ghost" size="icon" className="p-1" onClick={() => setSelectedTags([])}><X className="h-3.5 w-3.5" /></Button>}
                </div>
                {(tagInputFocused || tagQuery) && (
                  <div className="absolute z-10 mt-1 w-full max-h-44 overflow-auto rounded-md border border-border bg-card shadow-lg">
                    {filteredTags.filter((tag) => !selectedTags.includes(tag)).map((tag) => (
                      <button key={tag} type="button" onMouseDown={(e) => { e.preventDefault(); addTag(tag); setTagQuery(""); }} className="w-full px-2 py-1 text-left text-sm hover:bg-secondary">{tag}</button>
                    ))}
                    {filteredTags.filter((tag) => !selectedTags.includes(tag)).length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">No matching tags</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <div className="relative w-full">
                <div className="h-10 min-h-[2.5rem] flex items-center flex-wrap gap-1 px-2 border border-border rounded-md bg-secondary">
                  {activeStatuses.map((s) => (
                    <Badge key={s} className="gap-1 capitalize">{s}<button type="button" onClick={() => removeStatus(s)}><X className="h-3.5 w-3.5" /></button></Badge>
                  ))}
                  <Input
                    placeholder="Type status"
                    className="flex-1 border-none bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus:ring-0 focus:outline-none"
                    value={statusQuery}
                    onChange={(e) => setStatusQuery(e.target.value)}
                    onFocus={() => setStatusInputFocused(true)}
                    onBlur={() => setTimeout(() => setStatusInputFocused(false), 150)}
                    onKeyDown={(e) => { if (e.key === "Enter" && filteredStatuses.length > 0) { e.preventDefault(); addStatus(filteredStatuses[0]); setStatusQuery(""); } }}
                  />
                  {activeStatuses.length > 0 && <Button variant="ghost" size="icon" className="p-1" onClick={() => setActiveStatuses([])}><X className="h-3.5 w-3.5" /></Button>}
                </div>
                {(statusInputFocused || statusQuery) && (
                  <div className="absolute z-10 mt-1 w-full max-h-44 overflow-auto rounded-md border border-border bg-card shadow-lg">
                    {filteredStatuses.filter((s) => !activeStatuses.includes(s)).map((s) => (
                      <button key={s} type="button" onMouseDown={(e) => { e.preventDefault(); addStatus(s); setStatusQuery(""); }} className="w-full px-2 py-1 text-left text-sm hover:bg-secondary capitalize">{s}</button>
                    ))}
                    {filteredStatuses.filter((s) => !activeStatuses.includes(s)).length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">No matching status</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Order by</label>
              <div className="h-10 min-h-[2.5rem] flex items-center px-2 border border-border rounded-md bg-secondary">
                <Select value={orderBy} onValueChange={setOrderBy}>
                  <SelectTrigger className="w-full bg-transparent border-none text-sm">
                    <SelectValue placeholder="Latest Update" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loading ? "" : `${totalCount.toLocaleString()} results`}
        </p>
        <div className="flex gap-1 border border-border rounded-lg p-1 bg-card">
          <Button size="sm" variant={layout === "list-compact" ? "default" : "ghost"} onClick={() => setLayout("list-compact")} title="Compact List">
            <List className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={layout === "list-large" ? "default" : "ghost"} onClick={() => setLayout("list-large")} title="List with Cover">
            <Rows3 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={layout === "grid" ? "default" : "ghost"} onClick={() => setLayout("grid")} title="Grid">
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className={layout === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4" : "flex flex-col gap-3"}>
          {Array.from({ length: 12 }).map((_, i) => (
            layout === "grid" ? (
              <div key={i} className="rounded-lg overflow-hidden bg-card border border-border animate-pulse">
                <div className="aspect-[3/4] bg-secondary" />
                <div className="p-2 sm:p-3 space-y-2">
                  <div className="h-3 sm:h-4 bg-secondary rounded w-3/4" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </div>
            ) : layout === "list-large" ? (
              <div key={i} className="border border-border rounded-lg overflow-hidden bg-card animate-pulse flex">
                <div className="w-24 h-32 bg-secondary flex-shrink-0" />
                <div className="flex-1 p-3 space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </div>
            ) : (
              <div key={i} className="border border-border rounded-lg p-3 bg-card animate-pulse">
                <div className="h-4 bg-secondary rounded w-3/4 mb-1" />
                <div className="h-3 bg-secondary rounded w-1/2" />
              </div>
            )
          ))}
        </div>
      ) : stories.length > 0 ? (
        <>
          {layout === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {stories.map((story) => (
                <div key={story.id} className="relative">
                  <ContentCard story={story} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 bg-background/80 backdrop-blur-sm z-10"
                    onClick={(e) => { e.preventDefault(); toggleFavorite(story); }}
                    title={favoriteIds.has(story.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart className={`h-3.5 w-3.5 ${favoriteIds.has(story.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                  </Button>
                </div>
              ))}
            </div>
          ) : layout === "list-large" ? (
            <div className="space-y-3">
              {stories.map((story) => (
                <div key={story.id} className="border border-border rounded-lg bg-card hover:bg-secondary/50 transition-colors flex overflow-hidden min-h-32 relative">
                  <div className="w-24 flex-shrink-0 bg-secondary overflow-hidden">
                    {story.cover_image_url ? (
                      <img src={story.cover_image_url} alt={story.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <a href={`/story/${story.id}`} className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-2 hover:text-primary">{story.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{story.author_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{story.description}</p>
                    </div>
                    <div className="flex gap-2 mt-2 items-center flex-wrap">
                      <Badge variant="outline" className="capitalize text-xs">{story.status}</Badge>
                      <Badge variant="secondary" className="text-xs">{story.type}</Badge>
                      {(story as any).view_count > 0 && (
                        <span className="text-xs text-muted-foreground">{(story as any).view_count.toLocaleString()} views</span>
                      )}
                    </div>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 bg-background/80 backdrop-blur-sm z-10"
                    onClick={(e) => { e.preventDefault(); toggleFavorite(story); }}
                    title={favoriteIds.has(story.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart className={`h-3.5 w-3.5 ${favoriteIds.has(story.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {stories.map((story) => (
                <div key={story.id} className="border border-border rounded-lg p-3 bg-card hover:bg-secondary/50 transition-colors relative">
                  <a href={`/story/${story.id}`} className="block">
                    <h3 className="font-semibold text-sm sm:text-base truncate hover:text-primary">{story.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{story.author_name}</p>
                    <div className="flex gap-2 mt-2 items-center">
                      <Badge variant="outline" className="capitalize text-xs">{story.status}</Badge>
                      <Badge variant="secondary" className="text-xs">{story.type}</Badge>
                    </div>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 bg-background/80 backdrop-blur-sm z-10"
                    onClick={(e) => { e.preventDefault(); toggleFavorite(story); }}
                    title={favoriteIds.has(story.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart className={`h-3.5 w-3.5 ${favoriteIds.has(story.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 sm:mt-8">
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalCount} pageSize={PAGE_SIZE} />
          </div>
        </>
      ) : (
        <div className="text-center py-12 sm:py-16 text-muted-foreground">
          <p className="text-sm sm:text-base">{t.noResults}</p>
        </div>
      )}
    </div>
  );
};

export default Browse;

