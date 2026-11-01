import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit, Save, X, AlertCircle, Search, Eye, BarChart3, List, LayoutGrid, Rows3, Image, Heart, BookOpen, Tv, Play, FileText, EyeOff, Send, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import ImageUpload from "@/components/ImageUpload";
import { Switch } from "@/components/ui/switch";
import FilteredTagInput from "@/components/FilteredTagInput";
import SelectDropdown from "@/components/SelectDropdown";
import ContentEditor from "@/components/ContentEditor";
import AnimeContentEditor from "@/components/AnimeContentEditor";
import ContentCard from "@/components/ContentCard";
import StoryRelationshipManager from "@/components/StoryRelationshipManager";
import StoryMap from "@/components/StoryMap";

const storyTypes = [
  { value: "novel", label: "Novel" },
  { value: "manga", label: "Manga" },
  { value: "anime", label: "Anime" },
] as const;

const storyStatuses = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
] as const;

const contentOrigins = [
  { value: "original", label: "Original" },
  { value: "fanfiction", label: "Non-Original / Fan Fiction" },
  { value: "unset", label: "Not specified" },
] as const;

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

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PaginationControls = ({ currentPage, totalPages, onPageChange }: PaginationControlsProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>

      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
          if (pageNum > totalPages) return null;

          return (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className="w-8 h-8 p-0"
            >
              {pageNum}
            </Button>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </Button>
    </div>
  );
};

