import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Plus } from 'lucide-react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';

interface Props {
  config: Record<string, any>;
}

export const FaqSection: React.FC<Props> = ({ config }) => {
  const { heading, items, bg_color, text_color } = config;
  const tc = text_color || undefined;
  const ts = tc ? { color: tc } : undefined;

  return (
    <section className="py-16 sm:py-20" style={{ backgroundColor: bg_color || undefined }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10" style={ts}>{heading}</h2>}

        <div className="space-y-3">
          {(items || []).map((item: any, i: number) => (
            <Collapsible key={i}>
              <CollapsibleTrigger className="flex items-center justify-between w-full bg-card border border-border rounded-xl px-5 py-4 text-left hover:bg-muted/50 transition-colors group">
                <span className="font-medium" style={ts}>{item.question}</span>
                <Plus className="w-5 h-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-45" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-5 py-4 text-sm" style={ts ? { color: tc, opacity: 0.8 } : undefined}>
                {item.answer}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </section>
  );
};
