import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { NewsHubTemplate } from '@/types/newsHubBlocks';

export function useNewsHubTemplates() {
  const [templates, setTemplates] = useState<NewsHubTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from('news_hub_templates' as any) as any)
      .select('*')
      .order('is_system', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    setTemplates((data as NewsHubTemplate[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { templates, loading, refresh };
}
