export interface EqologyTheme {
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  bgAlt: string;
  fontFamily: string;
}

export interface EqologyHeroSection {
  title: string;
  subtitle: string;
  description: string;
  bgImageUrl: string;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
  ctaSecondaryUrl: string;
}

export interface EqologyProblemSection {
  title: string;
  items: string[];
}

export interface EqologyScaleSection {
  title: string;
  description: string;
  stat: string;
}

export interface EqologyStep {
  icon: string;
  title: string;
  description: string;
}

export interface EqologyHowItWorksSection {
  title: string;
  steps: EqologyStep[];
  videoUrl: string;
}

export interface EqologyMilestone {
  month: string;
  title: string;
  description: string;
}

export interface EqologyTimelineSection {
  title: string;
  milestones: EqologyMilestone[];
}

export interface EqologyGuaranteeSection {
  title: string;
  description: string;
}

export interface EqologySocialProofItem {
  name: string;
  beforeRatio: string;
  afterRatio: string;
}

export interface EqologySocialProofSection {
  title: string;
  items: EqologySocialProofItem[];
}

export interface EqologyFaqItem {
  question: string;
  answer: string;
}

export interface EqologyFaqSection {
  title: string;
  items: EqologyFaqItem[];
}

export interface EqologyFooterSurveySection {
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
}

export interface EqologyProductCard {
  id: string;
  name: string;
  tier: string;
  description: string;
  imageUrl: string;
  ingredients: string;
  defaultCtaUrl: string;
}

export interface EqologyProductsSection {
  title: string;
  products: EqologyProductCard[];
}

export interface EqologySections {
  hero: EqologyHeroSection;
  problem: EqologyProblemSection;
  scale: EqologyScaleSection;
  howItWorks: EqologyHowItWorksSection;
  timeline: EqologyTimelineSection;
  guarantee: EqologyGuaranteeSection;
  socialProof: EqologySocialProofSection;
  products: EqologyProductsSection;
  faq: EqologyFaqSection;
  footerSurvey: EqologyFooterSurveySection;
}

export interface EqologyTemplateData {
  template_type: 'eqology_omega3';
  theme: EqologyTheme;
  sections: EqologySections;
}
