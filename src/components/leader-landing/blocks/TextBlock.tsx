import React from 'react';
import type { TextBlockData } from '@/types/leaderLanding';

interface Props {
  data: TextBlockData;
  blockId: string;
  pageId: string;
  themeColor: string;
  eqId: string;
}

export const TextBlock: React.FC<Props> = ({ data, blockId }) => (
  <section id={blockId} className="max-w-3xl mx-auto px-6 py-12">
    <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: data.content.replace(/\n/g, '<br/>') }} />
  </section>
);
