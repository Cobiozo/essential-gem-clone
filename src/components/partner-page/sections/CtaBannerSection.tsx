import React from 'react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';

interface Props {
  config: Record<string, any>;
  onSurveyOpen?: () => void;
}

export const CtaBannerSection: React.FC<Props> = ({ config }) => {
  const { heading, description, cta_text, cta_url, bg_color, text_color, text_align } = config;
  const tc = text_color || undefined;
  const ts = tc ? { color: tc } : { color: 'white' };
  const ta = text_align as React.CSSProperties['textAlign'] || undefined;

  return (
    <section className="py-16 sm:py-20" style={{ backgroundColor: bg_color || '#0f172a' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center" style={{ textAlign: ta }}>
        {heading && <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ ...ts, whiteSpace: 'pre-line' }}>{heading}</h2>}
        {description && <p className="mb-8" style={{ ...ts, opacity: 0.8, whiteSpace: 'pre-line' }}>{description}</p>}
        {cta_text && (
          <a
            href={cta_url || '#'}
            onClick={(e) => {
              const url = cta_url || '#';
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
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-base transition-colors shadow-lg"
          >
            📝 {cta_text}
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
