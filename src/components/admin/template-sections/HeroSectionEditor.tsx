import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const HeroSectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const updateCta = (which: 'cta_primary' | 'cta_secondary', field: string, value: string) =>
    onChange({ ...config, [which]: { ...(config[which] || {}), [field]: value } });

  const stats: Array<{ icon: string; value: string; label: string }> = config.stats || [];
  const addStat = () => update('stats', [...stats, { icon: '📊', value: '', label: '' }]);
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
        <Label>Nagłówek główny</Label>
        <Input value={config.headline || ''} onChange={e => update('headline', e.target.value)} placeholder="TESTUJ, NIE ZGADUJ." />
      </div>
      <div>
        <Label>Podtytuł</Label>
        <Input value={config.subheadline || ''} onChange={e => update('subheadline', e.target.value)} />
      </div>
      <div>
        <Label>Opis</Label>
        <Textarea value={config.description || ''} onChange={e => update('description', e.target.value)} rows={3} />
      </div>
      <div>
        <Label>Tekst badge</Label>
        <Input value={config.badge_text || ''} onChange={e => update('badge_text', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>URL wideo (tło)</Label>
          <Input value={config.video_url || ''} onChange={e => update('video_url', e.target.value)} />
        </div>
        <div>
          <Label>URL obrazu (tło fallback)</Label>
          <Input value={config.bg_image_url || ''} onChange={e => update('bg_image_url', e.target.value)} />
        </div>
      </div>
      {(config.layout === 'split') && (
        <div>
          <Label>URL obrazu hero (prawa strona)</Label>
          <Input value={config.hero_image_url || ''} onChange={e => update('hero_image_url', e.target.value)} placeholder="https://..." />
        </div>
      )}
      <div>
        <Label>Kolor tła (hex)</Label>
        <Input value={config.bg_color || '#0a1628'} onChange={e => update('bg_color', e.target.value)} />
      </div>

      {/* Stats */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Statystyki (pasek)</legend>
        {stats.map((stat, i) => (
          <div key={i} className="grid grid-cols-[60px_1fr_1fr_auto] gap-2 items-end">
            <div>
              <Label className="text-xs">Ikona</Label>
              <Input value={stat.icon} onChange={e => updateStat(i, 'icon', e.target.value)} />
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
        <legend className="text-sm font-semibold px-2">CTA Główne</legend>
        <Input value={config.cta_primary?.text || ''} onChange={e => updateCta('cta_primary', 'text', e.target.value)} placeholder="Tekst przycisku" />
        <Input value={config.cta_primary?.url || ''} onChange={e => updateCta('cta_primary', 'url', e.target.value)} placeholder="URL" />
      </fieldset>
      <fieldset className="border rounded-lg p-4 space-y-2">
        <legend className="text-sm font-semibold px-2">CTA Drugie (ghost)</legend>
        <Input value={config.cta_secondary?.text || ''} onChange={e => updateCta('cta_secondary', 'text', e.target.value)} placeholder="Tekst przycisku" />
        <Input value={config.cta_secondary?.url || ''} onChange={e => updateCta('cta_secondary', 'url', e.target.value)} placeholder="URL" />
      </fieldset>
    </div>
  );
};
