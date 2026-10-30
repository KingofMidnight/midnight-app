import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, X, GripVertical, FileText, Globe, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Quill, { Parchment } from "quill";
import "quill/dist/quill.snow.css";
import MultiImageUpload from "@/components/MultiImageUpload";
import type { Chapter, ChapterChoice, StoryType } from "@/types/domain";
import { sanitizeAdminContent } from "@/utils/sanitize";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const FONT_WHITELIST = [
  "serif",
  "monospace",
  "georgia",
  "times-new-roman",
  "courier-new",
  "garamond",
  "palatino",
] as const;

const Font = Quill.import("formats/font") as Parchment.Attributor & { whitelist: string[] };
Font.whitelist = [...FONT_WHITELIST];
Quill.register(Font, true);

interface Props {
  storyId: string;
  storyType: StoryType;
  isCreatorMode?: boolean;
  isCyoa?: boolean;
}

type DraftStatus = "draft" | "approved";

const QUILL_STYLES = `
  .chapter-quill .ql-toolbar.ql-snow {
    border-color: hsl(var(--border));
    background: hsl(var(--secondary) / 0.5);
    border-radius: 0.375rem 0.375rem 0 0;
    flex-wrap: wrap;
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
    z-index: 9999;
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
  .chapter-quill .ql-font span[data-value="serif"]::before { font-family: serif; content: "Serif"; }
  .chapter-quill .ql-font span[data-value="monospace"]::before { font-family: monospace; content: "Monospace"; }
  .chapter-quill .ql-font span[data-value="georgia"]::before { font-family: Georgia, serif; content: "Georgia"; }
  .chapter-quill .ql-font span[data-value="times-new-roman"]::before { font-family: "Times New Roman", serif; content: "Times New Roman"; }
  .chapter-quill .ql-font span[data-value="courier-new"]::before { font-family: "Courier New", monospace; content: "Courier New"; }
  .chapter-quill .ql-font span[data-value="garamond"]::before { font-family: Garamond, serif; content: "Garamond"; }
  .chapter-quill .ql-font span[data-value="palatino"]::before { font-family: Palatino, serif; content: "Palatino"; }
  .chapter-quill .ql-font-serif { font-family: serif; }
  .chapter-quill .ql-font-monospace { font-family: monospace; }
  .chapter-quill .ql-font-georgia { font-family: Georgia, serif; }
  .chapter-quill .ql-font-times-new-roman { font-family: "Times New Roman", serif; }
  .chapter-quill .ql-font-courier-new { font-family: "Courier New", monospace; }
  .chapter-quill .ql-font-garamond { font-family: Garamond, serif; }
  .chapter-quill .ql-font-palatino { font-family: Palatino, serif; }
  .chapter-quill .ql-lineheight .ql-picker-label::before { content: "Spacing"; }
  .chapter-quill .ql-lineheight span[data-value="1"]::before { content: "Single (1×)"; }
  .chapter-quill .ql-lineheight span[data-value="1.5"]::before { content: "1.5×"; }
  .chapter-quill .ql-lineheight span[data-value="1.7"]::before { content: "Normal (1.7×)"; }
  .chapter-quill .ql-lineheight span[data-value="2"]::before { content: "Double (2×)"; }
  .chapter-quill .ql-lineheight span[data-value="2.5"]::before { content: "Wide (2.5×)"; }
`;

