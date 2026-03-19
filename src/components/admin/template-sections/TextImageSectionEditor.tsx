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

export const TextImageSectionEditor: React.FC<Props> = ({ config, onChange }) => {
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
      <Label>Elementy listy</Label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center border rounded-lg p-2">
          <Input value={item.icon || ''} onChange={e => updateItem(i, 'icon', e.target.value)} placeholder="Ikona" className="w-16" />
          <Input value={item.text || ''} onChange={e => updateItem(i, 'text', e.target.value)} placeholder="Tekst" className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => update('items', items.filter((_, j) => j !== i))}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => update('items', [...items, { icon: '❌', text: '' }])}>
        <Plus className="w-4 h-4 mr-1" /> Dodaj element
      </Button>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>URL obrazu</Label>
          <Input value={config.image_url || ''} onChange={e => update('image_url', e.target.value)} />
        </div>
        <div>
          <Label>URL wideo</Label>
          <Input value={config.video_url || ''} onChange={e => update('video_url', e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Strona obrazu</Label>
        <select className="w-full border rounded-md px-3 py-2 text-sm" value={config.image_side || 'right'} onChange={e => update('image_side', e.target.value)}>
          <option value="right">Prawa</option>
          <option value="left">Lewa</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <Label>Tekst wyróżnienia</Label>
            <EditableFieldToggle fieldName="highlight_text" editableFields={editableFields} onToggle={setEditable} />
          </div>
          <Input value={config.highlight_text || ''} onChange={e => update('highlight_text', e.target.value)} placeholder="np. 9 na 10 osób" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Opis wyróżnienia</Label>
            <EditableFieldToggle fieldName="highlight_description" editableFields={editableFields} onToggle={setEditable} />
          </div>
          <Input value={config.highlight_description || ''} onChange={e => update('highlight_description', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <Label>Tekst CTA</Label>
            <EditableFieldToggle fieldName="cta_text" editableFields={editableFields} onToggle={setEditable} />
          </div>
          <Input value={config.cta_text || ''} onChange={e => update('cta_text', e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>URL CTA</Label>
            <EditableFieldToggle fieldName="cta_url" editableFields={editableFields} onToggle={setEditable} />
          </div>
          <Input value={config.cta_url || ''} onChange={e => update('cta_url', e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Kolor tła</Label>
        <Input value={config.bg_color || ''} onChange={e => update('bg_color', e.target.value)} />
      </div>
    </div>
  );
};
