import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import type { EvidenceFile } from "@/types/challenge";

interface Props {
  userId: string;
  taskId: string;
  files: EvidenceFile[];
  onChange: (files: EvidenceFile[]) => void;
  maxFiles?: number;
  allowedMimes?: string[];
  disabled?: boolean;
}

const DEFAULT_MIMES = [
  "image/png", "image/jpeg", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const EvidenceUploader = ({ userId, taskId, files, onChange, maxFiles = 5, allowedMimes, disabled }: Props) => {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const accept = (allowedMimes && allowedMimes.length ? allowedMimes : DEFAULT_MIMES).join(",");

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    if (!list.length) return;
    if (files.length + list.length > maxFiles) {
      toast.error(`Maksymalnie ${maxFiles} plików`);
      return;
    }
    setBusy(true);
    const uploaded: EvidenceFile[] = [];
    try {
      for (const f of list) {
        if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: max 10 MB`); continue; }
        const ext = f.name.split(".").pop() || "bin";
        const path = `${userId}/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("challenge-evidence").upload(path, f, {
          contentType: f.type,
          upsert: false,
        });
        if (error) {
          if (/Bucket not found/i.test(error.message)) {
            toast.error("Bucket 'challenge-evidence' nie istnieje — utwórz go w Supabase Storage (prywatny).");
          } else {
            toast.error(`${f.name}: ${error.message}`);
          }
          continue;
        }
        const { data: signed } = await supabase.storage.from("challenge-evidence").createSignedUrl(path, 60 * 60 * 24 * 7);
        uploaded.push({
          path, url: signed?.signedUrl ?? "", name: f.name, mime: f.type, size: f.size,
          uploaded_at: new Date().toISOString(),
        });
      }
      if (uploaded.length) {
        onChange([...files, ...uploaded]);
        toast.success(`Dodano ${uploaded.length} plik(ów)`);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeFile = async (idx: number) => {
    const f = files[idx];
    try { await supabase.storage.from("challenge-evidence").remove([f.path]); } catch {/* noop */}
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={handleSelect} disabled={disabled || busy} />
      <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled || busy || files.length >= maxFiles}>
        {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
        Dodaj dowód ({files.length}/{maxFiles})
      </Button>
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={f.path} className="flex items-center gap-2 text-xs rounded-md border bg-muted/40 px-2 py-1.5">
              {f.mime.startsWith("image/") ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              <a href={f.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline">{f.name}</a>
              <span className="text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
              {!disabled && (
                <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
