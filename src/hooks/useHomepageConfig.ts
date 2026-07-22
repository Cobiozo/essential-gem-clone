import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { HomepageV2Content, HomepageVariant } from '@/types/homepageV2';

export function useHomepageVariant() {
  const [variant, setVariant] = useState<HomepageVariant | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase.from('homepage_settings' as any) as any)
      .select('active_variant')
      .maybeSingle();
    setVariant((data?.active_variant as HomepageVariant) || 'v1');
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await load();
    })();

    const channel = supabase
      .channel('homepage_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_settings' }, (payload: any) => {
        const v = payload?.new?.active_variant as HomepageVariant | undefined;
        if (v) setVariant(v);
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [load]);

  return { variant, loading, reload: load };
}

export function useHomepageV2Content(preferDraft = false) {
  const [content, setContent] = useState<HomepageV2Content | null>(null);
  const [draft, setDraft] = useState<HomepageV2Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await (supabase.from('homepage_v2_content' as any) as any)
      .select('id, content, draft_content')
      .maybeSingle();
    if (data) {
      setRowId(data.id);
      setContent(withDefaults(data.content as HomepageV2Content));
      setDraft(data.draft_content ? withDefaults(data.draft_content as HomepageV2Content) : null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('homepage_v2_content_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_v2_content' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const active = preferDraft ? (draft ?? content) : content;
  return { content: active, published: content, draft, loading, rowId, reload: load };
}
