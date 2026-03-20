import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { EditableFieldToggle } from './EditableFieldToggle';
import { ImageUploadInput } from '@/components/partner-page/ImageUploadInput';
import { InnerElementsList } from './InnerElementsList';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const TestimonialsSectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const cards: any[] = config.cards || [];
  const editableFields: string[] = config.editable_fields || [];
  const setEditable = (fields: string[]) => update('editable_fields', fields);

  const updateCard = (i: number, field: string, value: string) => {
    const n = [...cards];
    n[i] = { ...n[i], [field]: value };
    update('cards', n);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <Label>Nagłówek</Label>
          <EditableFieldToggle fieldName="heading" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Input value={config.heading || ''} onChange={e => update('heading', e.target.value)} />
      </div>
      <Label>Karty opinii</Label>
      {cards.map((card, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Karta {i + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => update('cards', cards.filter((_, j) => j !== i))}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
          <Input value={card.label || ''} onChange={e => updateCard(i, 'label', e.target.value)} placeholder="Etykieta (np. Wsparcie serca)" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={card.before || ''} onChange={e => updateCard(i, 'before', e.target.value)} placeholder="PRZED (np. 15:1)" />
            <Input value={card.after || ''} onChange={e => updateCard(i, 'after', e.target.value)} placeholder="PO (np. 3:1)" />
          </div>
          <Input value={card.description || ''} onChange={e => updateCard(i, 'description', e.target.value)} placeholder="Opis" />
          <ImageUploadInput value={card.image || ''} onChange={v => updateCard(i, 'image', v)} compact />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => update('cards', [...cards, { label: '', before: '', after: '', description: '' }])}>
        <Plus className="w-4 h-4 mr-1" /> Dodaj kartę
      </Button>

      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Dodatkowe elementy</legend>
        <InnerElementsList elements={config.inner_elements || []} onChange={(els) => update('inner_elements', els)} />
      </fieldset>
    </div>
  );
};
