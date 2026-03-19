import React from 'react';
import type { EqologyGuaranteeSection, EqologyTheme } from '@/types/eqologyTemplate';
import { ShieldCheck } from 'lucide-react';

interface Props {
  data: EqologyGuaranteeSection;
  theme: EqologyTheme;
}

export const GuaranteeSection: React.FC<Props> = ({ data, theme }) => {
  return (
    <section style={{ backgroundColor: theme.bgAlt }} className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-8 flex items-center justify-center bg-emerald-100">
          <ShieldCheck className="w-10 h-10 text-emerald-600" />
        </div>
        <h2
          className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6"
          style={{ color: theme.primaryColor }}
        >
          {data.title}
        </h2>
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl mx-auto">
          {data.description}
        </p>
      </div>
    </section>
  );
};
