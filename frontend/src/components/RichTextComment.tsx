import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RichTextCommentProps {
  onSubmit: (html: string) => void;
  disabled?: boolean;
}

const RichTextComment = ({ onSubmit, disabled }: RichTextCommentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [linkPopover, setLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const savedSelectionRef = useRef<ReturnType<Quill["getSelection"]>>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    quillRef.current = new Quill(containerRef.current, {
      theme: "snow",
      placeholder: "Write a commentary",
      bounds: containerRef.current,
      modules: {
        toolbar: {
          container: [
            [{ header: [1, 2, 3, false] }],
            [{ size: ["small", false, "large", "huge"] }],
            ["bold", "italic", "underline", "strike"],
            [{ color: [] }, { background: [] }],
            [{ script: "sub" }, { script: "super" }],
            ["code", "blockquote", "code-block"],
            [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
            [{ indent: "-1" }, { indent: "+1" }],
            [{ align: [] }],
            ["link"],
            ["clean"],
          ],
          handlers: {
            link: function () {
              const q = quillRef.current!;
              const selection = q.getSelection();
              if (!selection || selection.length === 0) return;
              savedSelectionRef.current = selection;
              const existing = q.getFormat(selection).link as string | undefined;
              setLinkUrl(existing ?? "https://");
              setLinkPopover(true);
            },
          },
        },
      },
    });

    quillRef.current.on("text-change", () => {
      const text = quillRef.current!.getText().trim();
      setCharCount(text.length);
      setIsEmpty(text.length === 0);
    });
  }, []);

  const applyLink = () => {
    const q = quillRef.current;
    if (!q || !savedSelectionRef.current) return;
    const url = linkUrl.trim();
    q.setSelection(savedSelectionRef.current);
    if (url && url !== "https://") {
      q.format("link", url);
    } else {
      q.format("link", false);
    }
    setLinkPopover(false);
    setLinkUrl("https://");
    savedSelectionRef.current = null;
  };

  const cancelLink = () => {
    setLinkPopover(false);
    setLinkUrl("https://");
    savedSelectionRef.current = null;
    quillRef.current?.focus();
  };

  useEffect(() => {
    if (!linkPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        cancelLink();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [linkPopover]);

  const handleSubmit = () => {
    if (!quillRef.current || isEmpty) return;
    const html = quillRef.current.root.innerHTML;
    onSubmit(html);
    quillRef.current.setContents([]);
    setIsEmpty(true);
    setCharCount(0);
  };

  return (
    <div className="quill-comment border border-border rounded-lg bg-card overflow-hidden">
      <style>{`
        .quill-comment .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--secondary) / 0.5);
          padding: 6px 8px;
          flex-wrap: wrap;
        }
        .quill-comment .ql-container.ql-snow {
          border: none;
          font-family: inherit;
          font-size: 0.875rem;
          position: relative;
        }
        .quill-comment .ql-editor {
          min-height: 80px;
          max-height: 240px;
          overflow-y: auto;
          color: hsl(var(--foreground));
          padding: 10px 12px;
          line-height: 1.6;
        }
        .quill-comment .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
          left: 12px;
        }
        .quill-comment .ql-editor h1 { font-size: 1.75rem; font-weight: 700; margin: 0.5rem 0; line-height: 1.2; }
        .quill-comment .ql-editor h2 { font-size: 1.375rem; font-weight: 600; margin: 0.4rem 0; line-height: 1.3; }
        .quill-comment .ql-editor h3 { font-size: 1.125rem; font-weight: 600; margin: 0.3rem 0; line-height: 1.3; }
        .quill-comment .ql-editor p  { margin: 0.2rem 0; }
        .quill-comment .ql-editor ul,
        .quill-comment .ql-editor ol { padding-left: 1.5rem; margin: 0.25rem 0; }
        .quill-comment .ql-editor blockquote {
          border-left: 3px solid hsl(var(--primary) / 0.5);
          padding-left: 0.75rem;
          color: hsl(var(--muted-foreground));
          margin: 0.5rem 0;
        }
        .quill-comment .ql-editor pre.ql-syntax {
          background: hsl(var(--secondary));
          border-radius: 0.375rem;
          color: hsl(var(--foreground));
          padding: 0.75rem;
          overflow-x: auto;
        }
        .quill-comment .ql-editor code {
          background: hsl(var(--secondary));
          border-radius: 0.2rem;
          color: hsl(var(--foreground));
          padding: 0.1rem 0.3rem;
          font-size: 0.85em;
        }
        .quill-comment .ql-editor a { color: hsl(var(--primary)); }
        .quill-comment .ql-toolbar .ql-stroke { stroke: hsl(var(--muted-foreground)); transition: stroke 0.15s; }
        .quill-comment .ql-toolbar .ql-fill   { fill:   hsl(var(--muted-foreground)); transition: fill   0.15s; }
        .quill-comment .ql-toolbar button:hover .ql-stroke,
        .quill-comment .ql-toolbar button.ql-active .ql-stroke { stroke: hsl(var(--primary)); }
        .quill-comment .ql-toolbar button:hover .ql-fill,
        .quill-comment .ql-toolbar button.ql-active .ql-fill   { fill:   hsl(var(--primary)); }
        .quill-comment .ql-toolbar button {
          border-radius: 4px;
          padding: 3px 5px;
          transition: background 0.15s;
        }
        .quill-comment .ql-toolbar button:hover  { background: hsl(var(--secondary)); }
        .quill-comment .ql-toolbar button.ql-active {
          background: hsl(var(--primary) / 0.15);
          color: hsl(var(--primary));
        }
        .quill-comment .ql-toolbar .ql-picker-label {
          color: hsl(var(--muted-foreground));
          border-color: hsl(var(--border));
          background: transparent;
        }
        .quill-comment .ql-toolbar .ql-picker-label:hover { color: hsl(var(--foreground)); }
        .quill-comment .ql-toolbar .ql-picker-label .ql-stroke { stroke: hsl(var(--muted-foreground)); }
        .quill-comment .ql-snow .ql-picker-options {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          z-index: 9999;
        }
        .quill-comment .ql-snow .ql-picker-item { color: hsl(var(--foreground)); }
        .quill-comment .ql-snow .ql-picker-item:hover,
        .quill-comment .ql-snow .ql-picker-item.ql-selected { color: hsl(var(--primary)); }
        .quill-comment .ql-snow .ql-tooltip { display: none !important; }
        .quill-comment .ql-snow .ql-color-picker .ql-picker-options {
          padding: 4px;
          width: 164px;
        }
        .quill-comment .ql-snow .ql-color-picker .ql-picker-item {
          border: 1px solid transparent;
          border-radius: 2px;
        }
        .quill-comment .ql-snow .ql-color-picker .ql-picker-item:hover {
          border-color: hsl(var(--foreground));
        }
        .quill-comment .ql-snow.ql-toolbar .ql-formats { margin-right: 6px; }
      `}</style>

      <div ref={containerRef} />

      {linkPopover && (
        <div ref={popoverRef} className="flex items-center gap-2 px-3 py-2 border-t border-border bg-secondary/30">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Link URL:</span>
          <Input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyLink();
              if (e.key === "Escape") cancelLink();
            }}
            className="h-7 text-sm bg-background border-border flex-1"
            placeholder="https://"
          />
          <Button size="sm" className="h-7 px-3 text-xs" onClick={applyLink}>
            Apply
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancelLink}>
            Cancel
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-secondary/20">
        <span className="text-xs text-muted-foreground">{charCount} chars</span>
        <Button size="sm" onClick={handleSubmit} disabled={disabled || isEmpty}>
          Post Comment
        </Button>
      </div>
    </div>
  );
};

export default RichTextComment;
