import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  storyId: string;
  isCreatorMode?: boolean;
}

const AnimeContentEditor = ({ storyId, isCreatorMode = false }: Props) => {
  const { toast } = useToast();
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [embedUrl, setEmbedUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [duration, setDuration] = useState("");

  const loadEpisodes = async () => {
    const { data } = await supabase.from("episodes").select("*").eq("story_id", storyId).order("episode_number");
    if (data) setEpisodes(data);
  };

  useEffect(() => { loadEpisodes(); }, [storyId]);

  const resetForm = () => {
    setEditing(null);
    setCreating(false);
    setTitle("");
    setEpisodeNumber(episodes.length + 1);
    setEmbedUrl("");
    setThumbnailUrl("");
    setDuration("");
  };

  const startEdit = (ep: any) => {
    setEditing(ep);
    setCreating(false);
    setTitle(ep.title);
    setEpisodeNumber(ep.episode_number);
    setEmbedUrl(ep.embed_url || "");
    setThumbnailUrl(ep.thumbnail_url || "");
    setDuration(ep.duration_minutes?.toString() || "");
  };

  const handleSave = async () => {
    const payload: any = {
      story_id: storyId,
      title,
      episode_number: episodeNumber,
      embed_url: embedUrl || null,
      thumbnail_url: thumbnailUrl || null,
      duration_minutes: duration ? Number(duration) : null,
      review_status: "approved",
    };

    if (editing) {
      const { error } = await supabase.from("episodes").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Episode updated" });
    } else {
      const { error } = await supabase.from("episodes").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Episode created" });
    }
    resetForm();
    loadEpisodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this episode?")) return;
    await supabase.from("episodes").delete().eq("id", id);
    toast({ title: "Episode deleted" });
    loadEpisodes();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Episodes ({episodes.length})</h3>
        {!creating && !editing && (
          <Button size="sm" onClick={() => { resetForm(); setCreating(true); setEpisodeNumber(episodes.length + 1); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Episode
          </Button>
        )}
      </div>

      {(creating || editing) && (
        <div className="border border-border rounded-lg bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{editing ? "Edit Episode" : "New Episode"}</h4>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Episode title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background border-border" />
            <Input type="number" placeholder="Episode number" value={episodeNumber} onChange={(e) => setEpisodeNumber(Number(e.target.value))} className="bg-background border-border" />
            <Input placeholder="Embed URL (iframe src)" value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} className="bg-background border-border sm:col-span-2" />
            <Input placeholder="Thumbnail URL" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className="bg-background border-border" />
            <Input type="number" placeholder="Duration (minutes)" value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-background border-border" />
          </div>
          <Button onClick={handleSave} className="gap-1.5"><Save className="h-4 w-4" />{editing ? "Update" : "Create"}</Button>
        </div>
      )}

      <div className="space-y-2">
        {episodes.map((ep) => (
          <div key={ep.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Ep. {ep.episode_number}: </span>
              <span className="text-sm text-muted-foreground">{ep.title}</span>
              {ep.duration_minutes && <span className="text-xs text-muted-foreground">({ep.duration_minutes} min)</span>}
              {ep.review_status && ep.review_status !== "approved" && (
                <Badge variant={ep.review_status === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">{ep.review_status}</Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(ep)}><Edit className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(ep.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnimeContentEditor;

