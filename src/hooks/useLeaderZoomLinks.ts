import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LeaderZoomLink {
  id: string;
  user_id: string;
  label: string;
  zoom_url: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaderZoomLinkWithOwner extends LeaderZoomLink {
  owner_name: string;
  owner_email: string;
}

/**
 * CRUD hook for the current user's own Zoom link library.
 */
export function useMyLeaderZoomLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<LeaderZoomLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    if (!user) {
      setLinks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('leader_zoom_links')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[useMyLeaderZoomLinks] fetch error:', error);
      setLinks([]);
    } else {
      setLinks((data || []) as LeaderZoomLink[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void fetchLinks(); }, [fetchLinks]);

  const createLink = async (input: { label: string; zoom_url: string; is_default?: boolean }) => {
    if (!user) return { error: new Error('Not authenticated') };
    if (input.is_default) {
      // Unset previous default
      await supabase.from('leader_zoom_links').update({ is_default: false }).eq('user_id', user.id);
    }
    const { error } = await supabase.from('leader_zoom_links').insert({
      user_id: user.id,
      label: input.label,
      zoom_url: input.zoom_url,
      is_default: !!input.is_default,
    });
    await fetchLinks();
    return { error };
  };

  const updateLink = async (id: string, patch: Partial<Pick<LeaderZoomLink, 'label' | 'zoom_url' | 'is_default'>>) => {
    if (!user) return { error: new Error('Not authenticated') };
    if (patch.is_default) {
      await supabase.from('leader_zoom_links').update({ is_default: false }).eq('user_id', user.id).neq('id', id);
    }
    const { error } = await supabase.from('leader_zoom_links').update(patch).eq('id', id);
    await fetchLinks();
    return { error };
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase.from('leader_zoom_links').delete().eq('id', id);
    await fetchLinks();
    return { error };
  };

  return { links, loading, refetch: fetchLinks, createLink, updateLink, deleteLink };
}

/**
 * Admin-only hook: fetch all leader zoom links with owner name/email joined via profiles.
 */
export function useAllLeaderZoomLinks(enabled: boolean = true) {
  const [links, setLinks] = useState<LeaderZoomLinkWithOwner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLinks([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: rawLinks, error } = await supabase
        .from('leader_zoom_links')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[useAllLeaderZoomLinks] fetch error:', error);
        if (!cancelled) { setLinks([]); setLoading(false); }
        return;
      }
      const userIds = Array.from(new Set((rawLinks || []).map(l => l.user_id)));
      let profilesMap = new Map<string, { name: string; email: string }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        (profiles || []).forEach((p: any) => {
          profilesMap.set(p.user_id, {
            name: p.full_name || p.email || 'Lider',
            email: p.email || '',
          });
        });
      }
      const enriched: LeaderZoomLinkWithOwner[] = (rawLinks || []).map((l: any) => ({
        ...l,
        owner_name: profilesMap.get(l.user_id)?.name || 'Lider',
        owner_email: profilesMap.get(l.user_id)?.email || '',
      }));
      if (!cancelled) {
        setLinks(enriched);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  return { links, loading };
}
