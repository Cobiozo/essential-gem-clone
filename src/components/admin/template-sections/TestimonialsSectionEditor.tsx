import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { EditableFieldToggle } from './EditableFieldToggle';
import { ImageUploadInput } from '@/components/partner-page/ImageUploadInput';
import { InnerElementsList } from './InnerElementsList';
import { ColorInput } from '@/components/ui/color-input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BgPatternPicker } from './BgPatternPicker';

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
        <Textarea value={config.heading || ''} onChange={e => update('heading', e.target.value)} rows={1} className="min-h-[36px] resize-y" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Podtytuł</Label>
          <EditableFieldToggle fieldName="subtitle" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Textarea value={config.subtitle || ''} onChange={e => update('subtitle', e.target.value)} rows={1} className="min-h-[36px] resize-y" />
      </div>

      {/* Card style controls */}
      <fieldset className="border rounded-lg p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Styl kart</legend>
        
        <div>
          <Label className="text-xs">Szerokość karty: {config.card_width || 220}px</Label>
          <Slider value={[config.card_width || 220]} onValueChange={([v]) => update('card_width', v)} min={180} max={400} step={10} />
        </div>

        <div>
          <Label className="text-xs">Rozmiar avatara: {config.avatar_size || 80}px</Label>
          <Slider value={[config.avatar_size || 80]} onValueChange={([v]) => update('avatar_size', v)} min={40} max={120} step={4} />
        </div>

        <div>
          <Label className="text-xs">Zaokrąglenie rogów: {config.card_border_radius || 16}px</Label>
          <Slider value={[config.card_border_radius || 16]} onValueChange={([v]) => update('card_border_radius', v)} min={0} max={32} step={2} />
        </div>

        <div>
          <Label className="text-xs">Rozmiar czcionki</Label>
          <Select value={config.card_font_size || 'base'} onValueChange={v => update('card_font_size', v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Mały</SelectItem>
              <SelectItem value="base">Średni</SelectItem>
              <SelectItem value="lg">Duży</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ColorInput value={config.card_bg_color || ''} onChange={v => update('card_bg_color', v)} label="Kolor tła kart (puste = gradient)" />
        <ColorInput value={config.card_text_color || ''} onChange={v => update('card_text_color', v)} label="Kolor tekstu kart" />

        <div className="flex items-center gap-2">
          <Checkbox
            checked={config.auto_scroll || false}
            onCheckedChange={v => update('auto_scroll', v)}
            id="auto_scroll"
          />
          <Label htmlFor="auto_scroll" className="text-xs cursor-pointer">Automatyczne przesuwanie</Label>
        </div>

        {config.auto_scroll && (
          <div>
            <Label className="text-xs">Interwał: {config.auto_scroll_interval || 5}s</Label>
            <Slider value={[config.auto_scroll_interval || 5]} onValueChange={([v]) => update('auto_scroll_interval', v)} min={2} max={10} step={1} />
          </div>
        )}
      </fieldset>

      <Label>Karty opinii</Label>
      {cards.map((card, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Karta {i + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => update('cards', cards.filter((_, j) => j !== i))}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
          <ImageUploadInput value={card.image || ''} onChange={v => updateCard(i, 'image', v)} compact />
          <Textarea value={card.name || ''} onChange={e => updateCard(i, 'name', e.target.value)} placeholder="Imię osoby" rows={1} className="min-h-[36px] resize-y" />
          <Textarea value={card.label || ''} onChange={e => updateCard(i, 'label', e.target.value)} placeholder="Opis (np. Suplementacja wspierająca...)" rows={2} className="min-h-[36px] resize-y" />
          <div className="grid grid-cols-2 gap-2">
            <Textarea value={card.before_label || ''} onChange={e => updateCard(i, 'before_label', e.target.value)} placeholder="Etykieta PRZED (np. PRZED:)" rows={1} className="min-h-[36px] resize-y" />
            <Textarea value={card.before || ''} onChange={e => updateCard(i, 'before', e.target.value)} placeholder="Wartość PRZED (np. 15:1)" rows={1} className="min-h-[36px] resize-y" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Textarea value={card.after_label || ''} onChange={e => updateCard(i, 'after_label', e.target.value)} placeholder="Etykieta PO (np. PO:)" rows={1} className="min-h-[36px] resize-y" />
            <Textarea value={card.after || ''} onChange={e => updateCard(i, 'after', e.target.value)} placeholder="Wartość PO (np. 3:1)" rows={1} className="min-h-[36px] resize-y" />
          </div>
          <Textarea value={card.description || ''} onChange={e => updateCard(i, 'description', e.target.value)} placeholder="Dodatkowy opis" rows={2} className="min-h-[36px] resize-y" />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => update('cards', [...cards, { name: '', label: '', before_label: 'PRZED:', before: '', after_label: 'PO:', after: '', description: '', image: '' }])}>
        <Plus className="w-4 h-4 mr-1" /> Dodaj kartę
      </Button>
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