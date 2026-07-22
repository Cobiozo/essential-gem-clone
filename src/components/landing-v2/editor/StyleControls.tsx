import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorInput } from './inputs/ColorInput';
import type { ElementStyle } from '@/types/homepageV2';

interface Props {
  style: ElementStyle;
  onChange: (patch: Partial<ElementStyle>) => void;
  variant?: 'text' | 'box' | 'icon';
}

export function StyleControls({ style, onChange, variant = 'text' }: Props) {
  return (
    <div className="space-y-3 border-t pt-3 mt-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        Wygląd
      </div>

      {variant === 'text' && (
        <>
          <ColorInput label="Kolor tekstu" value={style.color} onChange={(v) => onChange({ color: v })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Rozmiar (px)</Label>
              <Input
                value={style.fontSize || ''}
                onChange={(e) => onChange({ fontSize: e.target.value })}
                placeholder="np. 48px"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Grubość</Label>
              <select
                value={style.fontWeight || ''}
                onChange={(e) => onChange({ fontWeight: e.target.value })}
                className="w-full h-9 text-xs border rounded px-2 bg-background"
              >
                <option value="">domyślna</option>
                <option value="300">Light 300</option>
                <option value="400">Regular 400</option>
                <option value="500">Medium 500</option>
                <option value="600">Semibold 600</option>
                <option value="700">Bold 700</option>
                <option value="800">Extra 800</option>
                <option value="900">Black 900</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Wyrównanie</Label>
              <select
                value={style.textAlign || ''}
                onChange={(e) => onChange({ textAlign: e.target.value as any })}
                className="w-full h-9 text-xs border rounded px-2 bg-background"
              >
                <option value="">domyślne</option>
                <option value="left">Lewo</option>
                <option value="center">Środek</option>
                <option value="right">Prawo</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Wielkość liter</Label>
              <select
                value={style.textTransform || ''}
                onChange={(e) => onChange({ textTransform: e.target.value as any })}
                className="w-full h-9 text-xs border rounded px-2 bg-background"
              >
                <option value="">domyślnie</option>
                <option value="uppercase">WIELKIE</option>
                <option value="lowercase">małe</option>
                <option value="capitalize">Pierwsza Wielka</option>
                <option value="none">Bez zmiany</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Odstęp liter</Label>
              <Input
                value={style.letterSpacing || ''}
                onChange={(e) => onChange({ letterSpacing: e.target.value })}
                placeholder="np. 0.05em"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Interlinia</Label>
              <Input
                value={style.lineHeight || ''}
                onChange={(e) => onChange({ lineHeight: e.target.value })}
                placeholder="np. 1.2"
                className="h-9 text-xs"
              />
            </div>
          </div>
        </>
      )}

      {variant === 'box' && (
        <>
          <ColorInput label="Kolor tła" value={style.backgroundColor} onChange={(v) => onChange({ backgroundColor: v })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Zaokrąglenie</Label>
              <Input
                value={style.borderRadius || ''}
                onChange={(e) => onChange({ borderRadius: e.target.value })}
                placeholder="np. 16px"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Padding</Label>
              <Input
                value={style.padding || ''}
                onChange={(e) => onChange({ padding: e.target.value })}
                placeholder="np. 24px"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Obramowanie</Label>
              <Input
                value={style.border || ''}
                onChange={(e) => onChange({ border: e.target.value })}
                placeholder="np. 1px solid #eee"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Cień</Label>
              <Input
                value={style.boxShadow || ''}
                onChange={(e) => onChange({ boxShadow: e.target.value })}
                placeholder="np. 0 4px 12px rgba(0,0,0,.1)"
                className="h-9 text-xs"
              />
            </div>
          </div>
        </>
      )}

      {variant === 'icon' && (
        <>
          <ColorInput label="Kolor ikony" value={style.color} onChange={(v) => onChange({ color: v })} />
          <ColorInput label="Kolor tła" value={style.backgroundColor} onChange={(v) => onChange({ backgroundColor: v })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Rozmiar (px)</Label>
              <Input
                value={style.fontSize || ''}
                onChange={(e) => onChange({ fontSize: e.target.value })}
                placeholder="np. 48px"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Zaokrąglenie</Label>
              <Input
                value={style.borderRadius || ''}
                onChange={(e) => onChange({ borderRadius: e.target.value })}
                placeholder="np. 12px"
                className="h-9 text-xs"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
