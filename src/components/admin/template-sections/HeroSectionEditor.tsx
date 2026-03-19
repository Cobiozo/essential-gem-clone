import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorInput } from '@/components/ui/color-input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { EditableFieldToggle } from './EditableFieldToggle';
import { ImageUploadInput } from '@/components/partner-page/ImageUploadInput';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const HeroSectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const updateCta = (which: 'cta_primary' | 'cta_secondary', field: string, value: string) =>
    onChange({ ...config, [which]: { ...(config[which] || {}), [field]: value } });

  const editableFields: string[] = config.editable_fields || [];
  const setEditable = (fields: string[]) => update('editable_fields', fields);

  const stats: Array<{ icon: string; icon_url: string; value: string; label: string }> = config.stats || [];
  const addStat = () => update('stats', [...stats, { icon: '📊', icon_url: '', value: '', label: '' }]);
  const removeStat = (i: number) => update('stats', stats.filter((_, idx) => idx !== i));
  const updateStat = (i: number, field: string, value: string) =>
    update('stats', stats.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  return (
    <div className="space-y-4">
      <div>
        <Label>Layout</Label>
        <Select value={config.layout || 'centered'} onValueChange={(v) => update('layout', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="centered">Centralny (video/obraz tło)</SelectItem>
            <SelectItem value="split">Split (tekst + obraz obok)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Nagłówek główny</Label>
          <EditableFieldToggle fieldName="headline" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Input value={config.headline || ''} onChange={e => update('headline', e.target.value)} placeholder="TESTUJ, NIE ZGADUJ." />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Podtytuł</Label>
          <EditableFieldToggle fieldName="subheadline" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Input value={config.subheadline || ''} onChange={e => update('subheadline', e.target.value)} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Opis</Label>
          <EditableFieldToggle fieldName="description" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Textarea value={config.description || ''} onChange={e => update('description', e.target.value)} rows={3} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Tekst badge</Label>
          <EditableFieldToggle fieldName="badge_text" editableFields={editableFields} onToggle={setEditable} />
        </div>
        <Input value={config.badge_text || ''} onChange={e => update('badge_text', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>URL wideo (tło)</Label>
          <Input value={config.video_url || ''} onChange={e => update('video_url', e.target.value)} />
        </div>
        <div>
          <Label>URL obrazu tła</Label>
          <ImageUploadInput value={config.bg_image_url || ''} onChange={v => update('bg_image_url', v)} compact />
        </div>
      </div>
      {(config.layout === 'split') && (
        <div className="space-y-3">
          <div>
            <Label>URL obrazu hero (prawa strona)</Label>
            <ImageUploadInput value={config.hero_image_url || ''} onChange={v => update('hero_image_url', v)} />
          </div>
          <div>
            <Label>URL wideo hero MP4 (prawa strona)</Label>
            <Input value={config.hero_video_url || ''} onChange={e => update('hero_video_url', e.target.value)} placeholder="https://...video.mp4" />
            <p className="text-xs text-muted-foreground mt-1">Wideo ma priorytet nad obrazem</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <ColorInput label="Kolor tła" value={config.bg_color || '#0a1628'} onChange={v => update('bg_color', v)} />
        <ColorInput label="Kolor tekstu (opcja)" value={config.text_color || ''} onChange={v => update('text_color', v)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ColorInput label="Kolor CTA" value={config.cta_bg_color || '#2d6a4f'} onChange={v => update('cta_bg_color', v)} />
        <div>
          <Label>Ikona CTA</Label>
          <Select value={config.cta_icon || 'arrow'} onValueChange={v => update('cta_icon', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="arrow">Strzałka →</SelectItem>
              <SelectItem value="🛒">Koszyk 🛒</SelectItem>
              <SelectItem value="none">Brak</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Przezroczystość tła (0-1)</Label>
        <Input type="number" step="0.1" min="0" max="1" value={config.overlay_opacity ?? 0.3} onChange={e => update('overlay_opacity', parseFloat(e.target.value))} />
      </div>

      {/* Stats */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Statystyki (pasek)</legend>
        {stats.map((stat, i) => (
          <div key={i} className="grid grid-cols-[60px_1fr_1fr_1fr_auto] gap-2 items-end">
            <div>
              <Label className="text-xs">Ikona</Label>
              <Input value={stat.icon} onChange={e => updateStat(i, 'icon', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">URL ikony</Label>
              <ImageUploadInput value={stat.icon_url || ''} onChange={v => updateStat(i, 'icon_url', v)} compact />
            </div>
            <div>
              <Label className="text-xs">Wartość</Label>
              <Input value={stat.value} onChange={e => updateStat(i, 'value', e.target.value)} placeholder="+2000" />
            </div>
            <div>
              <Label className="text-xs">Etykieta</Label>
              <Input value={stat.label} onChange={e => updateStat(i, 'label', e.target.value)} placeholder="klientów" />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeStat(i)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addStat}>
          <Plus className="w-4 h-4 mr-1" /> Dodaj statystykę
        </Button>
      </fieldset>

      <fieldset className="border rounded-lg p-4 space-y-2">
        <legend className="text-sm font-semibold px-2">
          <div className="flex items-center gap-3">
            CTA Główne
            <EditableFieldToggle fieldName="cta_primary.url" editableFields={editableFields} onToggle={setEditable} label="URL edytowalny" />
          </div>
        </legend>
        <Input value={config.cta_primary?.text || ''} onChange={e => updateCta('cta_primary', 'text', e.target.value)} placeholder="Tekst przycisku" />
        <Input value={config.cta_primary?.url || ''} onChange={e => updateCta('cta_primary', 'url', e.target.value)} placeholder="URL" />
      </fieldset>
      <fieldset className="border rounded-lg p-4 space-y-2">
        <legend className="text-sm font-semibold px-2">
          <div className="flex items-center gap-3">
            CTA Drugie (ghost)
            <EditableFieldToggle fieldName="cta_secondary.url" editableFields={editableFields} onToggle={setEditable} label="URL edytowalny" />
          </div>
        </legend>
        <Input value={config.cta_secondary?.text || ''} onChange={e => updateCta('cta_secondary', 'text', e.target.value)} placeholder="Tekst przycisku" />
        <Input value={config.cta_secondary?.url || ''} onChange={e => updateCta('cta_secondary', 'url', e.target.value)} placeholder="URL" />
      </fieldset>
    </div>
  );
};
