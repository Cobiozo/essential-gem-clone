import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ColorInput } from '@/components/ui/color-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { EditableFieldToggle } from './EditableFieldToggle';
import { InnerElementsList } from './InnerElementsList';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const ContactFormEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const editableFields: string[] = config.editable_fields || [];
  const setEditable = (fields: string[]) => update('editable_fields', fields);

  const fields: Array<{ label: string; placeholder: string; type: string; required: boolean }> =
    config.fields || [];

  const addField = () =>
    update('fields', [...fields, { label: '', placeholder: '', type: 'text', required: false }]);
  const removeField = (i: number) => update('fields', fields.filter((_, idx) => idx !== i));
  const updateField = (i: number, key: string, value: any) =>
    update('fields', fields.map((f, idx) => (idx === i ? { ...f, [key]: value } : f)));

  return (
    <div className="space-y-4">
      <div>
        <Label>Layout</Label>
        <Select value={config.layout || 'standalone'} onValueChange={v => update('layout', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="standalone">Pełna szerokość</SelectItem>
            <SelectItem value="floating">Floating (ciemna karta)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Nagłówek</Label>
          <EditableFieldToggle fieldName="heading" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Textarea value={config.heading || ''} onChange={e => update('heading', e.target.value)} placeholder="Daj mi znać..." rows={1} className="min-h-[36px] resize-y" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Podtytuł</Label>
          <EditableFieldToggle fieldName="subheading" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Input value={config.subheading || ''} onChange={e => update('subheading', e.target.value)} />
      </div>

      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Pola formularza</legend>
        {fields.map((field, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 items-end">
            <div>
              <Label className="text-xs">Etykieta</Label>
              <Input value={field.label} onChange={e => updateField(i, 'label', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input value={field.placeholder} onChange={e => updateField(i, 'placeholder', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Typ</Label>
              <Select value={field.type} onValueChange={v => updateField(i, 'type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Tekst</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="tel">Telefon</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeField(i)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addField}>
          <Plus className="w-4 h-4 mr-1" /> Dodaj pole
        </Button>
      </fieldset>

      <div>
        <Label>Tekst przycisku</Label>
        <Input value={config.submit_text || ''} onChange={e => update('submit_text', e.target.value)} placeholder="Wyślij" />
      </div>
      <div>
        <Label>Tekst prywatności (opcja)</Label>
        <Input value={config.privacy_text || ''} onChange={e => update('privacy_text', e.target.value)} />
      </div>
      <ColorInput label="Kolor CTA" value={config.cta_bg_color || '#2d6a4f'} onChange={v => update('cta_bg_color', v)} />
      <div className="grid grid-cols-2 gap-4">
        <ColorInput label="Kolor tła" value={config.bg_color || '#f8fafc'} onChange={v => update('bg_color', v)} />
        <ColorInput label="Kolor tekstu" value={config.text_color || ''} onChange={v => update('text_color', v)} />
      </div>

      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Dodatkowe elementy</legend>
        <InnerElementsList elements={config.inner_elements || []} onChange={(els) => update('inner_elements', els)} />
      </fieldset>
    </div>
  );
};
