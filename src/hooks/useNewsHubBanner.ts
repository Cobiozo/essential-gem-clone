import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NewsHubBannerConfig {
  enabled: boolean;
  image_url: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_url: string | null;
  fit: 'cover' | 'contain' | 'fill';
  position: string;
  height: number;
  overlay_color: string;
  overlay_opacity: number;
  overlay_gradient: boolean;
  title_color: string;
  subtitle_color: string;
  text_align: 'left' | 'center' | 'right';
  title_size: number;
}

const DEFAULTS: NewsHubBannerConfig = {
  enabled: false,
  image_url: null,
  title: 'Centrum Aktualności',
  subtitle: 'Ogłoszenia, artykuły, wideo, pliki i wiele więcej.',
  cta_label: null,
  cta_url: null,
  fit: 'cover',
  position: 'center',
  height: 320,
  overlay_color: '#000000',
  overlay_opacity: 0.4,
  overlay_gradient: true,
  title_color: '#ffffff',
  subtitle_color: '#e5e7eb',
  text_align: 'left',
  title_size: 40,
};

export function useNewsHubBanner() {
  const [config, setConfig] = useState<NewsHubBannerConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await (supabase.from('news_hub_banner_config' as any) as any)
      .select('*').eq('id', true).maybeSingle();
    if (data) setConfig({ ...DEFAULTS, ...data });
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel('news_hub_banner_config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_hub_banner_config' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  const save = useCallback(async (patch: Partial<NewsHubBannerConfig>) => {
    const next = { ...config, ...patch, updated_at: new Date().toISOString() };
    setConfig(next as NewsHubBannerConfig);
    const { error } = await (supabase.from('news_hub_banner_config' as any) as any)
      .upsert({ id: true, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) throw error;
  }, [config]);

  return { config, loading, save, refresh };
}
