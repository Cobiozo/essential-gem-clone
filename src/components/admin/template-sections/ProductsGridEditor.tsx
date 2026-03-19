import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { EditableFieldToggle } from './EditableFieldToggle';
import { ColorInput } from '@/components/ui/color-input';
import { ImageUploadInput } from '@/components/partner-page/ImageUploadInput';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const ProductsGridEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const columns: any[] = Array.isArray(config.columns) ? config.columns : [];
  const editableFields: string[] = config.editable_fields || [];
  const setEditable = (fields: string[]) => update('editable_fields', fields);

  const updateCol = (i: number, field: string, value: string) => {
    const n = [...columns];
    n[i] = { ...n[i], [field]: value };
    update('columns', n);
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
      <ColorInput label="Kolor CTA" value={config.cta_bg_color || '#2d6a4f'} onChange={v => update('cta_bg_color', v)} />
      <Label>Produkty</Label>
      {columns.map((col, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Produkt {i + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => update('columns', columns.filter((_, j) => j !== i))}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
          <Input value={col.name || ''} onChange={e => updateCol(i, 'name', e.target.value)} placeholder="Nazwa" />
          <Input value={col.subtitle || ''} onChange={e => updateCol(i, 'subtitle', e.target.value)} placeholder="Podtytuł" />
          <Input value={col.description || ''} onChange={e => updateCol(i, 'description', e.target.value)} placeholder="Opis" />
          <Input value={col.image_url || ''} onChange={e => updateCol(i, 'image_url', e.target.value)} placeholder="URL obrazu" />
          <Textarea value={col.specs || ''} onChange={e => updateCol(i, 'specs', e.target.value)} placeholder="Specyfikacja / skład" rows={2} />
          <Input value={col.cta_text || ''} onChange={e => updateCol(i, 'cta_text', e.target.value)} placeholder="Tekst CTA (np. Zobacz szczegóły)" />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => update('columns', [...columns, { name: '', subtitle: '', description: '', image_url: '', specs: '', cta_text: 'Zobacz szczegóły' }])}>
        <Plus className="w-4 h-4 mr-1" /> Dodaj produkt
      </Button>
    </div>
  );
};
