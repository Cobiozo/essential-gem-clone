import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useZoomBackgrounds() {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    supabase
      .from('knowledge_resources')
      .select('source_url')
      .eq('category', 'Tło Zoom')
      .eq('resource_type', 'image')
      .order('title', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('[useZoomBackgrounds] Fetch error:', error);
          setBackgrounds([]);
        } else {
          const urls = (data || [])
            .map(r => r.source_url)
            .filter((u): u is string => !!u);
          setBackgrounds(urls);
        }
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { zoomBackgrounds: backgrounds, isLoadingZoom: isLoading };
}
