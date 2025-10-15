import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface AccordionItemData {
  title: string;
  content: string;
}

interface AccordionElementProps {
  items: AccordionItemData[];
  defaultValue?: string;
  className?: string;
}

export const AccordionElement: React.FC<AccordionElementProps> = ({
  items,
  defaultValue,
  className,
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
        Dodaj elementy do akordeonu
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible defaultValue={defaultValue} className={className}>
      {items.map((item, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