const CreatorDashboard = () => {
  const { user, isCreator, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [showFullEditor, setShowFullEditor] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list-compact" | "list-large">("grid");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [authorDisplayName, setAuthorDisplayName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReview, setFilterReview] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "novel" as string,
    status: "ongoing" as string,
    content_origin: "unset" as string,
    genres: [] as string[],
    tags: [] as string[],
    cover_image_url: "",
    is_cyoa: false,
  });

  const loadStories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    if (data) setStories(data);
    setLoading(false);
  };

  useEffect(() => { loadStories(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadAuthorName = async () => {
      const { data } = await supabase.from("profiles").select("display_name, username").eq("id", user.id).single();
      setAuthorDisplayName(data?.display_name || data?.username || "");
    };
    loadAuthorName();
  }, [user]);

  useEffect(() => {
    if (user) {
      const loadFavorites = async () => {
        const { data } = await supabase.from("user_favorites" as any).select("story_id").eq("user_id", user.id);
        if (data) setFavoriteIds(new Set(data.map((f: any) => f.story_id)));
      };
      loadFavorites();
    }
  }, [user]);

  const filteredStories = stories.filter((story) => {
    const matchesSearch = searchQuery === "" ||
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (story.author_name && story.author_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === "all" || story.type === filterType;
    const matchesStatus = filterStatus === "all" || story.status === filterStatus;
    const matchesReview = filterReview === "all" || story.review_status === filterReview;

    return matchesSearch && matchesType && matchesStatus && matchesReview;
  });

  const totalPages = Math.ceil(filteredStories.length / itemsPerPage);
  const paginatedStories = filteredStories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isSelectedStoryVisible = selectedStory && filteredStories.some(s => s.id === selectedStory);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterStatus, filterReview]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  useEffect(() => {
    if (selectedStory && !isSelectedStoryVisible) {
      setSelectedStory(null);
    }
  }, [selectedStory, isSelectedStoryVisible]);

  const stats = {
    total: stories.length,
    draft: stories.filter(s => s.review_status === "draft").length,
    approved: stories.filter(s => s.review_status === "approved").length,
    pending: stories.filter(s => s.review_status === "pending").length,
    rejected: stories.filter(s => s.review_status === "rejected").length,
    archived: stories.filter(s => s.review_status === "archived").length,
    novels: stories.filter(s => s.type === "novel").length,
    mangas: stories.filter(s => s.type === "manga").length,
    animes: stories.filter(s => s.type === "anime").length,
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
  if (!user) return <Navigate to="/auth/creator" />;
  if (!isCreator) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Access denied. Creator account required.</p>
    </div>
  );

  const resetForm = () => {
    setForm({
      title: "", description: "", type: "novel", status: "ongoing",
      content_origin: "unset", genres: [], tags: [], cover_image_url: "", is_cyoa: false,
    });
    setEditing(null);
    setCreating(false);
  };

  const startEdit = (story: any) => {
    setForm({
      title: story.title,
      description: story.description || "",
      type: story.type,
      status: story.status,
      content_origin: story.content_origin || "unset",
      genres: story.genres || [],
      tags: story.tags || [],
      cover_image_url: story.cover_image_url || "",
      is_cyoa: story.is_cyoa || false,
    });
    setEditing(story);
    setCreating(false);
    setSelectedStory(story.id);
    setShowFullEditor(true);
  };

  const handleSave = async (targetStatus?: "draft" | "approved") => {
    const origin = form.content_origin === "unset" ? null : form.content_origin;
    const payload: any = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      status: form.status,
      content_origin: origin ?? "original",
      author_name: authorDisplayName || null,
      genres: form.genres,
      tags: form.tags,
      cover_image_url: form.cover_image_url || null,
      created_by: user.id,
      is_cyoa: form.is_cyoa,
    };
    if (targetStatus) payload.review_status = targetStatus;

    const successMessage = targetStatus === "draft"
      ? "Saved as draft"
      : targetStatus === "approved"
        ? "Story published"
        : "Story updated";

    if (editing) {
      const { error } = await supabase.from("stories").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: successMessage });
    } else {
      payload.review_status = targetStatus ?? "draft";
      const { error } = await supabase.from("stories").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: payload.review_status === "approved" ? "Story published" : "Story saved as draft" });
    }
    resetForm();
    loadStories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this story and all its content?")) return;
    await supabase.from("stories").delete().eq("id", id);
    toast({ title: "Story deleted" });
    loadStories();
    if (selectedStory === id) setSelectedStory(null);
  };

  const toggleFavorite = async (story: any) => {
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

  const reviewBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft:    { label: "Draft",          variant: "outline" },
      pending:  { label: "Pending Review", variant: "secondary" },
      approved: { label: "Approved",       variant: "default" },
      rejected: { label: "Taken down",     variant: "destructive" },
      archived: { label: "Archived",       variant: "outline" },
    };
    const s = map[status] || map.pending;
    return <Badge variant={s.variant} className="text-xs">{s.label}</Badge>;
  };

  const renderPublishActions = (className = "") => {
    const currentStatus = editing?.review_status ?? "draft";
    // Stories go live immediately; they are reviewed when users flag them.
    // A story a moderator took down ("rejected") stays down until an admin restores it.
    const takenDown = currentStatus === "rejected";
    const isUnpublished = !editing || ["draft", "pending", "archived"].includes(currentStatus);
    if (takenDown) {
      return (
        <div className={`space-y-2 ${className}`}>
          <Button onClick={() => handleSave()} className="gap-1.5">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
          <p className="text-xs text-destructive">
            This story was taken down by a moderator after a report. You can still edit it, but only an admin can make it public again.
          </p>
        </div>
      );
    }
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {isUnpublished && (
          <Button variant="outline" onClick={() => handleSave("draft")} className="gap-1.5">
            <FileText className="h-4 w-4" /> Save as Draft
          </Button>
        )}
        <Button onClick={() => handleSave(isUnpublished ? "approved" : undefined)} className="gap-1.5">
          {isUnpublished ? <Send className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {isUnpublished ? "Publish" : "Save Changes"}
        </Button>
        {!isUnpublished && (
          <Button variant="outline" onClick={() => handleSave("draft")} className="gap-1.5">
            <EyeOff className="h-4 w-4" /> Unpublish (Save as Draft)
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="container py-8 space-y-6">
      {!showFullEditor && (
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          {!creating && !editing && (
            <Button onClick={() => { resetForm(); setCreating(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Story
            </Button>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>Save a story as a draft to keep working on it privately, or submit it for admin review to publish. Editing an already-published story keeps it live — it won't be sent back for review.</p>
      </div>

      {!creating && !editing && !showFullEditor && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Stories</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
              <span className="text-sm font-medium text-muted-foreground">Draft</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-muted-foreground">{stats.draft}</p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-muted-foreground">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.approved}</p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm font-medium text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.pending}</p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium text-muted-foreground">Rejected</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.rejected}</p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-sm font-medium text-muted-foreground">Archived</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-gray-600">{stats.archived}</p>
          </div>
        </div>
      )}

      {(creating || editing) && !showFullEditor && (
        <div className="border border-border rounded-lg bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{editing ? "Edit Story" : "Create Story"}</h2>
              {editing && reviewBadge(editing.review_status ?? "draft")}
            </div>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-background border-border"
            />
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Author</label>
              <Input value={authorDisplayName} disabled className="bg-secondary/50 border-border" />
            </div>
            <SelectDropdown
              label="Type"
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v })}
              options={storyTypes.map(t => ({ value: t.value, label: t.label }))}
              searchable={false}
            />
            <SelectDropdown
              label="Status"
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v })}
              options={storyStatuses.map(s => ({ value: s.value, label: s.label }))}
              searchable={false}
            />

            <div className="sm:col-span-2">
              <SelectDropdown
                label="Content Origin"
                value={form.content_origin}
                onChange={(v) => setForm({ ...form, content_origin: v })}
                options={contentOrigins.map(c => ({ value: c.value, label: c.label }))}
                searchable={false}
              />
            </div>

            {form.type !== "anime" && (
              <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                <div>
                  <p className="text-sm font-medium">CYOA Branching</p>
                  <p className="text-xs text-muted-foreground">Let chapters end with reader choices that lead to different chapters.</p>
                </div>
                <Switch checked={form.is_cyoa} onCheckedChange={(v) => setForm({ ...form, is_cyoa: v })} />
              </div>
            )}

            <div className="sm:col-span-2">
              <ImageUpload
                bucket="covers"
                folder={user?.id}
                label="Cover Image"
                value={form.cover_image_url}
                onChange={(url) => setForm({ ...form, cover_image_url: url })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FilteredTagInput
              label="Genres"
              values={form.genres}
              onChange={(vals) => setForm({ ...form, genres: vals })}
              options={allGenres}
              placeholder="Search genres..."
            />
            <FilteredTagInput
              label="Tags"
              values={form.tags}
              onChange={(vals) => setForm({ ...form, tags: vals })}
              options={allTags}
              placeholder="Search tags..."
            />
          </div>

          <Textarea
            placeholder="Description..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-background border-border"
            rows={3}
          />

          {renderPublishActions()}
        </div>
      )}

      {!showFullEditor && (
        <div className="mt-4">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search stories..."
                      className="pl-10 bg-background border-border w-56"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32 bg-background border-border">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {storyTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="capitalize">{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-36 bg-background border-border">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {storyStatuses.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="capitalize">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterReview} onValueChange={setFilterReview}>
                    <SelectTrigger className="w-36 bg-background border-border">
                      <SelectValue placeholder="Review" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All reviews</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    {filteredStories.length} of {stories.length} stories
                  </div>
                  <div className="flex gap-1 border border-border rounded-lg p-1 bg-card">
                    <Button
                      size="sm"
                      variant={layout === "list-compact" ? "default" : "ghost"}
                      onClick={() => setLayout("list-compact")}
                      className="gap-1.5"
                      title="Compact List"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={layout === "list-large" ? "default" : "ghost"}
                      onClick={() => setLayout("list-large")}
                      className="gap-1.5"
                      title="List with Cover"
                    >
                      <Rows3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={layout === "grid" ? "default" : "ghost"}
                      onClick={() => setLayout("grid")}
                      className="gap-1.5"
                      title="Grid"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {paginatedStories.length === 0 ? (
                <p className="text-muted-foreground">
                  {stories.length === 0 ? "No stories yet. Create your first one!" : "No stories match your filters."}
                </p>
              ) : (
                <>
                  {layout === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {paginatedStories.map((story) => (
                        <div key={story.id} className="relative">
                          <div onClick={() => setSelectedStory(story.id)} className="cursor-pointer">
                            <ContentCard story={story} />
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 bg-background/80 backdrop-blur-sm z-10"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(story); }}
                              title="Edit story"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 bg-background/80 backdrop-blur-sm z-10"
                              onClick={(e) => { e.preventDefault(); toggleFavorite(story); }}
                              title={favoriteIds.has(story.id) ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Heart className={`h-3.5 w-3.5 ${favoriteIds.has(story.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : layout === "list-large" ? (
                    <div className="space-y-3">
                      {paginatedStories.map((story) => (
                        <div key={story.id} className="border border-border rounded-lg bg-card hover:bg-secondary/50 transition-colors flex overflow-hidden min-h-32 cursor-pointer relative" onClick={() => setSelectedStory(story.id)}>
                          <div className="w-24 flex-shrink-0 bg-secondary overflow-hidden">
                            {story.cover_image_url ? (
                              <img src={story.cover_image_url} alt={story.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <Image className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 p-3 flex flex-col justify-between">
                            <div>
                              <h3 className="font-semibold text-sm sm:text-base line-clamp-2 hover:text-primary">{story.title}</h3>
                              <p className="text-xs sm:text-sm text-muted-foreground">{story.author_name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{story.description}</p>
                            </div>
                            <div className="flex gap-2 mt-2 items-center">
                              {reviewBadge(story.review_status ?? "draft")}
                              <Badge variant="outline" className="capitalize text-xs">{story.status}</Badge>
                              <Badge variant="secondary" className="text-xs">{story.type}</Badge>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 bg-background/80 backdrop-blur-sm z-10"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(story); }}
                              title="Edit story"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 bg-background/80 backdrop-blur-sm z-10"
                              onClick={(e) => { e.preventDefault(); toggleFavorite(story); }}
                              title={favoriteIds.has(story.id) ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Heart className={`h-3.5 w-3.5 ${favoriteIds.has(story.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {paginatedStories.map((story) => (
                        <div key={story.id} className="border border-border rounded-lg p-3 bg-card hover:bg-secondary/50 transition-colors cursor-pointer relative" onClick={() => setSelectedStory(story.id)}>
                          <div className="block">
                            <h3 className="font-semibold text-sm sm:text-base truncate hover:text-primary">{story.title}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{story.author_name}</p>
                            <div className="flex gap-2 mt-2 items-center">
                              {reviewBadge(story.review_status ?? "draft")}
                              <Badge variant="outline" className="capitalize text-xs">{story.status}</Badge>
                              <Badge variant="secondary" className="text-xs">{story.type}</Badge>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 bg-background/80 backdrop-blur-sm z-10"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(story); }}
                              title="Edit story"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 bg-background/80 backdrop-blur-sm z-10"
                              onClick={(e) => { e.preventDefault(); toggleFavorite(story); }}
                              title={favoriteIds.has(story.id) ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Heart className={`h-3.5 w-3.5 ${favoriteIds.has(story.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-6 sm:mt-8">
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {showFullEditor && selectedStory && (() => {
        const story = stories.find((s) => s.id === selectedStory);
        if (!story) return null;
        const isAnime = ["anime"].includes(story.type);
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => { setShowFullEditor(false); setSelectedStory(null); }} className="gap-2">
                <span>â</span> Back to Stories
              </Button>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={() => handleDelete(story.id)} className="gap-1.5">
                  <Trash2 className="h-4 w-4" /> Delete Story
                </Button>
              </div>
            </div>
            
            <div className="border border-border rounded-lg bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Edit Story Details</h2>
                  {reviewBadge(story.review_status ?? "draft")}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-background border-border"
                />
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Author</label>
                  <Input value={authorDisplayName} disabled className="bg-secondary/50 border-border" />
                </div>
                <SelectDropdown
                  label="Type"
                  value={form.type}
                  onChange={(v) => setForm({ ...form, type: v })}
                  options={storyTypes.map(t => ({ value: t.value, label: t.label }))}
                  searchable={false}
                />
                <SelectDropdown
                  label="Status"
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v })}
                  options={storyStatuses.map(s => ({ value: s.value, label: s.label }))}
                  searchable={false}
                />
                <div className="sm:col-span-2">
                  <SelectDropdown
                    label="Content Origin"
                    value={form.content_origin}
                    onChange={(v) => setForm({ ...form, content_origin: v })}
                    options={contentOrigins.map(c => ({ value: c.value, label: c.label }))}
                    searchable={false}
                  />
                </div>
                {form.type !== "anime" && (
                  <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium">CYOA Branching</p>
                      <p className="text-xs text-muted-foreground">Let chapters end with reader choices that lead to different chapters.</p>
                    </div>
                    <Switch checked={form.is_cyoa} onCheckedChange={(v) => setForm({ ...form, is_cyoa: v })} />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <ImageUpload
                    bucket="covers"
                    folder={user?.id}
                    label="Cover Image"
                    value={form.cover_image_url}
                    onChange={(url) => setForm({ ...form, cover_image_url: url })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                <FilteredTagInput
                  label="Genres"
                  values={form.genres}
                  onChange={(vals) => setForm({ ...form, genres: vals })}
                  options={allGenres}
                  placeholder="Search genres..."
                />
                <FilteredTagInput
                  label="Tags"
                  values={form.tags}
                  onChange={(vals) => setForm({ ...form, tags: vals })}
                  options={allTags}
                  placeholder="Search tags..."
                />
              </div>
              <Textarea
                placeholder="Description..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-background border-border mt-4"
                rows={3}
              />
              {renderPublishActions("mt-4")}
            </div>

            <StoryRelationshipManager storyId={selectedStory} />

            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                {isAnime ? (
                  <><Play className="h-5 w-5 text-primary" /> Episodes</>
                ) : (
                  <><BookOpen className="h-5 w-5 text-primary" /> Chapters</>
                )}
              </h3>
              {isAnime ? (
                <AnimeContentEditor storyId={selectedStory} isCreatorMode />
              ) : (
                <ContentEditor storyId={selectedStory} storyType={story.type} isCreatorMode isCyoa={story.is_cyoa} />
              )}
            </div>

            {!isAnime && story.is_cyoa && (
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" /> Story Map
                </h3>
                <StoryMap
                  storyId={selectedStory}
                  showStatusBadges
                  emptyHint="Add branch choices in the chapters above to see them mapped out here."
                />
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default CreatorDashboard;
