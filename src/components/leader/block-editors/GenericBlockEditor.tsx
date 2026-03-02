import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LandingBlockType } from '@/types/leaderLanding';

interface Props {
  data: Record<string, any>;
  onChange: (data: any) => void;
  blockType: LandingBlockType;
}

// Simple key-value editor for blocks without a dedicated editor
export const GenericBlockEditor: React.FC<Props> = ({ data, onChange, blockType }) => {
  const update = (key: string, value: any) => onChange({ ...data, [key]: value });

  const fields = Object.entries(data).filter(([_, v]) => typeof v === 'string' || typeof v === 'number');

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Edycja: {blockType}</h4>
      {fields.map(([key, value]) => (
        <div key={key}>
          <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
          <Input value={String(value)} onChange={e => update(key, e.target.value)} />
        </div>
      ))}
      {fields.length === 0 && <p className="text-sm text-muted-foreground">Brak konfigurowalnych pól.</p>}
    </div>
  );
};
