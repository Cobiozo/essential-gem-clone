import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ColorInput } from '@/components/ui/color-input';
import { EditableFieldToggle } from './EditableFieldToggle';
import { InnerElementsList } from './InnerElementsList';
import { BgPatternPicker } from './BgPatternPicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

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
          <Textarea value={config.cta_text || ''} onChange={e => update('cta_text', e.target.value)} rows={1} className="min-h-[36px] resize-y" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>URL CTA</Label>
            <EditableFieldToggle fieldName="cta_url" editableFields={editableFields} onToggle={setEditable} />
          </div>
          <Input value={config.cta_url || ''} onChange={e => update('cta_url', e.target.value)} />
        </div>
      </div>

      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Styl przycisku CTA</legend>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Kolor tła</Label>
              <EditableFieldToggle fieldName="cta_bg_color" editableFields={editableFields} onToggle={setEditable} />
            </div>
            <ColorInput value={config.cta_bg_color || '#f97316'} onChange={v => update('cta_bg_color', v)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Kolor tekstu</Label>
              <EditableFieldToggle fieldName="cta_text_color" editableFields={editableFields} onToggle={setEditable} />
            </div>
            <ColorInput value={config.cta_text_color || '#ffffff'} onChange={v => update('cta_text_color', v)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Kolor obramowania</Label>
              <EditableFieldToggle fieldName="cta_border_color" editableFields={editableFields} onToggle={setEditable} />
            </div>
            <ColorInput value={config.cta_border_color || ''} onChange={v => update('cta_border_color', v)} />
          </div>
          <div>
            <Label className="text-xs">Grubość obramowania: {config.cta_border_width ?? 0}px</Label>
            <Slider
              value={[config.cta_border_width ?? 0]}
              onValueChange={([v]) => update('cta_border_width', v)}
              min={0} max={4} step={1}
              className="mt-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Zaokrąglenie</Label>
              <EditableFieldToggle fieldName="cta_radius" editableFields={editableFields} onToggle={setEditable} />
            </div>
            <Select value={config.cta_radius || 'xl'} onValueChange={v => update('cta_radius', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Brak</SelectItem>
                <SelectItem value="sm">Małe</SelectItem>
                <SelectItem value="md">Średnie</SelectItem>
                <SelectItem value="lg">Duże</SelectItem>
                <SelectItem value="xl">Bardzo duże</SelectItem>
                <SelectItem value="full">Pełne (pill)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Rozmiar czcionki</Label>
              <EditableFieldToggle fieldName="cta_font_size" editableFields={editableFields} onToggle={setEditable} />
            </div>
            <Select value={config.cta_font_size || 'base'} onValueChange={v => update('cta_font_size', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Mała</SelectItem>
                <SelectItem value="base">Normalna</SelectItem>
                <SelectItem value="lg">Duża</SelectItem>
                <SelectItem value="xl">Bardzo duża</SelectItem>
                <SelectItem value="2xl">Ekstra duża</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Grubość czcionki</Label>
              <EditableFieldToggle fieldName="cta_font_weight" editableFields={editableFields} onToggle={setEditable} />
            </div>
            <Select value={config.cta_font_weight || 'bold'} onValueChange={v => update('cta_font_weight', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normalna</SelectItem>
                <SelectItem value="medium">Średnia</SelectItem>
                <SelectItem value="semibold">Półgruba</SelectItem>
                <SelectItem value="bold">Gruba</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Rozmiar przycisku</Label>
              <EditableFieldToggle fieldName="cta_padding" editableFields={editableFields} onToggle={setEditable} />
            </div>
            <Select value={config.cta_padding || 'medium'} onValueChange={v => update('cta_padding', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Mały</SelectItem>
                <SelectItem value="medium">Średni</SelectItem>
                <SelectItem value="large">Duży</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Cień</Label>
              <EditableFieldToggle fieldName="cta_shadow" editableFields={editableFields} onToggle={setEditable} />
            </div>
            <Select value={config.cta_shadow || 'lg'} onValueChange={v => update('cta_shadow', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Brak</SelectItem>
                <SelectItem value="sm">Mały</SelectItem>
                <SelectItem value="md">Średni</SelectItem>
                <SelectItem value="lg">Duży</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Ikona (emoji)</Label>
              <EditableFieldToggle fieldName="cta_icon" editableFields={editableFields} onToggle={setEditable} />
            </div>
            <Input
              value={config.cta_icon ?? '📝'}
              onChange={e => update('cta_icon', e.target.value)}
              placeholder="np. 📝 lub puste"
              className="text-lg"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={config.cta_full_width || false}
            onCheckedChange={v => update('cta_full_width', v)}
          />
          <Label className="text-xs cursor-pointer">Pełna szerokość</Label>
          <EditableFieldToggle fieldName="cta_full_width" editableFields={editableFields} onToggle={setEditable} />
        </div>
      </fieldset>

      <ColorInput label="Kolor tła" value={config.bg_color || '#0f172a'} onChange={v => update('bg_color', v)} />
      <BgPatternPicker
        pattern={config.bg_pattern || 'none'}
        opacity={config.bg_pattern_opacity ?? 0.08}
        color={config.bg_pattern_color || ''}
        onPatternChange={v => update('bg_pattern', v)}
        onOpacityChange={v => update('bg_pattern_opacity', v)}
        onColorChange={v => update('bg_pattern_color', v)}
      />

      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Dodatkowe elementy</legend>
        <InnerElementsList elements={config.inner_elements || []} onChange={(els) => update('inner_elements', els)} />
      </fieldset>
    </div>
  );
};
