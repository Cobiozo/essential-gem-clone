import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { EditableFieldToggle } from './EditableFieldToggle';
import { ContactFormEditor } from './ContactFormEditor';
import { ColorInput } from '@/components/ui/color-input';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const ProductsWithFormEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const columns: any[] = Array.isArray(config.columns) ? config.columns : [];
  const editableFields: string[] = config.editable_fields || [];
  const setEditable = (fields: string[]) => update('editable_fields', fields);

  const updateCol = (i: number, field: string, value: string) => {
    const n = [...columns];
    n[i] = { ...n[i], [field]: value };
    update('columns', n);
  };

  const formConfig = config.form_config || {};

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <Label>Nagłówek sekcji</Label>
          <EditableFieldToggle fieldName="heading" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Input value={config.heading || ''} onChange={e => update('heading', e.target.value)} />
      </div>
      <div>
        <Label>Kolor CTA (hex)</Label>
        <Input value={config.cta_bg_color || '#2d6a4f'} onChange={e => update('cta_bg_color', e.target.value)} />
      </div>

      <div>
        <Label>Domyślny tekst CTA</Label>
        <Input value={config.default_cta_text || 'Zobacz szczegóły'} onChange={e => update('default_cta_text', e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">Produkty są pobierane automatycznie z katalogu produktów (CMS → Katalog produktów).</p>

      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Formularz kontaktowy (floating)</legend>
        <ContactFormEditor
          config={{ ...formConfig, layout: 'floating' }}
          onChange={(newFormConfig) => update('form_config', newFormConfig)}
        />
      </fieldset>
    </div>
  );
};
