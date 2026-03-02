import React from 'react';
import type { ProductsBlockData } from '@/types/leaderLanding';
import { trackLandingEvent } from '../utils/analytics';

interface Props {
  data: ProductsBlockData;
  blockId: string;
  pageId: string;
  themeColor: string;
  eqId: string;
}

export const ProductsBlock: React.FC<Props> = ({ data, blockId, pageId, themeColor }) => (
  <section id={blockId} className="max-w-5xl mx-auto px-6 py-12">
    {data.heading && <h2 className="text-2xl font-bold mb-8 text-center">{data.heading}</h2>}
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((item, i) => (
        <a
          key={i}
          href={item.link || '#'}
          onClick={() => trackLandingEvent(pageId, 'cta_click', { block_id: blockId, product: item.name })}
          className="block rounded-xl border p-4 hover:shadow-lg transition-shadow"
        >
          {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover rounded-lg mb-3" loading="lazy" />}
          <h3 className="font-semibold text-lg">{item.name}</h3>
          {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
        </a>
      ))}
    </div>
  </section>
);
