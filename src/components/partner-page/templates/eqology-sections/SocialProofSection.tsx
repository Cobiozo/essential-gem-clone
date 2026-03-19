import React from 'react';
import type { EqologySocialProofSection, EqologyTheme } from '@/types/eqologyTemplate';
import { TrendingDown } from 'lucide-react';

interface Props {
  data: EqologySocialProofSection;
  theme: EqologyTheme;
}

export const SocialProofSection: React.FC<Props> = ({ data, theme }) => {
  return (
    <section style={{ backgroundColor: theme.bgColor }} className="py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-6">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12"
          style={{ color: theme.primaryColor }}
        >
          {data.title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.items.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
              style={{ backgroundColor: theme.bgAlt }}
            >
              <p className="font-semibold text-lg mb-4" style={{ color: theme.primaryColor }}>
                {item.name}
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Przed</span>
                  <span className="text-lg font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg">
                    {item.beforeRatio}
                  </span>
                </div>
                <div className="flex justify-center">
                  <TrendingDown className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Po</span>
                  <span className="text-lg font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                    {item.afterRatio}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
