import React from 'react';
import { Label } from '@/components/ui/label';
import type { TextBlockData } from '@/types/leaderLanding';

interface Props {
  data: TextBlockData;
  onChange: (data: TextBlockData) => void;
}

export const TextBlockEditor: React.FC<Props> = ({ data, onChange }) => (
  <div className="space-y-3">
    <h4 className="font-semibold">Edycja Tekstu</h4>
    <div>
      <Label>Treść (obsługuje Markdown)</Label>
      <textarea
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
        value={data.content || ''}
        onChange={e => onChange({ ...data, content: e.target.value })}
      />
    </div>
  </div>
);
