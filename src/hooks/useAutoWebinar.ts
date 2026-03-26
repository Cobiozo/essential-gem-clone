import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AutoWebinarVideo, AutoWebinarConfig } from '@/types/autoWebinar';

// Re-export sync hook from dedicated file
export { useAutoWebinarSync } from './useAutoWebinarSync';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 2000;

export type AutoWebinarCategory = 'business_opportunity' | 'health_conversation';

export function useAutoWebinarConfig(category: AutoWebinarCategory = 'business_opportunity') {
  const [config, setConfig] = useState<AutoWebinarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('auto_webinar_config')
        .select('*')
        .eq('category', category)
        .maybeSingle();
      if (fetchError) throw fetchError;
      setConfig(data as AutoWebinarConfig | null);
      setError(null);
      retryCount.current = 0;
    } catch (err: any) {
      console.error('[AutoWebinar] Config fetch error:', err);
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        const delay = RETRY_BASE_DELAY * Math.pow(2, retryCount.current - 1);
        setTimeout(fetchConfig, delay);
        return;
      }
      setError(err.message || 'Nie udało się załadować konfiguracji');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  return { config, loading, error, refetch: fetchConfig };
}

export function useAutoWebinarVideos(configId?: string | null) {
  const [videos, setVideos] = useState<AutoWebinarVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);

  const fetchVideos = useCallback(async () => {
    if (configId === undefined) {
      // No filter — legacy behavior
      try {
        const { data, error: fetchError } = await supabase
          .from('auto_webinar_videos')
          .select('*')
          .order('sort_order', { ascending: true });
        if (fetchError) throw fetchError;
        setVideos((data as AutoWebinarVideo[]) || []);
        setError(null);
        retryCount.current = 0;
      } catch (err: any) {
        console.error('[AutoWebinar] Videos fetch error:', err);
        if (retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          const delay = RETRY_BASE_DELAY * Math.pow(2, retryCount.current - 1);
          setTimeout(fetchVideos, delay);
          return;
        }
        setError(err.message || 'Nie udało się załadować filmów');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!configId) {
      setVideos([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('auto_webinar_videos')
        .select('*')
        .eq('config_id', configId)
        .order('sort_order', { ascending: true });
      if (fetchError) throw fetchError;
      setVideos((data as AutoWebinarVideo[]) || []);
      setError(null);
      retryCount.current = 0;
    } catch (err: any) {
      console.error('[AutoWebinar] Videos fetch error:', err);
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        const delay = RETRY_BASE_DELAY * Math.pow(2, retryCount.current - 1);
        setTimeout(fetchVideos, delay);
        return;
      }
      setError(err.message || 'Nie udało się załadować filmów');
    } finally {
      setLoading(false);
    }
  }, [configId]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  return { videos, loading, error, refetch: fetchVideos };
}
