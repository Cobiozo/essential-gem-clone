import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export const ColorInput: React.FC<ColorInputProps> = ({ value, onChange, label }) => {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-md border border-input cursor-pointer p-0.5 bg-background"
        />
        <Input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1"
        />
      </div>
    </div>
  );
};
