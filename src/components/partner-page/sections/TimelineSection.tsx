import React from 'react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';

interface Props {
  config: Record<string, any>;
}

export const TimelineSection: React.FC<Props> = ({ config }) => {
  const { heading, milestones, text_align } = config;
  const ta = text_align as React.CSSProperties['textAlign'] || undefined;

  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6" style={{ textAlign: ta }}>
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-12" style={{ whiteSpace: 'pre-line' }}>{heading}</h2>}

        <div className="relative">
          {/* Line */}
          <div className="hidden md:block absolute top-8 left-0 right-0 h-1 bg-primary/20 rounded" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {(milestones || []).map((m: any, i: number) => (
              <div key={i} className="text-center relative">
                <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl mb-3 border-4 ${m.highlight ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`}>
                  {m.icon || '📌'}
                </div>
                <p className="text-sm font-bold text-foreground" style={{ whiteSpace: 'pre-line' }}>{m.month}</p>
                <p className="text-xs text-muted-foreground mt-1" style={{ whiteSpace: 'pre-line' }}>{m.title}</p>
              </div>
            ))}
          </div>
        </div>

        {config.inner_elements?.length > 0 && (
          <div className="mt-8">
            {config.inner_elements.map((el: any) => <InnerElementRenderer key={el.id} element={el} />)}
          </div>
        )}
      </div>
    </section>
  );
};
