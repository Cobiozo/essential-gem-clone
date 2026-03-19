import React from 'react';

interface Props {
  config: Record<string, any>;
}

export const CtaBannerSection: React.FC<Props> = ({ config }) => {
  const { heading, description, cta_text, cta_url, bg_color } = config;

  return (
    <section className="py-16 sm:py-20 text-white" style={{ backgroundColor: bg_color || '#0f172a' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        {heading && <h2 className="text-2xl sm:text-3xl font-bold mb-4">{heading}</h2>}
        {description && <p className="opacity-80 mb-8">{description}</p>}
        {cta_text && (
          <a
            href={cta_url || '#'}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-base transition-colors shadow-lg"
          >
            📝 {cta_text}
          </a>
        )}
      </div>
    </section>
  );
};
