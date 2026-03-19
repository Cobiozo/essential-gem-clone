import React from 'react';
import type { EqologyTimelineSection, EqologyTheme } from '@/types/eqologyTemplate';

interface Props {
  data: EqologyTimelineSection;
  theme: EqologyTheme;
}

export const TimelineSection: React.FC<Props> = ({ data, theme }) => {
  return (
    <section style={{ backgroundColor: theme.bgColor }} className="py-16 sm:py-24 overflow-hidden">
      <div className="max-w-5xl mx-auto px-6">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-16"
          style={{ color: theme.primaryColor }}
        >
          {data.title}
        </h2>

        {/* Desktop horizontal timeline */}
        <div className="hidden md:block relative">
          <div
            className="absolute top-8 left-0 right-0 h-1 rounded-full"
            style={{ backgroundColor: `${theme.primaryColor}20` }}
          />
          <div className="grid grid-cols-4 gap-6 relative">
            {data.milestones.map((ms, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center relative z-10 shadow-md transition-transform duration-300 hover:scale-110"
                  style={{ backgroundColor: theme.accentColor }}
                >
                  <span className="text-sm font-bold" style={{ color: theme.primaryColor }}>
                    {ms.month.replace('Miesiąc ', 'M')}
                  </span>
                </div>
                <h3 className="font-bold text-base mb-1" style={{ color: theme.primaryColor }}>
                  {ms.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{ms.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile vertical timeline */}
        <div className="md:hidden space-y-6">
          {data.milestones.map((ms, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                  style={{ backgroundColor: theme.accentColor }}
                >
                  <span className="text-xs font-bold" style={{ color: theme.primaryColor }}>
                    {ms.month.replace('Miesiąc ', 'M')}
                  </span>
                </div>
                {i < data.milestones.length - 1 && (
                  <div className="w-0.5 flex-1 mt-2" style={{ backgroundColor: `${theme.primaryColor}20` }} />
                )}
              </div>
              <div className="pb-6">
                <h3 className="font-bold text-base" style={{ color: theme.primaryColor }}>
                  {ms.title}
                </h3>
                <p className="text-sm text-gray-600">{ms.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
