import React from 'react';
import type { EqologyTemplateData } from '@/types/eqologyTemplate';
import type { ProductCatalogItem, PartnerProductLink } from '@/types/partnerPage';
import { HeroSection } from './eqology-sections/HeroSection';
import { ProblemSection } from './eqology-sections/ProblemSection';
import { ScaleSection } from './eqology-sections/ScaleSection';
import { HowItWorksSection } from './eqology-sections/HowItWorksSection';
import { TimelineSection } from './eqology-sections/TimelineSection';
import { GuaranteeSection } from './eqology-sections/GuaranteeSection';
import { SocialProofSection } from './eqology-sections/SocialProofSection';
import { ProductCardsSection } from './eqology-sections/ProductCardsSection';
import { FaqSection } from './eqology-sections/FaqSection';
import { FooterSurveySection } from './eqology-sections/FooterSurveySection';

interface Props {
  templateData: EqologyTemplateData;
  catalogProducts: ProductCatalogItem[];
  partnerLinks: PartnerProductLink[];
  partnerName?: string;
}

const EqologyTemplate: React.FC<Props> = ({ templateData, catalogProducts, partnerLinks, partnerName }) => {
  const { theme, sections } = templateData;

  // Get primary CTA URL from first available partner link
  const primaryCtaUrl = partnerLinks.length > 0 ? partnerLinks[0].purchase_url : sections.products.products[0]?.defaultCtaUrl;

  return (
    <div style={{ fontFamily: `${theme.fontFamily}, sans-serif` }} className="min-h-screen">
      <HeroSection data={sections.hero} theme={theme} primaryCtaUrl={primaryCtaUrl} />
      <ProblemSection data={sections.problem} theme={theme} />
      <ScaleSection data={sections.scale} theme={theme} />
      <HowItWorksSection data={sections.howItWorks} theme={theme} />
      <TimelineSection data={sections.timeline} theme={theme} />
      <GuaranteeSection data={sections.guarantee} theme={theme} />
      <SocialProofSection data={sections.socialProof} theme={theme} />
      <ProductCardsSection
        data={sections.products}
        theme={theme}
        catalogProducts={catalogProducts}
        partnerLinks={partnerLinks}
      />
      <FaqSection data={sections.faq} theme={theme} />
      <FooterSurveySection data={sections.footerSurvey} theme={theme} />
    </div>
  );
};

export default EqologyTemplate;
