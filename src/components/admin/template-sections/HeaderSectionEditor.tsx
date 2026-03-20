import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { EditableFieldToggle } from './EditableFieldToggle';
import { ImageUploadInput } from '@/components/partner-page/ImageUploadInput';
import { ColorInput } from '@/components/ui/color-input';
import { InnerElementsList } from './InnerElementsList';
import { VariablesLegend } from './VariablesLegend';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Merriweather', label: 'Merriweather' },
];

const FONT_WEIGHT_OPTIONS = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Normal (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semibold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extrabold (800)' },
];

const FONT_SIZE_OPTIONS = [
  { value: 'xs', label: 'XS (12px)' },
  { value: 'sm', label: 'SM (14px)' },
  { value: 'base', label: 'Base (16px)' },
  { value: 'lg', label: 'LG (18px)' },
];

export const HeaderSectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const updatePartnerBadge = (field: string, value: string) =>
    onChange({ ...config, partner_badge: { ...(config.partner_badge || {}), [field]: value } });
  const buttons: any[] = config.buttons || [];
  const editableFields: string[] = config.editable_fields || [];
  const setEditable = (fields: string[]) => update('editable_fields', fields);
  const updateBtn = (i: number, field: string, value: string) => {
    const n = [...buttons];
    n[i] = { ...n[i], [field]: value };
    update('buttons', n);
  };

  return (
    <div className="space-y-6">
      <VariablesLegend />
      {/* === LOGO === */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Logo</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between">
              <Label>Tekst logo</Label>
              <EditableFieldToggle fieldName="logo_text" editableFields={editableFields} onToggle={setEditable} />
            </div>
            <Input value={config.logo_text || ''} onChange={e => update('logo_text', e.target.value)} />
          </div>
          <div>
            <Label>URL logo (obraz)</Label>
            <ImageUploadInput value={config.logo_image_url || ''} onChange={v => update('logo_image_url', v)} compact />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Czcionka logo</Label>
            <Select value={config.logo_font || 'Inter'} onValueChange={v => update('logo_font', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rozmiar logo (px)</Label>
            <Input type="number" value={config.logo_font_size || 20} onChange={e => update('logo_font_size', Number(e.target.value))} min={10} max={60} />
          </div>
          <div>
            <Label>Grubość czcionki</Label>
            <Select value={String(config.logo_font_weight || '700')} onValueChange={v => update('logo_font_weight', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_WEIGHT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Wysokość logo obrazu (px)</Label>
          <Input type="number" value={config.logo_height || 40} onChange={e => update('logo_height', Number(e.target.value))} min={16} max={120} />
        </div>
      </fieldset>

      {/* === STYL NAGŁÓWKA === */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Styl nagłówka</legend>
        <div className="grid grid-cols-3 gap-3">
          <ColorInput value={config.bg_color || '#ffffff'} onChange={v => update('bg_color', v)} label="Kolor tła" />
          <ColorInput value={config.text_color || '#000000'} onChange={v => update('text_color', v)} label="Kolor tekstu" />
          <ColorInput value={config.border_color || '#f3f4f6'} onChange={v => update('border_color', v)} label="Kolor obramowania" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Padding pionowy (px)</Label>
            <Input type="number" value={config.padding_y || 12} onChange={e => update('padding_y', Number(e.target.value))} min={0} max={60} />
          </div>
          <div>
            <Label>Wyrównanie nawigacji</Label>
            <Select value={config.nav_align || 'right'} onValueChange={v => update('nav_align', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Do lewej</SelectItem>
                <SelectItem value="center">Środek</SelectItem>
                <SelectItem value="right">Do prawej</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label>Ukryj obramowanie</Label>
          <Switch checked={!!config.hide_border} onCheckedChange={v => update('hide_border', v)} />
        </div>
        <div>
          <Label>Przezroczystość tła: {Math.round((config.bg_opacity ?? 1) * 100)}%</Label>
          <Slider
            value={[config.bg_opacity ?? 1]}
            onValueChange={([v]) => update('bg_opacity', v)}
            min={0} max={1} step={0.05}
          />
        </div>
      </fieldset>

      {/* === STYL NAWIGACJI === */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Styl nawigacji</legend>
        <div>
          <Label>Styl nawigacji</Label>
          <Select value={config.nav_style || 'buttons'} onValueChange={v => update('nav_style', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="buttons">Przyciski</SelectItem>
              <SelectItem value="links">Linki tekstowe</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ColorInput value={config.nav_text_color || ''} onChange={v => update('nav_text_color', v)} label="Kolor tekstu linków" />
          <ColorInput value={config.nav_hover_color || ''} onChange={v => update('nav_hover_color', v)} label="Kolor hover" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Czcionka nawigacji</Label>
            <Select value={config.nav_font || 'Inter'} onValueChange={v => update('nav_font', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rozmiar czcionki</Label>
            <Select value={config.nav_font_size || 'sm'} onValueChange={v => update('nav_font_size', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_SIZE_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Grubość czcionki</Label>
            <Select value={String(config.nav_font_weight || '500')} onValueChange={v => update('nav_font_weight', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_WEIGHT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      {/* === ELEMENTY NAWIGACJI === */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Elementy nawigacji</legend>
        {buttons.map((btn, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <Input value={btn.text || ''} onChange={e => updateBtn(i, 'text', e.target.value)} placeholder="Tekst" className="flex-1" />
              <Input value={btn.url || ''} onChange={e => updateBtn(i, 'url', e.target.value)} placeholder="URL" className="flex-1" />
              {config.nav_style !== 'links' && (
                <Select value={btn.variant || 'outline'} onValueChange={v => updateBtn(i, 'variant', v)}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="primary">Primary</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button variant="ghost" size="icon" onClick={() => update('buttons', buttons.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
            {config.nav_style !== 'links' && (
              <div className="grid grid-cols-4 gap-2">
                <ColorInput value={btn.bg_color || ''} onChange={v => updateBtn(i, 'bg_color', v)} label="Tło" />
                <ColorInput value={btn.text_color || ''} onChange={v => updateBtn(i, 'text_color', v)} label="Tekst" />
                <ColorInput value={btn.border_color || ''} onChange={v => updateBtn(i, 'border_color', v)} label="Obramowanie" />
                <div>
                  <Label>Radius (px)</Label>
                  <Input type="number" value={btn.border_radius ?? 8} onChange={e => updateBtn(i, 'border_radius', e.target.value)} min={0} max={50} />
                </div>
              </div>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => update('buttons', [...buttons, { text: '', url: '', variant: 'outline' }])}>
          <Plus className="w-4 h-4 mr-1" /> Dodaj element
        </Button>
      </fieldset>

      {/* === KAFELEK PARTNERA === */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Kafelek partnera w nagłówku</legend>
        <div className="flex items-center justify-between">
          <Label>Pokaż kafelek partnera obok logo</Label>
          <Switch checked={!!config.show_partner_badge} onCheckedChange={v => update('show_partner_badge', v)} />
        </div>
        {config.show_partner_badge && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tekst (np. „Twój Przewodnik Zdrowia:")</Label>
              <Textarea value={config.partner_badge?.text || ''} onChange={e => updatePartnerBadge('text', e.target.value)} placeholder="Twój Przewodnik Zdrowia:" className="min-h-[60px]" />
            </div>
            <div>
              <Label className="text-xs">Podtytuł (np. imię partnera)</Label>
              <Textarea value={config.partner_badge?.subtitle || ''} onChange={e => updatePartnerBadge('subtitle', e.target.value)} placeholder="{Imię} - Jesteśmy tu dla Ciebie." className="min-h-[60px]" />
            </div>
            <div>
              <Label className="text-xs">Avatar partnera</Label>
              <ImageUploadInput value={config.partner_badge?.avatar_url || ''} onChange={v => updatePartnerBadge('avatar_url', v)} compact />
            </div>
          </div>
        )}
      </fieldset>

      {/* === DODATKOWE ELEMENTY === */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Dodatkowe elementy</legend>
        <InnerElementsList
          elements={config.inner_elements || []}
          onChange={(els) => update('inner_elements', els)}
        />
      </fieldset>
    </div>
  );
};
