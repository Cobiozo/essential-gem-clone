import React, { useRef, useEffect, useCallback } from 'react';
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

const fontSizeMap: Record<string, string> = {
  sm: 'text-xs',
  base: 'text-sm',
  lg: 'text-base',
};

export const TestimonialsSection: React.FC<Props> = ({ config }) => {
  const {
    heading, subtitle, cards, text_align,
    card_width, card_bg_color, card_text_color,
    card_border_radius, card_font_size, avatar_size,
    auto_scroll, auto_scroll_interval,
  } = config;

  const ta = text_align as React.CSSProperties['textAlign'] || undefined;
  const scrollRef = useRef<HTMLDivElement>(null);
  const w = card_width || 220;
  const avatarPx = avatar_size || 80;
  const radius = card_border_radius ?? 16;
  const fontSize = fontSizeMap[card_font_size || 'base'] || 'text-sm';
  const txtStyle: React.CSSProperties = card_text_color ? { color: card_text_color } : {};

  const scroll = useCallback((dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (dir > 0 && el.scrollLeft >= maxScroll - 10) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: dir * (w + 16), behavior: 'smooth' });
    }
  }, [w]);

  useEffect(() => {
    if (!auto_scroll) return;
    const interval = setInterval(() => scroll(1), (auto_scroll_interval || 5) * 1000);
    return () => clearInterval(interval);
  }, [auto_scroll, auto_scroll_interval, scroll]);

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
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 sm:-left-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Przewiń w lewo"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {(cards || []).map((card: any, i: number) => {
              const gradient = cardGradients[i % cardGradients.length];
              const cardStyle: React.CSSProperties = {
                width: w,
                minWidth: w,
                borderRadius: radius,
                ...(card_bg_color ? { backgroundColor: card_bg_color } : {}),
                ...txtStyle,
              };

              return (
                <div
                  key={i}
                  className={`flex-shrink-0 snap-center ${!card_bg_color ? `bg-gradient-to-br ${gradient}` : ''} border border-border/50 p-5 flex flex-col items-center text-center shadow-sm`}
                  style={cardStyle}
                >
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.name || ''}
                      className="rounded-full object-cover border-2 border-white shadow-sm mb-3"
                      style={{ width: avatarPx, height: avatarPx }}
                    />
                  ) : (
                    <div
                      className="rounded-full bg-primary/10 flex items-center justify-center mb-3 border-2 border-white shadow-sm"
                      style={{ width: avatarPx, height: avatarPx }}
                    >
                      <span className="text-primary font-bold text-2xl">
                        {(card.name || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {card.name && (
                    <p className={`font-semibold ${fontSize} mb-1`} style={{ whiteSpace: 'pre-line', ...txtStyle }}>
                      {card.name}
                    </p>
                  )}

                  {card.label && (
                    <p className={`${fontSize} text-muted-foreground mb-3 leading-relaxed`} style={{ whiteSpace: 'pre-line' }}>
                      {card.label}
                    </p>
                  )}

                  <div className="w-full space-y-1.5 mt-auto">
                    {card.before && (
                      <div className={`flex items-center justify-between gap-1 ${fontSize}`}>
                        <span className="text-muted-foreground">{card.before_label || 'PRZED:'}</span>
                        <span className="font-bold" style={txtStyle}>{card.before}</span>
                        <span className="text-sm">🔴</span>
                      </div>
                    )}
                    {card.after && (
                      <div className={`flex items-center justify-between gap-1 ${fontSize}`}>
                        <span className="text-muted-foreground">{card.after_label || 'PO:'}</span>
                        <span className="font-bold" style={txtStyle}>{card.after}</span>
                        <span className="text-sm">🟢</span>
                      </div>
                    )}
                  </div>

                  {card.description && (
                    <p className="text-[10px] text-muted-foreground mt-2 leading-tight" style={{ whiteSpace: 'pre-line' }}>
                      {card.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => scroll(1)}
            className="absolute right-0 sm:-right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Przewiń w prawo"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
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