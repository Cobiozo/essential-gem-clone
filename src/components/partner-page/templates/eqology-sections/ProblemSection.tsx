import React from 'react';
import type { EqologyProblemSection, EqologyTheme } from '@/types/eqologyTemplate';
import { X } from 'lucide-react';

interface Props {
  data: EqologyProblemSection;
  theme: EqologyTheme;
}

export const ProblemSection: React.FC<Props> = ({ data, theme }) => {
  return (
    <section style={{ backgroundColor: theme.bgColor }} className="py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-6">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12"
          style={{ color: theme.primaryColor }}
        >
          {data.title}
        </h2>
        <div className="space-y-6">
          {data.items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-5 rounded-xl transition-all duration-300 hover:shadow-md"
              style={{ backgroundColor: theme.bgAlt }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed pt-1.5">
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
