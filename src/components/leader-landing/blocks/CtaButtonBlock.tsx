import React from 'react';
import type { CtaButtonBlockData } from '@/types/leaderLanding';
import { trackLandingEvent } from '../utils/analytics';

interface Props {
  data: CtaButtonBlockData;
  blockId: string;
  pageId: string;
  themeColor: string;
  eqId: string;
}

export const CtaButtonBlock: React.FC<Props> = ({ data, blockId, pageId, themeColor }) => {
  const isPrimary = data.variant !== 'outline' && data.variant !== 'secondary';
  const style: React.CSSProperties = isPrimary
    ? { backgroundColor: themeColor, color: 'white' }
    : { borderColor: themeColor, color: themeColor };

  return (
    <section id={blockId} className="text-center py-8">
      <a
        href={data.link}
        onClick={() => trackLandingEvent(pageId, 'cta_click', { block_id: blockId })}
        className={`inline-block px-8 py-3 rounded-lg text-lg font-semibold transition-transform hover:scale-105 ${!isPrimary ? 'border-2 bg-transparent' : ''}`}
        style={style}
      >
        {data.text}
      </a>
    </section>
  );
};
