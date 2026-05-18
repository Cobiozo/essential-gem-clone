import React from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { NewsHubTextStyle } from '@/types/newsHub';

interface Props {
  label: string;
  value: NewsHubTextStyle | undefined;
  onChange: (v: NewsHubTextStyle) => void;
  defaultSize: number;
  withWeight?: boolean;
}

const weights = [400, 500, 600, 700, 800, 900];

export const TextStyleControls: React.FC<Props> = ({ label, value, onChange, defaultSize, withWeight }) => {
  const v = value || {};
  const set = (patch: Partial<NewsHubTextStyle>) => onChange({ ...v, ...patch });
  const size = v.size ?? defaultSize;

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Rozmiar</Label>
          <span className="text-xs text-muted-foreground">{size}px</span>
        </div>
        <Slider min={10} max={96} step={1} value={[size]} onValueChange={([n]) => set({ size: n })} />
      </div>

      {withWeight && (
        <div>
          <Label className="text-xs mb-1 block">Waga</Label>
          <div className="flex gap-1">
            {weights.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => set({ weight: w })}
                className={cn(
                  'flex-1 rounded px-1.5 py-1 text-xs border transition',
                  (v.weight || 700) === w ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50',
                )}
                style={{ fontWeight: w }}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 items-end">
        <div>
          <Label className="text-xs mb-1 block">Kolor</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={v.color || '#ffffff'}
              onChange={(e) => set({ color: e.target.value })}
              className="h-9 w-12 rounded border border-border bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={v.color || ''}
              placeholder="auto"
              onChange={(e) => set({ color: e.target.value || undefined })}
              className="flex-1 h-9 rounded border border-border bg-background px-2 text-xs"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs mb-1 block">Wyrównanie</Label>
          <div className="flex gap-1">
            {(['left', 'center', 'right'] as const).map((a) => {
              const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => set({ align: a })}
                  className={cn(
                    'flex-1 h-9 inline-flex items-center justify-center rounded border transition',
                    (v.align || 'left') === a ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
