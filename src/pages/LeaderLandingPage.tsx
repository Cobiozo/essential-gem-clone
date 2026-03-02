import React, { useEffect, useMemo } from 'react';
import { useSubdomainDetection } from '@/hooks/useSubdomainDetection';
import { useLeaderLandingPage } from '@/hooks/useLeaderLandingPage';
import { LandingBlockRenderer } from '@/components/leader-landing/LandingBlockRenderer';
import { Loader2 } from 'lucide-react';
import type { LandingBlock } from '@/types/leaderLanding';
import { trackLandingEvent } from '@/components/leader-landing/utils/analytics';

const LeaderLandingPage: React.FC = () => {
  const { eqId } = useSubdomainDetection();
  const { data: page, isLoading, error } = useLeaderLandingPage(eqId);

  // Set page meta
  useEffect(() => {
    if (page) {
      document.title = page.page_title || 'Strona partnera';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && page.page_description) {
        metaDesc.setAttribute('content', page.page_description);
      }
    }
  }, [page]);

  // Track page view
  useEffect(() => {
    if (page?.id) {
      const visitorId = getVisitorId();
      trackLandingEvent(page.id, 'view', { visitor_id: visitorId });
    }
  }, [page?.id]);

  const visibleBlocks = useMemo(() => {
    if (!page?.blocks) return [];
    return (page.blocks as LandingBlock[])
      .filter(b => b.visible !== false)
      .sort((a, b) => a.position - b.position);
  }, [page?.blocks]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page || error) {
    window.location.href = 'https://purelife.info.pl';
    return null;
  }

  return (
    <div className="min-h-screen bg-background" style={{ '--theme-color': page.theme_color } as React.CSSProperties}>
      {page.logo_url && (
        <header className="py-4 px-6 flex justify-center">
          <img src={page.logo_url} alt="Logo" className="h-12 object-contain" />
        </header>
      )}
      <main>
        {visibleBlocks.map(block => (
          <LandingBlockRenderer
            key={block.id}
            block={block}
            pageId={page.id}
            themeColor={page.theme_color}
            eqId={page.eq_id}
          />
        ))}
      </main>
      <footer className="py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Pure Life Center
      </footer>
    </div>
  );
};

function getVisitorId(): string {
  const key = 'pl_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default LeaderLandingPage;
