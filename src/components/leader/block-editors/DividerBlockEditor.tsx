import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DividerBlockData } from '@/types/leaderLanding';

interface Props {
  data: DividerBlockData;
  onChange: (data: DividerBlockData) => void;
}

export const DividerBlockEditor: React.FC<Props> = ({ data, onChange }) => (
  <div className="space-y-3">
    <h4 className="font-semibold">Edycja Separatora</h4>
    <div>
      <Label>Styl</Label>
      <Select value={data.style || 'line'} onValueChange={v => onChange({ ...data, style: v as DividerBlockData['style'] })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="line">Linia</SelectItem>
          <SelectItem value="space">Odstęp</SelectItem>
          <SelectItem value="dots">Kropki</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);
