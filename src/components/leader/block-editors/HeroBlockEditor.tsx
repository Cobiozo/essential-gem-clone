import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { HeroBlockData } from '@/types/leaderLanding';

interface Props {
  data: HeroBlockData;
  onChange: (data: HeroBlockData) => void;
}

export const HeroBlockEditor: React.FC<Props> = ({ data, onChange }) => {
  const update = (partial: Partial<HeroBlockData>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Edycja Hero</h4>
      <div><Label>Tytuł</Label><Input value={data.title || ''} onChange={e => update({ title: e.target.value })} /></div>
      <div><Label>Podtytuł</Label><Input value={data.subtitle || ''} onChange={e => update({ subtitle: e.target.value })} /></div>
      <div><Label>Tekst przycisku</Label><Input value={data.cta_text || ''} onChange={e => update({ cta_text: e.target.value })} /></div>
      <div><Label>Link przycisku</Label><Input value={data.cta_link || ''} onChange={e => update({ cta_link: e.target.value })} /></div>
      <div><Label>URL tła (obrazek)</Label><Input value={data.background_image || ''} onChange={e => update({ background_image: e.target.value })} /></div>
      <div><Label>Kolor tła</Label>
        <div className="flex gap-2">
          <input type="color" value={data.background_color || '#10b981'} onChange={e => update({ background_color: e.target.value })} className="w-10 h-10 rounded" />
          <Input value={data.background_color || ''} onChange={e => update({ background_color: e.target.value })} />
        </div>
      </div>
    </div>
  );
};
