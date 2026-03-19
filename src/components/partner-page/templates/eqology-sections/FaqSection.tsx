import React from 'react';
import type { EqologyFaqSection, EqologyTheme } from '@/types/eqologyTemplate';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface Props {
  data: EqologyFaqSection;
  theme: EqologyTheme;
}

export const FaqSection: React.FC<Props> = ({ data, theme }) => {
  return (
    <section style={{ backgroundColor: theme.bgColor }} className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-6">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12"
          style={{ color: theme.primaryColor }}
        >
          {data.title}
        </h2>
        <Accordion type="single" collapsible className="space-y-3">
          {data.items.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border border-gray-200 px-5 overflow-hidden"
              style={{ backgroundColor: theme.bgAlt }}
            >
              <AccordionTrigger className="text-left font-semibold text-base hover:no-underline py-5" style={{ color: theme.primaryColor }}>
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 text-sm leading-relaxed pb-5">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
