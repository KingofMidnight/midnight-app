import { useState, useEffect, KeyboardEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit, Save, X, Search, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import PaginationControls from "@/components/PaginationControls";
import ImageUpload from "@/components/ImageUpload";
import ContentEditor from "@/components/ContentEditor";
import AnimeContentEditor from "@/components/AnimeContentEditor";
import StoryRelationshipManager from "@/components/StoryRelationshipManager";

const storyTypes = ["novel", "manga", "anime"] as const;
const storyStatuses = ["ongoing", "completed", "hiatus"] as const;
const contentOrigins = [
  { value: "original",    label: "Original" },
  { value: "fanfiction",  label: "Non-Original / Fan Fiction" },
  { value: "unset",       label: "Not specified" },
] as const;

interface TagInputProps {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}

const TagInput = ({ label, values, onChange, placeholder }: TagInputProps) => {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed || values.includes(trimmed)) { setInput(""); return; }
    onChange([...values, trimmed]);
    setInput("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && values.length > 0) onChange(values.slice(0, -1));
  };

  const remove = (val: string) => onChange(values.filter((v) => v !== val));

  return (
    <div className="space-y-1.5">
      <label className="text-sm text-muted-foreground">{label}</label>
      <div className="min-h-10 flex flex-wrap gap-1.5 p-2 rounded-md bg-background border border-border focus-within:ring-1 focus-within:ring-ring">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/30">
            {v}
            <button type="button" onClick={() => remove(v)} className="hover:text-destructive transition-colors">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          placeholder={values.length === 0 ? (placeholder ?? "Type and press Enterâ€¦") : ""}
        />
      </div>
      <p className="text-xs text-muted-foreground">Press Enter or comma to add</p>
    </div>
  );
};

const AdminStoriesSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [storiesPage, setStoriesPage] = useState(1);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "novel" as typeof storyTypes[number],
    status: "ongoing" as typeof storyStatuses[number],
    content_origin: "unset" as string,
    author_name: "",
    genres: [] as string[],
    tags: [] as string[],
    cover_image_url: "",
  });

  const loadStories = async () => {
    const { data } = await supabase.from("stories").select("*").order("created_at", { ascending: false });
    if (data) setStories(data);
    setLoading(false);
  };

  useEffect(() => { loadStories(); }, []);

  const resetForm = () => {
    setForm({
      title: "", description: "", type: "novel", status: "ongoing",
      content_origin: "unset", author_name: "", genres: [], tags: [], cover_image_url: "",
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
      author_name: story.author_name || "",
      genres: story.genres || [],
      tags: story.tags || [],
      cover_image_url: story.cover_image_url || "",
    });
    setEditing(story);
    setCreating(false);
  };

  const handleSave = async () => {
    if (!user) return;
    const origin = form.content_origin === "unset" ? "original" : form.content_origin;
    const payload = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      status: form.status,
      content_origin: origin as any,
      author_name: form.author_name || null,
      genres: form.genres,
      tags: form.tags,
      cover_image_url: form.cover_image_url || null,
    };

    // Editing must not take over the story (created_by) or change its review status
    if (editing) {
      const { error } = await supabase.from("stories").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Story updated" });
    } else {
      const { error } = await supabase.from("stories").insert({ ...payload, created_by: user.id, review_status: "approved" });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Story created" });
    }
    resetForm();
    loadStories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this story and all its chapters/episodes?")) return;
    await supabase.from("stories").delete().eq("id", id);
    toast({ title: "Story deleted" });
    loadStories();
    if (selectedStory === id) setSelectedStory(null);
  };

  const handleReviewChange = async (id: string, status: string) => {
    const { error } = await supabase.from("stories").update({ review_status: status }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Story ${status}` });
    loadStories();
  };

  const filtered = stories.filter((s) => {
    if (filterType !== "all" && s.type !== filterType) return false;
    if (filterStatus !== "all" && s.review_status !== filterStatus) return false;
    if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (selectedStory) {
    const story = stories.find((s) => s.id === selectedStory);
    if (!story) return null;
    const isAnime = story.type === "anime";
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setSelectedStory(null)} className="gap-1.5 mb-4">
          <X className="h-4 w-4" /> Back to stories
        </Button>
        <div className="mb-6 p-4 rounded-lg bg-card border border-border space-y-1">
          <h2 className="text-lg font-bold">{story.title}</h2>
          <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
            <Badge variant="secondary" className="capitalize text-xs">{story.type}</Badge>
            <Badge variant="outline" className="capitalize text-xs">{story.status}</Badge>
            {story.author_name && <span>by {story.author_name}</span>}
          </div>
        </div>
        <h3 className="text-lg font-bold mb-4">{isAnime ? "Episodes" : "Chapters"}</h3>
        {isAnime ? (
          <AnimeContentEditor storyId={selectedStory} />
        ) : (
          <ContentEditor storyId={selectedStory} storyType={story.type} />
        )}

        <div className="mt-6">
          <StoryRelationshipManager storyId={selectedStory} />
        </div>
      </div>
    );
  }

  if (creating || editing) {
    return (
      <div className="border border-border rounded-lg bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{editing ? "Edit Story" : "Create Story"}</h2>
          <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="bg-background border-border"
          />
          <Input
            placeholder="Author name"
            value={form.author_name}
            onChange={(e) => setForm({ ...form, author_name: e.target.value })}
            className="bg-background border-border"
          />
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
            <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{storyTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
            <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{storyStatuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>

          {}
          <div className="sm:col-span-2">
            <label className="text-sm text-muted-foreground mb-1.5 block">Content Origin</label>
            <div className="flex gap-2 flex-wrap">
              {contentOrigins.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setForm({ ...form, content_origin: o.value })}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    form.content_origin === o.value
                      ? "bg-primary/15 border-primary/40 text-primary font-medium"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

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
          <TagInput
            label="Genres"
            values={form.genres}
            onChange={(vals) => setForm({ ...form, genres: vals })}
            placeholder="e.g. Action, Fantasyâ€¦"
          />
          <TagInput
            label="Tags"
            values={form.tags}
            onChange={(vals) => setForm({ ...form, tags: vals })}
            placeholder="e.g. slow-burn, isekaiâ€¦"
          />
        </div>

        <Textarea
          placeholder="Description..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="bg-background border-border"
          rows={3}
        />

        <Button onClick={handleSave} className="gap-1.5">
          <Save className="h-4 w-4" />{editing ? "Update" : "Create"}
        </Button>
      </div>
    );
  }

  return (
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
            <SelectTrigger className="w-32 bg-background border-border"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {storyTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 bg-background border-border"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { resetForm(); setCreating(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Story
        </Button>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{stories.length} total</span>
        <span className="text-primary">{stories.filter((s) => s.review_status === "approved").length} approved</span>
        <span>{stories.filter((s) => s.review_status === "pending").length} pending</span>
        <span className="text-destructive">{stories.filter((s) => s.review_status === "rejected").length} rejected</span>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No stories found.</p>
      ) : (() => {
        const STORIES_PAGE_SIZE = 20;
        const totalPages = Math.ceil(filtered.length / STORIES_PAGE_SIZE);
        const paged = filtered.slice((storiesPage - 1) * STORIES_PAGE_SIZE, storiesPage * STORIES_PAGE_SIZE);
        return (
          <>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead>Cover</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="w-12">
                        {s.cover_image_url ? (
                          <img src={s.cover_image_url} alt="" className="h-10 w-8 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-8 rounded bg-secondary flex items-center justify-center">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => setSelectedStory(s.id)}
                          className="font-medium text-foreground hover:text-primary transition-colors text-left"
                        >
                          {s.title}
                        </button>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize text-xs">{s.type}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{s.status}</Badge></TableCell>
                      <TableCell>
                        <Select value={s.review_status || "approved"} onValueChange={(v) => handleReviewChange(s.id, v)}>
                          <SelectTrigger className="w-28 h-7 text-xs bg-background border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.author_name || "â€”"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                            <Link to={`/story/${s.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(s)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationControls
              page={storiesPage}
              totalPages={totalPages}
              onPageChange={setStoriesPage}
              totalItems={filtered.length}
              pageSize={STORIES_PAGE_SIZE}
            />
          </>
        );
      })()}
    </div>
  );
};

export default AdminStoriesSection;

