import React from 'react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';

interface Props {
  config: Record<string, any>;
}

export const StepsSection: React.FC<Props> = ({ config }) => {
  const { heading, description, steps, bg_color, text_color } = config;
  const tc = text_color || undefined;
  const ts = tc ? { color: tc } : { color: 'white' };

  return (
    <section className="py-16 sm:py-20" style={{ backgroundColor: bg_color || '#0f172a' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3" style={ts}>{heading}</h2>}
        {description && <p className="text-center mb-12 max-w-2xl mx-auto" style={{ ...ts, opacity: 0.8 }}>{description}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(steps || []).map((step: any, i: number) => (
            <div key={i} className="text-center">
              <div className="text-4xl mb-4">{step.icon || '📦'}</div>
              <h3 className="text-lg font-bold mb-2" style={ts}>{step.title}</h3>
              <p className="text-sm" style={{ ...ts, opacity: 0.8 }}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
