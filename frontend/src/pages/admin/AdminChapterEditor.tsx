import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import MultiImageUpload from "@/components/MultiImageUpload";
import type { Chapter, StoryType } from "@/types/domain";

interface Props {
  storyId: string;
  storyType: StoryType;
  isCreatorMode?: boolean;
}

const AdminChapterEditor = ({ storyId, storyType, isCreatorMode = false }: Props) => {
  const { toast } = useToast();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState(1);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);

  const isManga = storyType === "manga" || storyType === "comic";

  useEffect(() => {
    if (isManga) return;
    if (!editorContainerRef.current) return;
    if (quillRef.current) return;

    quillRef.current = new Quill(editorContainerRef.current, {
      theme: "snow",
      placeholder: "Write chapter content...",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "code-block"],
          [{ align: [] }],
          ["link"],
          ["clean"],
        ],
      },
    });
  }, [isManga, creating, editing]);

  const loadChapters = useCallback(async () => {
    const { data } = await supabase
      .from("chapters")
      .select("*")
      .eq("story_id", storyId)
      .order("chapter_number");
    if (data) setChapters(data);
  }, [storyId]);

  useEffect(() => { loadChapters(); }, [loadChapters]);

  const resetForm = () => {
    setEditing(null);
    setCreating(false);
    setTitle("");
    setChapterNumber(chapters.length + 1);
    setImageUrls([]);
    if (quillRef.current) {
      quillRef.current.setContents([]);
    }
  };

  const startEdit = (ch: Chapter) => {
    setEditing(ch);
    setCreating(false);
    setTitle(ch.title);
    setChapterNumber(ch.chapter_number);
    setImageUrls(ch.image_urls ?? []);
    setTimeout(() => {
      if (quillRef.current && ch.content) {
        quillRef.current.clipboard.dangerouslyPasteHTML(ch.content);
      }
    }, 50);
  };

  const handleSave = async () => {
    const content = isManga ? null : (quillRef.current?.root.innerHTML ?? "");
    const payload = {
      story_id: storyId,
      title,
      chapter_number: chapterNumber,
      content,
      image_urls: isManga ? imageUrls : [],
      review_status: isCreatorMode ? "pending" : "approved",
    };

    if (editing) {
      const { error } = await supabase.from("chapters").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Chapter updated" });
    } else {
      const { error } = await supabase.from("chapters").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Chapter created" });
    }
    resetForm();
    loadChapters();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this chapter?")) return;
    await supabase.from("chapters").delete().eq("id", id);
    toast({ title: "Chapter deleted" });
    loadChapters();
  };

  return (
    <div className="space-y-4">
      <style>{`
        .chapter-quill .ql-toolbar.ql-snow {
          border-color: hsl(var(--border));
          background: hsl(var(--secondary) / 0.5);
          border-radius: 0.375rem 0.375rem 0 0;
        }
        .chapter-quill .ql-container.ql-snow {
          border-color: hsl(var(--border));
          border-radius: 0 0 0.375rem 0.375rem;
          font-family: inherit;
          font-size: 0.875rem;
        }
        .chapter-quill .ql-editor {
          min-height: 300px;
          max-height: 600px;
          overflow-y: auto;
          color: hsl(var(--foreground));
          line-height: 1.7;
        }
        .chapter-quill .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        .chapter-quill .ql-editor:focus { outline: none; box-shadow: none; }
        .chapter-quill .ql-toolbar .ql-stroke { stroke: hsl(var(--muted-foreground)); }
        .chapter-quill .ql-toolbar .ql-fill   { fill:   hsl(var(--muted-foreground)); }
        .chapter-quill .ql-toolbar button:hover .ql-stroke,
        .chapter-quill .ql-toolbar button.ql-active .ql-stroke { stroke: hsl(var(--primary)); }
        .chapter-quill .ql-toolbar button:hover .ql-fill,
        .chapter-quill .ql-toolbar button.ql-active .ql-fill   { fill: hsl(var(--primary)); }
        .chapter-quill .ql-toolbar button.ql-active { background: hsl(var(--primary) / 0.15); border-radius: 4px; }
        .chapter-quill .ql-toolbar .ql-picker-label { color: hsl(var(--muted-foreground)); border-color: hsl(var(--border)); }
        .chapter-quill .ql-snow .ql-picker-options {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .chapter-quill .ql-snow .ql-picker-item { color: hsl(var(--foreground)); }
        .chapter-quill .ql-snow .ql-picker-item:hover { color: hsl(var(--primary)); }
        .chapter-quill .ql-snow .ql-tooltip {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          border-radius: 0.375rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          z-index: 100;
        }
        .chapter-quill .ql-snow .ql-tooltip input[type=text] {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          border-radius: 0.25rem;
          outline: none;
        }
        .chapter-quill .ql-editor h1 { font-size: 1.75rem; font-weight: 700; margin: 0.5rem 0; }
        .chapter-quill .ql-editor h2 { font-size: 1.375rem; font-weight: 600; margin: 0.4rem 0; }
        .chapter-quill .ql-editor h3 { font-size: 1.125rem; font-weight: 600; margin: 0.3rem 0; }
        .chapter-quill .ql-editor blockquote {
          border-left: 3px solid hsl(var(--primary) / 0.5);
          padding-left: 0.75rem;
          color: hsl(var(--muted-foreground));
          margin: 0.5rem 0;
        }
        .chapter-quill .ql-editor pre.ql-syntax {
          background: hsl(var(--secondary));
          border-radius: 0.375rem;
          color: hsl(var(--foreground));
          padding: 0.75rem;
        }
        .chapter-quill .ql-editor a { color: hsl(var(--primary)); }
      `}</style>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Chapters ({chapters.length})</h3>
        {!creating && !editing && (
          <Button
            size="sm"
            onClick={() => { resetForm(); setCreating(true); setChapterNumber(chapters.length + 1); }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Chapter
          </Button>
        )}
      </div>

      {(creating || editing) && (
        <div className="border border-border rounded-lg bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{editing ? "Edit Chapter" : "New Chapter"}</h4>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Chapter title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background border-border"
            />
            <Input
              type="number"
              placeholder="Chapter number"
              value={chapterNumber}
              onChange={(e) => setChapterNumber(Number(e.target.value))}
              className="bg-background border-border"
            />
          </div>

          {isManga ? (
            <MultiImageUpload
              bucket="manga-images"
              folder={storyId}
              label="Chapter Pages"
              value={imageUrls}
              onChange={setImageUrls}
            />
          ) : (
            <div className="chapter-quill">
              <div ref={editorContainerRef} />
            </div>
          )}

          <Button onClick={handleSave} className="gap-1.5">
            <Save className="h-4 w-4" />{editing ? "Update" : "Create"}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {chapters.map((ch) => (
          <div key={ch.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Ch. {ch.chapter_number}: </span>
              <span className="text-sm text-muted-foreground">{ch.title}</span>
              {ch.review_status && ch.review_status !== "approved" && (
                <Badge
                  variant={ch.review_status === "rejected" ? "destructive" : "secondary"}
                  className="text-xs capitalize"
                >
                  {ch.review_status}
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(ch)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(ch.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminChapterEditor;

