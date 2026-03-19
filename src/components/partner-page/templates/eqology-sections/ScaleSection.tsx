import React from 'react';
import type { EqologyScaleSection, EqologyTheme } from '@/types/eqologyTemplate';

interface Props {
  data: EqologyScaleSection;
  theme: EqologyTheme;
}

export const ScaleSection: React.FC<Props> = ({ data, theme }) => {
  return (
    <section
      className="py-20 sm:py-28"
      style={{ backgroundColor: theme.primaryColor }}
    >
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div
          className="text-7xl sm:text-8xl md:text-9xl font-black mb-6 opacity-20"
          style={{ color: theme.accentColor }}
        >
          {data.stat}
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-white">
          {data.title}
        </h2>
        <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
          {data.description}
        </p>
      </div>
    </section>
  );
};
