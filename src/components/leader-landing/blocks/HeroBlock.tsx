import React from 'react';
import type { HeroBlockData } from '@/types/leaderLanding';
import { trackLandingEvent } from '../utils/analytics';

interface Props {
  data: HeroBlockData;
  blockId: string;
  pageId: string;
  themeColor: string;
  eqId: string;
}

export const HeroBlock: React.FC<Props> = ({ data, blockId, pageId, themeColor }) => {
  const bgStyle: React.CSSProperties = data.background_image
    ? { backgroundImage: `url(${data.background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: data.background_color || themeColor };

  return (
    <section
      id={blockId}
      className="relative min-h-[60vh] flex items-center justify-center text-white"
      style={bgStyle}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 text-center max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">{data.title}</h1>
        {data.subtitle && <p className="text-lg md:text-xl mb-8 opacity-90">{data.subtitle}</p>}
        {data.cta_text && data.cta_link && (
          <a
            href={data.cta_link}
            onClick={() => trackLandingEvent(pageId, 'cta_click', { block_id: blockId })}
            className="inline-block px-8 py-3 rounded-lg text-lg font-semibold transition-transform hover:scale-105"
            style={{ backgroundColor: 'white', color: themeColor }}
          >
            {data.cta_text}
          </a>
        )}
      </div>
    </section>
  );
};
