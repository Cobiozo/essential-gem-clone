import React from 'react';
import type { EqologyFooterSurveySection, EqologyTheme } from '@/types/eqologyTemplate';

interface Props {
  data: EqologyFooterSurveySection;
  theme: EqologyTheme;
}

export const FooterSurveySection: React.FC<Props> = ({ data, theme }) => {
  return (
    <section
      className="py-20 sm:py-28"
      style={{ backgroundColor: theme.primaryColor }}
    >
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white">
          {data.title}
        </h2>
        <p className="text-base sm:text-lg text-white/70 mb-10 max-w-xl mx-auto">
          {data.description}
        </p>
        {data.ctaUrl && (
          <a
            href={data.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-105 shadow-lg"
            style={{
              backgroundColor: theme.accentColor,
              color: theme.primaryColor,
            }}
          >
            {data.ctaText}
          </a>
        )}
        <p className="mt-12 text-white/40 text-sm">
          © {new Date().getFullYear()} Eqology. Powered by Pure Life Center.
        </p>
      </div>
    </section>
  );
};
