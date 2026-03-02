import React from 'react';
import type { ImageBlockData } from '@/types/leaderLanding';

interface Props {
  data: ImageBlockData;
  blockId: string;
  pageId: string;
  themeColor: string;
  eqId: string;
}

export const ImageBlock: React.FC<Props> = ({ data, blockId }) => (
  <section id={blockId} className="max-w-4xl mx-auto px-6 py-8">
    {data.image_url && (
      <figure>
        <img src={data.image_url} alt={data.alt_text || ''} className="w-full rounded-lg shadow-md" loading="lazy" />
        {data.caption && <figcaption className="text-center text-sm text-gray-500 mt-3">{data.caption}</figcaption>}
      </figure>
    )}
  </section>
);
