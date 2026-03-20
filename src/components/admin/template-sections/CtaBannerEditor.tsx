import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ColorInput } from '@/components/ui/color-input';
import { EditableFieldToggle } from './EditableFieldToggle';
import { InnerElementsList } from './InnerElementsList';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const CtaBannerEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const editableFields: string[] = config.editable_fields || [];
  const setEditable = (fields: string[]) => update('editable_fields', fields);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <Label>Nagłówek</Label>
          <EditableFieldToggle fieldName="heading" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Textarea value={config.heading || ''} onChange={e => update('heading', e.target.value)} rows={1} className="min-h-[36px] resize-y" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Opis</Label>
          <EditableFieldToggle fieldName="description" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Textarea value={config.description || ''} onChange={e => update('description', e.target.value)} rows={2} />
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
      <ColorInput label="Kolor tła" value={config.bg_color || '#0f172a'} onChange={v => update('bg_color', v)} />

      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Dodatkowe elementy</legend>
        <InnerElementsList elements={config.inner_elements || []} onChange={(els) => update('inner_elements', els)} />
      </fieldset>
    </div>
  );
};
