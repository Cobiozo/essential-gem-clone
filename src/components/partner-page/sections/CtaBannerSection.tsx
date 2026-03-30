import React from 'react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';
import { getPatternStyle } from '@/lib/bgPatterns';

const radiusMap: Record<string, string> = {
  none: '0', sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', full: '9999px',
};
const fontSizeMap: Record<string, string> = {
  sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem',
};
const paddingMap: Record<string, string> = {
  small: '0.5rem 1rem', medium: '1rem 2rem', large: '1.25rem 2.5rem',
};
const shadowMap: Record<string, string> = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
};
const fontWeightMap: Record<string, number> = {
  normal: 400, medium: 500, semibold: 600, bold: 700,
};

interface Props {
  config: Record<string, any>;
  onSurveyOpen?: () => void;
  formKeys?: string[];
  onFormOpen?: (key: string) => void;
}

export const CtaBannerSection: React.FC<Props> = ({ config, onSurveyOpen, formKeys, onFormOpen }) => {
  const { heading, description, cta_text, cta_url, bg_color, text_color, text_align } = config;
  const tc = text_color || undefined;
  const ts = tc ? { color: tc } : { color: 'white' };
  const ta = text_align as React.CSSProperties['textAlign'] || undefined;

  const ctaIcon = config.cta_icon ?? '📝';

  const ctaStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: config.cta_bg_color || '#f97316',
    color: config.cta_text_color || '#ffffff',
    borderRadius: radiusMap[config.cta_radius || 'xl'] || '1rem',
    fontSize: fontSizeMap[config.cta_font_size || 'base'] || '1rem',
    fontWeight: fontWeightMap[config.cta_font_weight || 'bold'] || 700,
    padding: paddingMap[config.cta_padding || 'medium'] || '1rem 2rem',
    boxShadow: shadowMap[config.cta_shadow || 'lg'] || 'none',
    border: config.cta_border_width
      ? `${config.cta_border_width}px solid ${config.cta_border_color || '#000000'}`
      : 'none',
    width: config.cta_full_width ? '100%' : undefined,
    justifyContent: 'center',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
    cursor: 'pointer',
  };

  return (
    <section className="relative py-16 sm:py-20 overflow-hidden" style={{ backgroundColor: bg_color || '#0f172a' }}>
      {config.bg_pattern && config.bg_pattern !== 'none' && (
        <div className="absolute inset-0 pointer-events-none z-0" style={getPatternStyle(config.bg_pattern, config.bg_pattern_opacity, config.bg_pattern_color, bg_color)} />
      )}
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center" style={{ textAlign: ta }}>
        {heading && <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ ...ts, whiteSpace: 'pre-line' }}>{heading}</h2>}
        {description && <p className="mb-8" style={{ ...ts, opacity: 0.8, whiteSpace: 'pre-line' }}>{description}</p>}
        {cta_text && (
          <a
            href={cta_url || '#'}
            onClick={(e) => {
              const url = cta_url || '#';
              if (url === '#ankieta' && onSurveyOpen) {
                e.preventDefault();
                onSurveyOpen();
                return;
              }
              if (url.startsWith('#') && formKeys && onFormOpen) {
                const anchor = url.substring(1);
                if (formKeys.includes(anchor)) {
                  e.preventDefault();
                  onFormOpen(anchor);
                  return;
                }
              }
              if (url.startsWith('#')) {
                e.preventDefault();
                const anchor = url.substring(1);
                const el = document.getElementById(anchor)
                  || Array.from(document.querySelectorAll('[id]')).find(n => n.id.toLowerCase() === anchor.toLowerCase());
                if (el) {
                  const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
                  window.scrollTo({ top, behavior: 'smooth' });
                }
              }
            }}
            style={ctaStyle}
          >
            {ctaIcon && ctaIcon} {cta_text}
          </a>
        )}

        {config.inner_elements?.length > 0 && (
          <div className="mt-8">
            {config.inner_elements.map((el: any) => <InnerElementRenderer key={el.id} element={el} />)}
          </div>
        )}
      </div>
    </section>
  );
};
