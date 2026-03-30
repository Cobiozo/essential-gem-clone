import React from 'react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';
import { getPatternStyle } from '@/lib/bgPatterns';

interface Props {
  config: Record<string, any>;
}

export const TimelineSection: React.FC<Props> = ({ config }) => {
  const { heading, subtitle, milestones, text_align, bg_color, text_color, line_color, highlight_text_color } = config;
  const ta = text_align as React.CSSProperties['textAlign'] || undefined;
  const items: any[] = milestones || [];
  const count = items.length;

  const colsClass = count <= 3 ? 'md:grid-cols-3'
    : count === 4 ? 'md:grid-cols-4'
    : count === 5 ? 'md:grid-cols-5'
    : 'md:grid-cols-6';

  return (
    <section className="relative py-16 sm:py-20 overflow-hidden" style={{ backgroundColor: bg_color || undefined, color: text_color || undefined }}>
      {config.bg_pattern && config.bg_pattern !== 'none' && (
        <div className="absolute inset-0 pointer-events-none z-0" style={getPatternStyle(config.bg_pattern, config.bg_pattern_opacity, config.bg_pattern_color, bg_color)} />
      )}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6" style={{ textAlign: ta }}>
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4" style={{ whiteSpace: 'pre-line', color: text_color || undefined }}>{heading}</h2>}
        {subtitle && <p className="text-center text-sm sm:text-base opacity-80 mb-12 max-w-2xl mx-auto" style={{ whiteSpace: 'pre-line' }}>{subtitle}</p>}

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-7 left-0 right-0 h-0.5 rounded" style={{ backgroundColor: line_color || 'rgba(255,255,255,0.15)' }} />

          <div className={`grid grid-cols-1 ${colsClass} gap-8`}>
            {items.map((m: any, i: number) => (
              <div key={i} className="text-center relative">
                <div
                  className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-lg font-bold mb-3 border-2 ${m.highlight ? 'border-transparent' : 'border-white/20'}`}
                  style={{
                    backgroundColor: m.highlight ? (line_color || 'hsl(var(--primary))') : 'rgba(255,255,255,0.08)',
                    color: m.highlight ? '#fff' : (text_color || undefined),
                  }}
                >
                  {m.icon || (i + 1)}
                </div>
                <p className="text-sm font-bold" style={{ whiteSpace: 'pre-line', color: m.highlight ? (highlight_text_color || '#facc15') : (text_color || undefined) }}>{m.month}</p>
                <p className="text-xs mt-1 opacity-70" style={{ whiteSpace: 'pre-line' }}>{m.title}</p>
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
