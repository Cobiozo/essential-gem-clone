import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Plus } from 'lucide-react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';
import { getPatternStyle } from '@/lib/bgPatterns';

interface Props {
  config: Record<string, any>;
}

export const FaqSection: React.FC<Props> = ({ config }) => {
  const { heading, items, bg_color, text_color, text_align } = config;
  const tc = text_color || undefined;
  const ts = tc ? { color: tc } : undefined;
  const ta = text_align as React.CSSProperties['textAlign'] || undefined;

  return (
    <section className="relative py-16 sm:py-20 overflow-hidden" style={{ backgroundColor: bg_color || undefined }}>
      {config.bg_pattern && config.bg_pattern !== 'none' && (
        <div className="absolute inset-0 pointer-events-none z-0" style={getPatternStyle(config.bg_pattern, config.bg_pattern_opacity, config.bg_pattern_color, bg_color)} />
      )}
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6" style={{ textAlign: ta }}>
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10" style={{ ...ts, whiteSpace: 'pre-line' }}>{heading}</h2>}

        <div className="space-y-3">
          {(items || []).map((item: any, i: number) => (
            <Collapsible key={i}>
              <CollapsibleTrigger className="flex items-center justify-between w-full bg-card border border-border rounded-xl px-5 py-4 text-left hover:bg-muted/50 transition-colors group">
                <span className="font-medium" style={{ ...ts, whiteSpace: 'pre-line' }}>{item.question}</span>
                <Plus className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-45" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-5 py-4 text-sm" style={ts ? { color: tc, opacity: 0.8, whiteSpace: 'pre-line' } : { whiteSpace: 'pre-line' }}>
                {item.answer}
              </CollapsibleContent>
            </Collapsible>
          ))}
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
