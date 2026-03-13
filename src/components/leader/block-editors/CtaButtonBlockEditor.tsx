import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CtaButtonBlockData } from '@/types/leaderLanding';

interface Props {
  data: CtaButtonBlockData;
  onChange: (data: CtaButtonBlockData) => void;
}

export const CtaButtonBlockEditor: React.FC<Props> = ({ data, onChange }) => {
  const update = (partial: Partial<CtaButtonBlockData>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Edycja Przycisku CTA</h4>
      <div><Label>Tekst przycisku</Label><Input value={data.text || ''} onChange={e => update({ text: e.target.value })} /></div>
      <div><Label>Link</Label><Input value={data.link || ''} onChange={e => update({ link: e.target.value })} /></div>
      <div>
        <Label>Wariant</Label>
        <Select value={data.variant || 'primary'} onValueChange={v => update({ variant: v as CtaButtonBlockData['variant'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Główny (primary)</SelectItem>
            <SelectItem value="secondary">Drugorzędny (secondary)</SelectItem>
            <SelectItem value="outline">Obramowanie (outline)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
