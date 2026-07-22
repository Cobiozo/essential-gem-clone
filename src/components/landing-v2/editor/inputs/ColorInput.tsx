import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SWATCHES = [
  '#111111', '#333333', '#666666', '#999999', '#FFFFFF',
  '#B8894A', '#D4A574', '#FBF8F3', '#0F172A', '#3B82F6',
  '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899',
];

export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded border cursor-pointer bg-transparent"
        />
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="np. #111 lub rgba(...)"
          className="h-9 text-xs"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            reset
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 pt-1">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="w-5 h-5 rounded border hover:scale-110 transition"
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}
