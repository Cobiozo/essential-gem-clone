import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { AutoWebinarEmbed } from '@/components/auto-webinar/AutoWebinarEmbed';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import type { AutoWebinarCategory } from '@/hooks/useAutoWebinar';
import newPureLifeLogo from '@/assets/pure-life-droplet-new.png';

const AutoWebinarPublicPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const guestSlotTime = searchParams.get('slot');
  const guestRef = searchParams.get('ref');
  const guestEmail = guestRef ? (() => { try { return atob(guestRef); } catch { return null; } })() : null;

  const [category, setCategory] = useState<AutoWebinarCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) { setError(true); setLoading(false); return; }

    const resolve = async () => {
      const { data: event } = await supabase
        .from('events')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!event) { setError(true); setLoading(false); return; }

      const { data: config } = await supabase
        .from('auto_webinar_config')
        .select('category')
        .eq('event_id', event.id)
        .single();

      if (config?.category) {
        setCategory(config.category as AutoWebinarCategory);
      } else {
        // Fallback for events without config — default to business_opportunity
        setCategory('business_opportunity');
      }
      setLoading(false);
    };

    resolve();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Nie znaleziono webinaru</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3">
          <img src={newPureLifeLogo} alt="Pure Life" className="h-6 sm:h-8 object-contain" />
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Webinar na żywo</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        <AutoWebinarEmbed isGuest guestSlotTime={guestSlotTime} guestEmail={guestEmail} category={category} />
      </main>
    </div>
  );
};

export default AutoWebinarPublicPage;
