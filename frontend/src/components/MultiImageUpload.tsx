import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IMAGE_ACCEPT, validateImageUpload, imageExtension } from "@/lib/uploads";

interface MultiImageUploadProps {
  bucket: string;
  folder?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
}

const MultiImageUpload = ({ bucket, folder = "", value, onChange, label = "Pages" }: MultiImageUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      const problem = await validateImageUpload(file, bucket);
      if (problem) {
        toast({ title: "Skipped a file", description: problem, variant: "destructive" });
        continue;
      }
      const path = `${folder ? folder + "/" : ""}${crypto.randomUUID()}.${imageExtension(file)}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    onChange([...value, ...newUrls]);
    setUploading(false);
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const arr = [...value];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onChange(arr);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm text-muted-foreground">{label} ({value.length})</label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="gap-1.5"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload Images
          </Button>
        </div>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {value.map((url, i) => (
            <div key={i} className="relative group rounded-md border border-border overflow-hidden bg-secondary">
              <img src={url} alt={`Page ${i + 1}`} className="w-full aspect-[2/3] object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <span className="text-xs text-white font-medium">#{i + 1}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white" onClick={() => moveImage(i, i - 1)} disabled={i === 0}>
                  <GripVertical className="h-3 w-3 rotate-90" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white" onClick={() => removeImage(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
        className="w-full min-h-[80px] p-3 rounded-md bg-background border border-border text-sm text-foreground resize-y"
        placeholder="Or paste image URLs (one per line)"
      />
    </div>
  );
};

export default MultiImageUpload;

