import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export interface EventFormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select
}

interface Props {
  fields: EventFormField[];
  onChange: (fields: EventFormField[]) => void;
}

const FIELD_TYPES: Array<{ value: EventFormField['type']; label: string }> = [
  { value: 'text', label: 'Tekst' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Telefon' },
  { value: 'textarea', label: 'Tekst wieloliniowy' },
  { value: 'number', label: 'Liczba' },
  { value: 'select', label: 'Lista wyboru' },
  { value: 'checkbox', label: 'Pole zgody (checkbox)' },
];

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

export const FieldsBuilder: React.FC<Props> = ({ fields, onChange }) => {
  const addField = () => {
    const idx = fields.length + 1;
    onChange([
      ...fields,
      { key: `field_${idx}`, label: `Pole ${idx}`, type: 'text', required: false, placeholder: '' },
    ]);
  };

  const updateField = (i: number, patch: Partial<EventFormField>) => {
    const next = [...fields];
    next[i] = { ...next[i], ...patch };
    if (patch.label && !patch.key) {
      next[i].key = slugify(patch.label) || next[i].key;
    }
    onChange(next);
  };

  const removeField = (i: number) => {
    onChange(fields.filter((_, idx) => idx !== i));
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Pola formularza</Label>
        <Button type="button" size="sm" variant="outline" onClick={addField}>
          <Plus className="w-4 h-4 mr-1" /> Dodaj pole
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Brak pól. Imię, nazwisko, email i telefon są dodawane automatycznie.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((f, i) => (
          <div key={i} className="border rounded-lg p-3 bg-muted/30 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-1 pt-2">
                <button type="button" onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground text-xs">▲</button>
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <button type="button" onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground text-xs">▼</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                <div>
                  <Label className="text-xs">Etykieta</Label>
                  <Input value={f.label} onChange={e => updateField(i, { label: e.target.value, key: slugify(e.target.value) || f.key })} />
                </div>
                <div>
                  <Label className="text-xs">Klucz (techniczny)</Label>
                  <Input value={f.key} onChange={e => updateField(i, { key: slugify(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Typ</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={f.type}
                    onChange={e => updateField(i, { type: e.target.value as EventFormField['type'] })}
                  >
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Placeholder / opis</Label>
                  <Input value={f.placeholder || ''} onChange={e => updateField(i, { placeholder: e.target.value })} />
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <div className="flex items-center gap-2">
                    <Switch checked={f.required} onCheckedChange={c => updateField(i, { required: c })} />
                    <Label className="text-xs">Wymagane</Label>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeField(i)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                {f.type === 'select' && (
                  <div className="md:col-span-3">
                    <Label className="text-xs">Opcje (po przecinku)</Label>
                    <Input
                      value={(f.options || []).join(', ')}
                      onChange={e => updateField(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="Opcja 1, Opcja 2, Opcja 3"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
