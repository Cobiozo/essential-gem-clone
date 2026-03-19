import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const HeroSectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });
  const updateCta = (which: 'cta_primary' | 'cta_secondary', field: string, value: string) =>
    onChange({ ...config, [which]: { ...(config[which] || {}), [field]: value } });

  return (
    <div className="space-y-4">
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
      <div>
        <Label>Kolor tła (hex)</Label>
        <Input value={config.bg_color || '#0a1628'} onChange={e => update('bg_color', e.target.value)} />
      </div>
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
