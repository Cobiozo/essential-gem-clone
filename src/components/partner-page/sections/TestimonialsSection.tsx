import React from 'react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';

interface Props {
  config: Record<string, any>;
}

export const TestimonialsSection: React.FC<Props> = ({ config }) => {
  const { heading, cards } = config;

  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-10">{heading}</h2>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(cards || []).map((card: any, i: number) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <p className="font-semibold text-foreground mb-3">{card.label}</p>
              <div className="space-y-2 mb-4">
                {card.before && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">PRZED:</span>
                    <span className="font-bold">{card.before}</span>
                    <span className="text-red-500">🔴</span>
                  </div>
                )}
                {card.after && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">PO:</span>
                    <span className="font-bold">{card.after}</span>
                    <span className="text-green-500">🟢</span>
                  </div>
                )}
              </div>
              {card.description && (
                <p className="text-xs text-muted-foreground">{card.description}</p>
              )}
              {card.image && (
                <img src={card.image} alt="" className="mt-4 rounded-lg w-full object-cover max-h-40" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
