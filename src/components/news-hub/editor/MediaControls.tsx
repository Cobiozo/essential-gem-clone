import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadNewsHubFile } from '@/hooks/useNewsHub';
import type { NewsHubPost } from '@/types/newsHub';

interface Props {
  draft: Partial<NewsHubPost>;
  update: (patch: Partial<NewsHubPost>) => void;
}

export const MediaControls: React.FC<Props> = ({ draft, update }) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const galleryText = Array.isArray(draft.media_metadata?.gallery) ? draft.media_metadata!.gallery.join('\n') : '';

  const upload = async (file: File, folder: 'covers' | 'media' | 'files', field: 'media_url' | 'file_url') => {
    setUploading(field);
    const url = await uploadNewsHubFile(file, folder);
    if (url) {
      const patch: any = { [field]: url };
      if (field === 'file_url') { patch.file_name = file.name; patch.file_size = file.size; }
      update(patch);
      toast.success('Wgrano');
    } else toast.error('Błąd uploadu');
    setUploading(null);
  };

  if (draft.type === 'video') {
    return (
      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wideo</div>
        <div>
          <Label className="text-xs">URL (YouTube / Vimeo / MP4)</Label>
          <Input value={draft.media_url || ''} onChange={(e) => update({ media_url: e.target.value || null })} placeholder="https://youtube.com/..." className="h-9 text-xs" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 py-2 text-sm hover:bg-muted">
          {uploading === 'media_url' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>Lub wgraj MP4</span>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, 'media', 'media_url'); }} />
        </label>
      </div>
    );
  }

  if (draft.type === 'gallery') {
    return (
      <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Galeria</div>
        <Label className="text-xs">Adresy URL zdjęć (po jednym w linii)</Label>
        <Textarea
          value={galleryText}
          onChange={(e) => update({ media_metadata: { ...(draft.media_metadata || {}), gallery: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) } })}
          rows={6}
          className="text-xs font-mono"
        />
      </div>
    );
  }

  if (draft.type === 'file') {
    return (
      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plik do pobrania</div>
        {draft.file_url && (
          <div className="flex items-center gap-2 text-xs">
            <span className="flex-1 truncate text-muted-foreground">{draft.file_name || draft.file_url}</span>
            <button onClick={() => update({ file_url: null, file_name: null, file_size: null })} className="text-destructive"><X className="h-4 w-4" /></button>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 py-2 text-sm hover:bg-muted">
          {uploading === 'file_url' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>Wgraj plik</span>
          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, 'files', 'file_url'); }} />
        </label>
      </div>
    );
  }

  if (draft.type === 'link') {
    return (
      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Link</div>
        <div>
          <Label className="text-xs">URL</Label>
          <Input value={draft.link_url || ''} onChange={(e) => update({ link_url: e.target.value || null })} placeholder="https://..." className="h-9 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Tekst przycisku</Label>
          <Input value={draft.link_cta || ''} onChange={(e) => update({ link_cta: e.target.value })} placeholder="Dowiedz się więcej" className="h-9 text-xs" />
        </div>
      </div>
    );
  }

  if (draft.type === 'embed') {
    return (
      <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Embed</div>
        <Label className="text-xs">Kod HTML / iframe</Label>
        <Textarea value={draft.embed_html || ''} onChange={(e) => update({ embed_html: e.target.value || null })} rows={6} className="text-xs font-mono" />
      </div>
    );
  }

  return null;
};
