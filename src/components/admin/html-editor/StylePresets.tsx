import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PresetOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface StylePresetsProps {
  label: string;
  options: PresetOption[];
  currentValue: string | undefined;
  onSelect: (value: string) => void;
  columns?: number;
}

export const StylePresets: React.FC<StylePresetsProps> = ({
  label,
  options,
  currentValue,
  onSelect,
  columns = 4
}) => {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className={cn("grid gap-1", `grid-cols-${columns}`)}>
        {options.map((option) => (
          <Button
            key={option.value}
            variant={currentValue === option.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => onSelect(option.value)}
          >
            {option.icon}
            <span className={option.icon ? 'ml-1' : ''}>{option.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

// Common presets for reuse
export const borderRadiusPresets: PresetOption[] = [
  { label: 'Brak', value: '0' },
  { label: 'S', value: '4px' },
  { label: 'M', value: '8px' },
  { label: 'L', value: '16px' },
  { label: 'XL', value: '24px' },
  { label: '●', value: '9999px' },
];

export const boxShadowPresets: PresetOption[] = [
  { label: 'Brak', value: 'none' },
  { label: 'Mały', value: '0 1px 3px rgba(0,0,0,0.12)' },
  { label: 'Średni', value: '0 4px 6px rgba(0,0,0,0.1)' },
  { label: 'Duży', value: '0 10px 25px rgba(0,0,0,0.15)' },
  { label: 'XL', value: '0 20px 40px rgba(0,0,0,0.2)' },
];

export const opacityPresets: PresetOption[] = [
  { label: '100%', value: '1' },
  { label: '75%', value: '0.75' },
  { label: '50%', value: '0.5' },
  { label: '25%', value: '0.25' },
];

export const fontWeightPresets: PresetOption[] = [
  { label: 'Lekki', value: '300' },
  { label: 'Normalny', value: '400' },
  { label: 'Średni', value: '500' },
  { label: 'Gruby', value: '600' },
  { label: 'B. gruby', value: '700' },
];

export const textAlignPresets: PresetOption[] = [
  { label: '←', value: 'left' },
  { label: '↔', value: 'center' },
  { label: '→', value: 'right' },
  { label: '⇔', value: 'justify' },
];

export const gapPresets: PresetOption[] = [
  { label: '0', value: '0' },
  { label: 'S', value: '0.5rem' },
  { label: 'M', value: '1rem' },
  { label: 'L', value: '1.5rem' },
  { label: 'XL', value: '2rem' },
];
