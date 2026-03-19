import React from 'react';

interface Props {
  config: Record<string, any>;
}

export const StepsSection: React.FC<Props> = ({ config }) => {
  const { heading, description, steps, bg_color } = config;

  return (
    <section className="py-16 sm:py-20 text-white" style={{ backgroundColor: bg_color || '#0f172a' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">{heading}</h2>}
        {description && <p className="text-center opacity-80 mb-12 max-w-2xl mx-auto">{description}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(steps || []).map((step: any, i: number) => (
            <div key={i} className="text-center">
              <div className="text-4xl mb-4">{step.icon || '📦'}</div>
              <h3 className="text-lg font-bold mb-2">{step.title}</h3>
              <p className="text-sm opacity-80">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
