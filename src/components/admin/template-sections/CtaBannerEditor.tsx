import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const CtaBannerEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });

  return (
    <div className="space-y-4">
      <div>
        <Label>Nagłówek</Label>
        <Input value={config.heading || ''} onChange={e => update('heading', e.target.value)} />
      </div>
      <div>
        <Label>Opis</Label>
        <Textarea value={config.description || ''} onChange={e => update('description', e.target.value)} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tekst CTA</Label>
          <Input value={config.cta_text || ''} onChange={e => update('cta_text', e.target.value)} />
        </div>
        <div>
          <Label>URL CTA</Label>
          <Input value={config.cta_url || ''} onChange={e => update('cta_url', e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Kolor tła</Label>
        <Input value={config.bg_color || '#0f172a'} onChange={e => update('bg_color', e.target.value)} />
      </div>
    </div>
  );
};
