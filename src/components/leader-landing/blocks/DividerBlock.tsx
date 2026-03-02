import React from 'react';
import type { DividerBlockData } from '@/types/leaderLanding';

interface Props {
  data: DividerBlockData;
  blockId: string;
  pageId: string;
  themeColor: string;
  eqId: string;
}

export const DividerBlock: React.FC<Props> = ({ data, blockId }) => {
  if (data.style === 'space') return <div id={blockId} className="py-8" />;
  if (data.style === 'dots') return <div id={blockId} className="text-center py-6 text-gray-300 tracking-[1em]">•••</div>;
  return <hr id={blockId} className="max-w-3xl mx-auto my-8 border-gray-200" />;
};
