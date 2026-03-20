import React from 'react';
import type { TemplateElement } from '@/types/partnerPage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  HeroSectionEditor,
  StepsSectionEditor,
  TimelineSectionEditor,
  TestimonialsSectionEditor,
  FaqSectionEditor,
  CtaBannerEditor,
  TextImageSectionEditor,
  ProductsGridEditor,
  HeaderSectionEditor,
  ContactFormEditor,
  FooterSectionEditor,
  ProductsWithFormEditor,
} from './index';

export const SectionConfigEditor: React.FC<{
  element: TemplateElement;
  onConfigChange: (config: Record<string, any>) => void;
}> = ({ element, onConfigChange }) => {
  const cfg = element.config || {};

  const renderTypeEditor = () => {
    switch (element.type) {
      case 'hero': return <HeroSectionEditor config={cfg} onChange={onConfigChange} />;
      case 'text_image': return <TextImageSectionEditor config={cfg} onChange={onConfigChange} />;
      case 'steps': return <StepsSectionEditor config={cfg} onChange={onConfigChange} />;
      case 'timeline': return <TimelineSectionEditor config={cfg} onChange={onConfigChange} />;
      case 'testimonials': return <TestimonialsSectionEditor config={cfg} onChange={onConfigChange} />;
      case 'products_grid': return <ProductsGridEditor config={cfg} onChange={onConfigChange} />;
      case 'faq': return <FaqSectionEditor config={cfg} onChange={onConfigChange} />;
      case 'cta_banner': return <CtaBannerEditor config={cfg} onChange={onConfigChange} />;
      case 'header': return <HeaderSectionEditor config={cfg} onChange={onConfigChange} />;
      case 'contact_form': return <ContactFormEditor config={cfg} onChange={onConfigChange} />;
      case 'footer': return <FooterSectionEditor config={cfg} onChange={onConfigChange} />;
      case 'products_with_form': return <ProductsWithFormEditor config={cfg} onChange={onConfigChange} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Common anchor_id field */}
      <div>
        <Label className="text-xs text-muted-foreground">Kotwica sekcji (anchor ID)</Label>
        <Input
          value={cfg.anchor_id || ''}
          onChange={e => onConfigChange({ ...cfg, anchor_id: e.target.value })}
          placeholder="np. kontakt, produkty, o-mnie"
          className="h-8 text-xs"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Użyj w linkach nagłówka: <code className="bg-muted px-1 rounded">#kontakt</code>
        </p>
      </div>
      {renderTypeEditor()}
    </div>
  );
};
