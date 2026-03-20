import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';

interface Props {
  config: Record<string, any>;
}

const cardGradients = [
  'from-rose-50 to-pink-50',
  'from-emerald-50 to-teal-50',
  'from-sky-50 to-blue-50',
  'from-amber-50 to-yellow-50',
  'from-violet-50 to-purple-50',
  'from-orange-50 to-red-50',
];

export const TestimonialsSection: React.FC<Props> = ({ config }) => {
  const { heading, subtitle, cards, text_align } = config;
  const ta = text_align as React.CSSProperties['textAlign'] || undefined;
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' });
  };

  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6" style={{ textAlign: ta }}>
        {heading && (
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-2" style={{ whiteSpace: 'pre-line' }}>
            {heading}
          </h2>
        )}
        {subtitle && (
          <p className="text-center text-muted-foreground mb-10" style={{ whiteSpace: 'pre-line' }}>
            {subtitle}
          </p>
        )}

        <div className="relative">
          {/* Left arrow */}
          <button
            onClick={() => scroll(-1)}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Przewiń w lewo"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>

          {/* Scrollable container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {(cards || []).map((card: any, i: number) => {
              const gradient = cardGradients[i % cardGradients.length];
              return (
                <div
                  key={i}
                  className={`flex-shrink-0 w-[220px] snap-center rounded-2xl bg-gradient-to-br ${gradient} border border-border/50 p-5 flex flex-col items-center text-center shadow-sm`}
                >
                  {/* Avatar */}
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.name || ''}
                      className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-sm mb-3"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3 border-2 border-white shadow-sm">
                      <span className="text-primary font-bold text-2xl">
                        {(card.name || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Name */}
                  {card.name && (
                    <p className="font-semibold text-foreground text-sm mb-1" style={{ whiteSpace: 'pre-line' }}>
                      {card.name}
                    </p>
                  )}

                  {/* Description */}
                  {card.label && (
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed" style={{ whiteSpace: 'pre-line' }}>
                      {card.label}
                    </p>
                  )}

                  {/* Before / After */}
                  <div className="w-full space-y-1.5 mt-auto">
                    {card.before && (
                      <div className="flex items-center justify-between gap-1 text-xs">
                        <span className="text-muted-foreground">{card.before_label || 'PRZED:'}</span>
                        <span className="font-bold text-foreground">{card.before}</span>
                        <span className="text-red-500 text-sm">🔴</span>
                      </div>
                    )}
                    {card.after && (
                      <div className="flex items-center justify-between gap-1 text-xs">
                        <span className="text-muted-foreground">{card.after_label || 'PO:'}</span>
                        <span className="font-bold text-foreground">{card.after}</span>
                        <span className="text-green-500 text-sm">🟢</span>
                      </div>
                    )}
                  </div>

                  {/* Card description */}
                  {card.description && (
                    <p className="text-[10px] text-muted-foreground mt-2 leading-tight" style={{ whiteSpace: 'pre-line' }}>
                      {card.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right arrow */}
          <button
            onClick={() => scroll(1)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Przewiń w prawo"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
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
