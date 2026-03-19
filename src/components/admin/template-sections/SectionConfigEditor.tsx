import React from 'react';
import type { TemplateElement } from '@/types/partnerPage';
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
