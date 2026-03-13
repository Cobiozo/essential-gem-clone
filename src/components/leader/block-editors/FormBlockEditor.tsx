import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { FormBlockData } from '@/types/leaderLanding';

interface Props {
  data: FormBlockData;
  onChange: (data: FormBlockData) => void;
}

const FIELD_OPTIONS: { value: FormBlockData['fields'][number]; label: string }[] = [
  { value: 'name', label: 'Imię' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefon' },
  { value: 'message', label: 'Wiadomość' },
];

export const FormBlockEditor: React.FC<Props> = ({ data, onChange }) => {
  const update = (partial: Partial<FormBlockData>) => onChange({ ...data, ...partial });

  const toggleField = (field: FormBlockData['fields'][number]) => {
    const fields = data.fields || [];
    const next = fields.includes(field) ? fields.filter(f => f !== field) : [...fields, field];
    update({ fields: next });
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Edycja Formularza</h4>
      <div><Label>Nagłówek</Label><Input value={data.heading || ''} onChange={e => update({ heading: e.target.value })} /></div>
      <div>
        <Label>Pola formularza</Label>
        <div className="space-y-2 mt-1">
          {FIELD_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={(data.fields || []).includes(opt.value)}
                onCheckedChange={() => toggleField(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
      <div><Label>Tekst przycisku</Label><Input value={data.submit_text || ''} onChange={e => update({ submit_text: e.target.value })} /></div>
    </div>
  );
};
