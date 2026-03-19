import React from 'react';
import type { EqologyHeroSection, EqologyTheme } from '@/types/eqologyTemplate';
import { ExternalLink } from 'lucide-react';

interface Props {
  data: EqologyHeroSection;
  theme: EqologyTheme;
  primaryCtaUrl?: string;
}

export const HeroSection: React.FC<Props> = ({ data, theme, primaryCtaUrl }) => {
  return (
    <section
      className="relative min-h-[80vh] flex items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.primaryColor}dd 60%, ${theme.primaryColor}99 100%)`,
      }}
    >
      {data.bgImageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${data.bgImageUrl})` }}
        />
      )}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight"
          style={{ color: '#FFFFFF', fontFamily: theme.fontFamily }}
        >
          {data.title}
        </h1>
        <p className="text-xl sm:text-2xl font-light mb-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {data.subtitle}
        </p>
        <p className="text-base sm:text-lg mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {data.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {primaryCtaUrl && (
            <a
              href={primaryCtaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-105 shadow-lg"
              style={{
                backgroundColor: theme.accentColor,
                color: theme.primaryColor,
              }}
            >
              {data.ctaPrimaryText}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {data.ctaSecondaryUrl && (
            <a
              href={data.ctaSecondaryUrl}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base border-2 transition-all duration-300 hover:bg-white/10"
              style={{
                borderColor: 'rgba(255,255,255,0.4)',
                color: '#FFFFFF',
              }}
            >
              {data.ctaSecondaryText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
