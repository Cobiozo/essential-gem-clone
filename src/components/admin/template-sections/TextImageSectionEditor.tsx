import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorInput } from '@/components/ui/color-input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { EditableFieldToggle } from './EditableFieldToggle';
import { ImageUploadInput } from '@/components/partner-page/ImageUploadInput';

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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <Label>Nazwa partnera</Label>
            <EditableFieldToggle fieldName="partner_name" editableFields={editableFields} onToggle={setEditable} />
          </div>
          <Input value={config.partner_name || ''} onChange={e => update('partner_name', e.target.value)} placeholder="Imię i nazwisko" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Podtytuł partnera</Label>
            <EditableFieldToggle fieldName="partner_subtitle" editableFields={editableFields} onToggle={setEditable} />
          </div>
          <Input value={config.partner_subtitle || ''} onChange={e => update('partner_subtitle', e.target.value)} placeholder="Twój partner w Pure Life" />
        </div>
      </div>
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
          <Input value={item.icon || ''} onChange={e => updateItem(i, 'icon', e.target.value)} placeholder="Ikona (✔️)" className="w-16" />
          <Input value={item.text || ''} onChange={e => updateItem(i, 'text', e.target.value)} placeholder="Tekst" className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => update('items', items.filter((_, j) => j !== i))}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => update('items', [...items, { icon: '✔️', text: '' }])}>
        <Plus className="w-4 h-4 mr-1" /> Dodaj element
      </Button>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>URL obrazu</Label>
          <ImageUploadInput value={config.image_url || ''} onChange={v => update('image_url', v)} />
        </div>
        <div>
          <Label>URL wideo</Label>
          <Input value={config.video_url || ''} onChange={e => update('video_url', e.target.value)} />
        </div>
      </div>
      <div>
        <Label>URL obrazu tła sekcji</Label>
        <Input value={config.bg_image_url || ''} onChange={e => update('bg_image_url', e.target.value)} placeholder="https://..." />
      </div>
      <div>
        <Label>Strona obrazu</Label>
        <select className="w-full border rounded-md px-3 py-2 text-sm" value={config.image_side || 'right'} onChange={e => update('image_side', e.target.value)}>
          <option value="right">Prawa</option>
          <option value="left">Lewa</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ColorInput label="Kolor ikon checkmark" value={config.item_icon_color || '#2d6a4f'} onChange={v => update('item_icon_color', v)} />
        <ColorInput label="Kolor CTA" value={config.cta_bg_color || '#2d6a4f'} onChange={v => update('cta_bg_color', v)} />
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
      <div className="grid grid-cols-2 gap-4">
        <ColorInput label="Kolor tła" value={config.bg_color || ''} onChange={v => update('bg_color', v)} />
        <ColorInput label="Kolor tekstu (opcja)" value={config.text_color || ''} onChange={v => update('text_color', v)} />
      </div>
      <div>
        <Label>Przezroczystość tła (0-1)</Label>
        <Input type="number" step="0.1" min="0" max="1" value={config.overlay_opacity ?? 0.15} onChange={e => update('overlay_opacity', parseFloat(e.target.value))} />
      </div>
    </div>
  );
};
