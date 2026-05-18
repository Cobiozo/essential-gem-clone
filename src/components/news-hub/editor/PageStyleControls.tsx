import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { uploadNewsHubFile } from '@/hooks/useNewsHub';
import type { NewsHubPageStyle } from '@/types/newsHub';

interface Props {
  value: NewsHubPageStyle | undefined;
  onChange: (v: NewsHubPageStyle) => void;
}

type Mode = 'none' | 'color' | 'gradient' | 'image';

const detectMode = (bg?: string): Mode => {
  if (!bg) return 'none';
  if (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')) return 'gradient';
  if (bg.startsWith('url(')) return 'image';
  return 'color';
};

export const PageStyleControls: React.FC<Props> = ({ value, onChange }) => {
  const v = value || {};
  const initialMode = detectMode(v.background);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [c1, setC1] = useState('#0f172a');
  const [c2, setC2] = useState('#1e293b');
  const [angle, setAngle] = useState(135);
  const [uploading, setUploading] = useState(false);

  const set = (patch: Partial<NewsHubPageStyle>) => onChange({ ...v, ...patch });

  const applyGradient = (a: number, x: string, y: string) => {
    set({ background: `linear-gradient(${a}deg, ${x}, ${y})` });
  };

  const handleImg = async (file: File) => {
    setUploading(true);
    const url = await uploadNewsHubFile(file, 'covers');
    if (url) { set({ background: `url("${url}") center/cover no-repeat fixed` }); toast.success('Wgrano tło'); }
    else toast.error('Błąd uploadu');
    setUploading(false);
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tło strony postu</div>

      <div className="flex gap-1">
        {(['none', 'color', 'gradient', 'image'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); if (m === 'none') set({ background: undefined }); }}
            className={cn(
              'flex-1 rounded px-1 py-1 text-xs border transition capitalize',
              mode === m ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50',
            )}
          >
            {m === 'none' ? 'brak' : m}
          </button>
        ))}
      </div>

      {mode === 'color' && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={v.background?.startsWith('#') ? v.background : '#0f172a'}
            onChange={(e) => set({ background: e.target.value })}
            className="h-9 w-12 rounded border border-border cursor-pointer"
          />
          <Input value={v.background || ''} onChange={(e) => set({ background: e.target.value || undefined })} placeholder="#000000" className="h-9 text-xs" />
        </div>
      )}

      {mode === 'gradient' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Kolor 1</Label>
              <input type="color" value={c1} onChange={(e) => { setC1(e.target.value); applyGradient(angle, e.target.value, c2); }} className="h-9 w-full rounded border border-border cursor-pointer" />
            </div>
            <div>
              <Label className="text-xs">Kolor 2</Label>
              <input type="color" value={c2} onChange={(e) => { setC2(e.target.value); applyGradient(angle, c1, e.target.value); }} className="h-9 w-full rounded border border-border cursor-pointer" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Kąt</Label>
              <span className="text-xs text-muted-foreground">{angle}°</span>
            </div>
            <Slider min={0} max={360} step={5} value={[angle]} onValueChange={([n]) => { setAngle(n); applyGradient(n, c1, c2); }} />
          </div>
        </div>
      )}

      {mode === 'image' && (
        <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 py-2 text-sm hover:bg-muted">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>Wgraj obraz tła</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImg(f); }} />
        </label>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Szerokość treści</Label>
          <span className="text-xs text-muted-foreground">{v.maxWidth ?? 896}px</span>
        </div>
        <Slider min={560} max={1280} step={16} value={[v.maxWidth ?? 896]} onValueChange={([n]) => set({ maxWidth: n })} />
      </div>
    </div>
  );
};
