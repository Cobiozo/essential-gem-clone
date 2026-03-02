import React from 'react';
import type { LandingBlock } from '@/types/leaderLanding';
import { HeroBlock } from './blocks/HeroBlock';
import { TextBlock } from './blocks/TextBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { QuizBlock } from './blocks/QuizBlock';
import { ProductsBlock } from './blocks/ProductsBlock';
import { CtaButtonBlock } from './blocks/CtaButtonBlock';
import { TestimonialBlock } from './blocks/TestimonialBlock';
import { VideoBlock } from './blocks/VideoBlock';
import { FormBlock } from './blocks/FormBlock';
import { DividerBlock } from './blocks/DividerBlock';

interface Props {
  block: LandingBlock;
  pageId: string;
  themeColor: string;
  eqId: string;
}

export const LandingBlockRenderer: React.FC<Props> = ({ block, pageId, themeColor, eqId }) => {
  const props = { data: block.data as any, blockId: block.id, pageId, themeColor, eqId };

  switch (block.type) {
    case 'hero': return <HeroBlock {...props} />;
    case 'text': return <TextBlock {...props} />;
    case 'image': return <ImageBlock {...props} />;
    case 'quiz': return <QuizBlock {...props} />;
    case 'products': return <ProductsBlock {...props} />;
    case 'cta_button': return <CtaButtonBlock {...props} />;
    case 'testimonial': return <TestimonialBlock {...props} />;
    case 'video': return <VideoBlock {...props} />;
    case 'form': return <FormBlock {...props} />;
    case 'divider': return <DividerBlock {...props} />;
    default: return null;
  }
};
