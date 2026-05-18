import React from 'react';
import { LayoutGrid, AlignCenter, Columns2, Columns3, Columns4 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NewsHubGridLayout } from '@/hooks/useNewsHubSettings';

interface Props {
  value: NewsHubGridLayout;
  onChange: (v: NewsHubGridLayout) => void;
  className?: string;
}

const OPTIONS: Array<{ value: NewsHubGridLayout; label: string; Icon: any }> = [
  { value: 'bento', label: 'Bento (mieszany)', Icon: LayoutGrid },
  { value: 'centered', label: 'Wycentrowane', Icon: AlignCenter },
  { value: 'cols-2', label: '2 kolumny', Icon: Columns2 },
  { value: 'cols-3', label: '3 kolumny', Icon: Columns3 },
  { value: 'cols-4', label: '4 kolumny', Icon: Columns4 },
];

export const GridLayoutSwitcher: React.FC<Props> = ({ value, onChange, className }) => {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1', className)}>
      {OPTIONS.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => onChange(v)}
          className={cn(
            'rounded-md p-1.5 transition',
            value === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
};
