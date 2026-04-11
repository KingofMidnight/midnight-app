import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  bucket: string;
  folder?: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
}

const ImageUpload = ({ bucket, folder = "", value, onChange, label = "Image", accept = "image/*" }: ImageUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${folder ? folder + "/" : ""}${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(urlData.publicUrl);
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">{label}</label>
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Paste URL or upload"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-background border-border flex-1"
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {value && (
        <img src={value} alt="Preview" className="h-20 w-20 object-cover rounded-md border border-border" />
      )}
    </div>
  );
};

export default ImageUpload;

