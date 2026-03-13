import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUploadField } from './ImageUploadField';
import type { TestimonialBlockData } from '@/types/leaderLanding';

interface Props {
  data: TestimonialBlockData;
  onChange: (data: TestimonialBlockData) => void;
}

export const TestimonialBlockEditor: React.FC<Props> = ({ data, onChange }) => {
  const update = (partial: Partial<TestimonialBlockData>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Edycja Opinii</h4>
      <div>
        <Label>Cytat</Label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
          value={data.quote || ''}
          onChange={e => update({ quote: e.target.value })}
        />
      </div>
      <div><Label>Imię autora</Label><Input value={data.author_name || ''} onChange={e => update({ author_name: e.target.value })} /></div>
      <ImageUploadField label="Zdjęcie autora" value={data.author_image || ''} onChange={url => update({ author_image: url })} />
    </div>
  );
};
