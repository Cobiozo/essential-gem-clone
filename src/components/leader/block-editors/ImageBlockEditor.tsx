import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUploadField } from './ImageUploadField';
import type { ImageBlockData } from '@/types/leaderLanding';

interface Props {
  data: ImageBlockData;
  onChange: (data: ImageBlockData) => void;
}

export const ImageBlockEditor: React.FC<Props> = ({ data, onChange }) => {
  const update = (partial: Partial<ImageBlockData>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Edycja Obrazka</h4>
      <ImageUploadField label="Obrazek" value={data.image_url || ''} onChange={url => update({ image_url: url })} />
      <div><Label>Tekst alternatywny (alt)</Label><Input value={data.alt_text || ''} onChange={e => update({ alt_text: e.target.value })} /></div>
      <div><Label>Podpis</Label><Input value={data.caption || ''} onChange={e => update({ caption: e.target.value })} /></div>
    </div>
  );
};
