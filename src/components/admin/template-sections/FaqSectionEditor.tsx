import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { EditableFieldToggle } from './EditableFieldToggle';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const FaqSectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const items: any[] = config.items || [];
  const editableFields: string[] = config.editable_fields || [];
  const setEditable = (fields: string[]) => update('editable_fields', fields);

  const updateItem = (i: number, field: string, value: string) => {
    const n = [...items];
    n[i] = { ...n[i], [field]: value };
    update('items', n);
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
      <Label>Pytania</Label>
      {items.map((item, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Pytanie {i + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => update('items', items.filter((_, j) => j !== i))}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
          <Input value={item.question || ''} onChange={e => updateItem(i, 'question', e.target.value)} placeholder="Pytanie" />
          <Textarea value={item.answer || ''} onChange={e => updateItem(i, 'answer', e.target.value)} placeholder="Odpowiedź" rows={2} />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => update('items', [...items, { question: '', answer: '' }])}>
        <Plus className="w-4 h-4 mr-1" /> Dodaj pytanie
      </Button>
    </div>
  );
};
