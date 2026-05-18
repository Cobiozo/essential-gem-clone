import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type NewsHubGridLayout = 'bento' | 'centered' | 'cols-2' | 'cols-3' | 'cols-4';

const LS_KEY = 'newsHub.gridLayout.user';

export function useNewsHubSettings() {
  const [adminLayout, setAdminLayout] = useState<NewsHubGridLayout>('bento');
  const [userLayout, setUserLayoutState] = useState<NewsHubGridLayout | null>(() => {
    try {
      const v = localStorage.getItem(LS_KEY);
      return (v as NewsHubGridLayout) || null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from('news_hub_settings' as any) as any)
      .select('grid_layout').eq('id', true).maybeSingle();
    if (data?.grid_layout) setAdminLayout(data.grid_layout as NewsHubGridLayout);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel('news_hub_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_hub_settings' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  const setUserLayout = useCallback((layout: NewsHubGridLayout | null) => {
    setUserLayoutState(layout);
    try {
      if (layout) localStorage.setItem(LS_KEY, layout);
      else localStorage.removeItem(LS_KEY);
    } catch {}
  }, []);

  const saveAdminLayout = useCallback(async (layout: NewsHubGridLayout) => {
    setAdminLayout(layout);
    await (supabase.from('news_hub_settings' as any) as any)
      .upsert({ id: true, grid_layout: layout, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  }, []);

  const effectiveLayout: NewsHubGridLayout = userLayout || adminLayout;

  return { adminLayout, userLayout, effectiveLayout, loading, saveAdminLayout, setUserLayout, refresh };
}