const ContentEditor = ({ storyId, storyType, isCreatorMode = false, isCyoa = false }: Props) => {
  const { toast } = useToast();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("draft");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [choices, setChoices] = useState<ChapterChoice[]>([]);
  const [newChoiceLabel, setNewChoiceLabel] = useState("");
  const [newChoiceTarget, setNewChoiceTarget] = useState("");

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const editorOpenKey = useRef<string>("");

  const isManga = storyType === "manga";
  const isAnime = storyType === "anime";
  const isEditorOpen = creating || !!editing;
  const currentOpenKey = isEditorOpen ? `${creating ? "new" : editing?.id ?? ""}` : "";

  useEffect(() => {
    if (isManga || isAnime) return;
    if (!isEditorOpen) {
      quillRef.current = null;
      editorOpenKey.current = "";
      return;
    }
    if (!editorContainerRef.current) return;
    if (quillRef.current && editorOpenKey.current === currentOpenKey) return;

    quillRef.current = null;
    editorContainerRef.current.innerHTML = "";
    editorOpenKey.current = currentOpenKey;

    const q = new Quill(editorContainerRef.current, {
      theme: "snow",
      placeholder: "Write chapter content...",
      modules: {
        toolbar: {
          container: [
            [{ font: [...FONT_WHITELIST] }],
            [{ header: [1, 2, 3, false] }],
            [{ lineheight: ["1", "1.5", "1.7", "2", "2.5"] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["blockquote", "code-block"],
            [{ align: [] }],
            ["link"],
            ["clean"],
          ],
          handlers: {
            lineheight: (value: string) => {
              const quill = quillRef.current;
              if (!quill) return;
              quill.format("lineHeight", value || false);
            },
          },
        },
      },
    });

    q.on("text-change", () => {
      setContent(q.root.innerHTML);
    });

    if (editing?.content) {
      q.clipboard.dangerouslyPasteHTML(editing.content);
    }

    quillRef.current = q;
  }, [isManga, isAnime, isEditorOpen, currentOpenKey, editing]);

  const loadChapters = useCallback(async () => {
    const { data } = await supabase
      .from("chapters")
      .select("*")
      .eq("story_id", storyId)
      .order("chapter_number");
    if (data) setChapters(data);
  }, [storyId]);

  useEffect(() => { loadChapters(); }, [loadChapters]);

  const loadChoices = useCallback(async (chapterId: string) => {
    const { data } = await supabase
      .from("chapter_choices")
      .select("*")
      .eq("source_chapter_id", chapterId)
      .order("sort_order");
    setChoices(data ?? []);
  }, []);

  useEffect(() => {
    if (isCyoa && editing?.id) {
      loadChoices(editing.id);
    } else {
      setChoices([]);
    }
    setNewChoiceLabel("");
    setNewChoiceTarget("");
  }, [isCyoa, editing?.id, loadChoices]);

  const resetForm = () => {
    setEditing(null);
    setCreating(false);
    setTitle("");
    setImageUrls([]);
    setContent("");
    setDraftStatus("draft");
  };

  const startEdit = (ch: Chapter) => {
    setEditing(ch);
    setCreating(false);
    setTitle(ch.title);
    setImageUrls(ch.image_urls ?? []);
    setContent(ch.content ?? "");
    setDraftStatus(ch.review_status === "approved" ? "approved" : "draft");
  };

  const handleAddChoice = async () => {
    if (!editing || !newChoiceLabel.trim() || !newChoiceTarget) return;
    const { error } = await supabase.from("chapter_choices").insert({
      source_chapter_id: editing.id,
      target_chapter_id: newChoiceTarget,
      label: newChoiceLabel.trim(),
      sort_order: choices.length,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewChoiceLabel("");
    setNewChoiceTarget("");
    loadChoices(editing.id);
  };

  const handleDeleteChoice = async (id: string) => {
    if (!editing) return;
    await supabase.from("chapter_choices").delete().eq("id", id);
    loadChoices(editing.id);
  };

  const handleSave = async (overrideStatus?: DraftStatus) => {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    const statusToSave = overrideStatus ?? draftStatus;
    const rawContent = isManga || isAnime ? null : content;
    const sanitizedContent = rawContent ? sanitizeAdminContent(rawContent) : null;

    const chapterNumber = editing
      ? editing.chapter_number
      : chapters.length > 0
        ? Math.max(...chapters.map((c) => c.chapter_number)) + 1
        : 1;

    const payload = {
      story_id: storyId,
      title,
      chapter_number: chapterNumber,
      content: sanitizedContent,
      image_urls: isManga ? imageUrls : [],
      review_status: statusToSave,
    };

    if (editing) {
      const { error } = await supabase.from("chapters").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: statusToSave === "draft" ? "Saved as draft" : "Chapter published" });
    } else {
      const { error } = await supabase.from("chapters").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: statusToSave === "draft" ? "Draft saved" : "Chapter created and published" });
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

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = async (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const reordered = [...chapters];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);

    const updates = reordered.map((ch, i) => ({ id: ch.id, chapter_number: i + 1 }));
    setChapters(reordered.map((ch, i) => ({ ...ch, chapter_number: i + 1 })));
    setDragIdx(null);
    setDragOverIdx(null);

    try {
      await Promise.all(
        updates.map(({ id, chapter_number }) =>
          supabase.from("chapters").update({ chapter_number }).eq("id", id)
        )
      );
      toast({ title: "Chapter order saved" });
    } catch {
      toast({ title: "Failed to save order", variant: "destructive" });
      loadChapters();
    }
  };

  return (
    <div className="space-y-4">
      <style>{QUILL_STYLES}</style>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Chapters ({chapters.length})</h3>
        {!creating && !editing && (
          <Button
            size="sm"
            onClick={() => { resetForm(); setCreating(true); }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Chapter
          </Button>
        )}
      </div>

      {isEditorOpen && (
        <div className="border border-border rounded-lg bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{editing ? "Edit Chapter" : "New Chapter"}</h4>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </div>

          <Input
            placeholder="Chapter title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background border-border"
          />

          {isManga ? (
            <MultiImageUpload
              bucket="manga-images"
              folder={storyId}
              label="Chapter Pages"
              value={imageUrls}
              onChange={setImageUrls}
            />
          ) : isAnime ? (
            <div className="border border-border rounded-lg bg-card p-4">
              <p className="text-muted-foreground">Anime chapters use video episodes. Please use the Episode Editor for anime content.</p>
            </div>
          ) : (
            <div className="chapter-quill">
              <div ref={editorContainerRef} />
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => handleSave("draft")}
              className="gap-1.5"
            >
              <FileText className="h-4 w-4" />
              {editing ? "Save as Draft" : "Save Draft"}
            </Button>
            <Button
              onClick={() => handleSave("approved")}
              className="gap-1.5"
            >
              <Globe className="h-4 w-4" />
              {editing ? "Publish" : "Publish Now"}
            </Button>
          </div>

          {isCyoa && (
            <div className="border-t border-border pt-4 space-y-3">
              <h5 className="text-sm font-semibold flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-primary" /> Branch Choices
              </h5>
              {!editing ? (
                <p className="text-xs text-muted-foreground">
                  Save this chapter first, then reopen it to add the choices readers pick from at the end.
                </p>
              ) : (
                <>
                  {choices.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No choices yet — readers will see "Back to Story" at the end of this chapter.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {choices.map((choice) => {
                        const target = chapters.find((c) => c.id === choice.target_chapter_id);
                        return (
                          <div key={choice.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/40 text-sm">
                            <span>
                              <span className="font-medium">{choice.label}</span>
                              <span className="text-muted-foreground"> → Ch. {target?.chapter_number ?? "?"}: {target?.title ?? "Unknown chapter"}</span>
                            </span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => handleDeleteChoice(choice.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Choice text readers will see..."
                      value={newChoiceLabel}
                      onChange={(e) => setNewChoiceLabel(e.target.value)}
                      className="bg-background border-border"
                    />
                    <Select value={newChoiceTarget} onValueChange={setNewChoiceTarget}>
                      <SelectTrigger className="bg-background border-border sm:w-56">
                        <SelectValue placeholder="Leads to chapter..." />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters.filter((c) => c.id !== editing.id).map((c) => (
                          <SelectItem key={c.id} value={c.id}>Ch. {c.chapter_number}: {c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleAddChoice} disabled={!newChoiceLabel.trim() || !newChoiceTarget} className="gap-1.5 shrink-0">
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {chapters.length > 1 && !isEditorOpen && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <GripVertical className="h-3 w-3" /> Drag chapters to reorder
          </p>
        )}
        {chapters.map((ch, idx) => (
          <div
            key={ch.id}
            draggable={!isEditorOpen}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            className={`flex items-center justify-between p-3 rounded-lg bg-card border transition-colors
              ${dragOverIdx === idx && dragIdx !== idx ? "border-primary bg-primary/5" : "border-border"}
              ${dragIdx === idx ? "opacity-40" : ""}
              ${!isEditorOpen ? "cursor-grab active:cursor-grabbing" : ""}
            `}
          >
            <div className="flex items-center gap-2">
              {!isEditorOpen && <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />}
              <span className="text-sm font-medium">Ch. {ch.chapter_number}: </span>
              <span className="text-sm text-muted-foreground">{ch.title}</span>
              {ch.review_status === "draft" && (
                <Badge variant="secondary" className="text-xs">Draft</Badge>
              )}
              {ch.review_status === "pending" && (
                <Badge variant="secondary" className="text-xs">Pending</Badge>
              )}
              {ch.review_status === "rejected" && (
                <Badge variant="destructive" className="text-xs">Rejected</Badge>
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

export default ContentEditor;
