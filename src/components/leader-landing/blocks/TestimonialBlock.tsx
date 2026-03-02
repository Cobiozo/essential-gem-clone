import React from 'react';
import type { TestimonialBlockData } from '@/types/leaderLanding';

interface Props {
  data: TestimonialBlockData;
  blockId: string;
  pageId: string;
  themeColor: string;
  eqId: string;
}

export const TestimonialBlock: React.FC<Props> = ({ data, blockId, themeColor }) => (
  <section id={blockId} className="max-w-2xl mx-auto px-6 py-12 text-center">
    <blockquote className="text-xl italic text-gray-700 mb-4" style={{ borderLeftColor: themeColor, borderLeftWidth: 4, paddingLeft: '1rem', textAlign: 'left' }}>
      "{data.quote}"
    </blockquote>
    <div className="flex items-center justify-center gap-3 mt-4">
      {data.author_image && <img src={data.author_image} alt={data.author_name} className="w-10 h-10 rounded-full object-cover" />}
      <span className="font-semibold text-gray-800">{data.author_name}</span>
    </div>
  </section>
);
