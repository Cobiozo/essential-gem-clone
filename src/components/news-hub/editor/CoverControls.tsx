import React, { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { uploadNewsHubFile } from '@/hooks/useNewsHub';
import type { NewsHubCoverStyle } from '@/types/newsHub';

interface Props {
  coverUrl: string | null;
  onCoverUrl: (url: string | null) => void;
  style: NewsHubCoverStyle | undefined;
  onStyle: (s: NewsHubCoverStyle) => void;
}

const positions = [
  'top left', 'top', 'top right',
  'left', 'center', 'right',
  'bottom left', 'bottom', 'bottom right',
];

export const CoverControls: React.FC<Props> = ({ coverUrl, onCoverUrl, style, onStyle }) => {
  const [uploading, setUploading] = useState(false);
  const s = style || {};
  const set = (patch: Partial<NewsHubCoverStyle>) => onStyle({ ...s, ...patch });

  const handleUpload = async (file: File) => {
    setUploading(true);
    const url = await uploadNewsHubFile(file, 'covers');
    if (url) { onCoverUrl(url); toast.success('Wgrano okładkę'); }
    else toast.error('Błąd uploadu');
    setUploading(false);
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Okładka</div>

      {coverUrl && (
        <div className="flex items-center gap-2 text-xs">
          <img src={coverUrl} alt="" className="h-12 w-20 rounded object-cover" />
          <span className="truncate flex-1 text-muted-foreground">{coverUrl.split('/').pop()}</span>
          <button onClick={() => onCoverUrl(null)} className="text-destructive"><X className="h-4 w-4" /></button>
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 py-2 text-sm hover:bg-muted">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        <span>Wgraj okładkę</span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
      </label>

      <div>
        <Label className="text-xs mb-1 block">URL okładki</Label>
        <Input value={coverUrl || ''} onChange={(e) => onCoverUrl(e.target.value || null)} placeholder="https://..." className="h-9 text-xs" />
      </div>

      <div>
        <Label className="text-xs mb-1 block">Dopasowanie</Label>
        <div className="flex gap-1">
          {(['cover', 'contain', 'fill'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => set({ fit: f })}
              className={cn(
                'flex-1 rounded px-2 py-1 text-xs border transition capitalize',
                (s.fit || 'cover') === f ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Wysokość</Label>
          <span className="text-xs text-muted-foreground">{s.height ?? 420}px</span>
        </div>
        <Slider min={150} max={800} step={10} value={[s.height ?? 420]} onValueChange={([n]) => set({ height: n })} />
      </div>

      <div>
        <Label className="text-xs mb-1 block">Pozycja obrazka</Label>
        <div className="grid grid-cols-3 gap-1">
          {positions.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set({ position: p })}
              className={cn(
                'h-8 rounded border transition text-[10px]',
                (s.position || 'center') === p ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50',
              )}
              title={p}
            >
              ·
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 items-end">
        <div>
          <Label className="text-xs mb-1 block">Nakładka</Label>
          <input
            type="color"
            value={s.overlay || '#000000'}
            onChange={(e) => set({ overlay: e.target.value })}
            className="h-9 w-full rounded border border-border bg-transparent cursor-pointer"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">Krycie</Label>
            <span className="text-xs text-muted-foreground">{Math.round((s.overlayOpacity ?? 0) * 100)}%</span>
          </div>
          <Slider min={0} max={100} step={1} value={[Math.round((s.overlayOpacity ?? 0) * 100)]} onValueChange={([n]) => set({ overlayOpacity: n / 100 })} />
        </div>
      </div>
    </div>
  );
};
