import React from 'react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';

interface Props {
  config: Record<string, any>;
}

export const TimelineSection: React.FC<Props> = ({ config }) => {
  const { heading, milestones } = config;

  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-12">{heading}</h2>}

        <div className="relative">
          {/* Line */}
          <div className="hidden md:block absolute top-8 left-0 right-0 h-1 bg-primary/20 rounded" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {(milestones || []).map((m: any, i: number) => (
              <div key={i} className="text-center relative">
                <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl mb-3 border-4 ${m.highlight ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`}>
                  {m.icon || '📌'}
                </div>
                <p className="text-sm font-bold text-foreground">{m.month}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
