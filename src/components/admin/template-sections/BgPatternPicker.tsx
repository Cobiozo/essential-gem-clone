import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { BG_PATTERNS, getPatternStyle } from '@/lib/bgPatterns';
import { ColorInput } from '@/components/ui/color-input';

interface Props {
  pattern: string;
  opacity: number;
  color?: string;
  onPatternChange: (pattern: string) => void;
  onOpacityChange: (opacity: number) => void;
  onColorChange?: (color: string) => void;
}

const geometric = BG_PATTERNS.filter((p) => p.category === 'geometric');
const materials = BG_PATTERNS.filter((p) => p.category === 'material');

export const BgPatternPicker: React.FC<Props> = ({
  pattern,
  opacity,
  color,
  onPatternChange,
  onOpacityChange,
  onColorChange,
}) => {
  return (
    <fieldset className="border rounded-lg p-4 space-y-3">
      <legend className="text-sm font-semibold px-2">Wzór / tekstura tła</legend>

      <div>
        <Label className="text-xs">Wzór</Label>
        <Select value={pattern || 'none'} onValueChange={onPatternChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Brak" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="none">Brak</SelectItem>
            <SelectGroup>
              <SelectLabel>Geometryczne</SelectLabel>
              {geometric.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-5 h-5 rounded border border-border flex-shrink-0"
                      style={{
                        backgroundColor: '#e2e8f0',
                        ...getPatternStyle(p.value, 0.4, '#334155'),
                      }}
                    />
                    {p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Materiały</SelectLabel>
              {materials.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-5 h-5 rounded border border-border flex-shrink-0"
                      style={{
                        backgroundColor: '#e2e8f0',
                        ...getPatternStyle(p.value, 0.5, '#334155'),
                      }}
                    />
                    {p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {pattern && pattern !== 'none' && (
        <>
          <div>
            <Label className="text-xs">Intensywność: {Math.round((opacity ?? 0.08) * 100)}%</Label>
            <Slider
              value={[Math.round((opacity ?? 0.08) * 100)]}
              onValueChange={([v]) => onOpacityChange(v / 100)}
              min={1}
              max={50}
              step={1}
            />
          </div>

          {onColorChange && (
            <ColorInput
              label="Kolor wzoru (opcja)"
              value={color || ''}
              onChange={onColorChange}
            />
          )}

          {/* Preview */}
          <div>
            <Label className="text-xs">Podgląd</Label>
            <div
              className="relative h-16 rounded-lg border border-border overflow-hidden"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div
                className="absolute inset-0"
                style={getPatternStyle(pattern, opacity ?? 0.08, color || '#ffffff')}
              />
            </div>
          </div>
        </>
      )}
    </fieldset>
  );
};
