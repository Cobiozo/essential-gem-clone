import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Index from './Index';
import LandingV2 from '@/components/landing-v2/LandingV2';
import { useHomepageVariant } from '@/hooks/useHomepageConfig';

const HomepageSwitcher: React.FC = () => {
  const [params] = useSearchParams();
  const { variant, loading } = useHomepageVariant();
  const override = params.get('variant'); // 'v1' | 'v2' for preview

  if (loading && !override) {
    return <div className="min-h-screen bg-background" />;
  }

  const active = (override === 'v1' || override === 'v2') ? override : variant;
  const preferDraft = params.get('preview') === 'draft';

  if (active === 'v2') return <LandingV2 preferDraft={preferDraft} />;
  return <Index />;
};

export default HomepageSwitcher;
