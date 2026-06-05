import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NewsHubComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_hidden: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useNewsHubComments(postId: string | undefined, enabled = true) {
  const [comments, setComments] = useState<NewsHubComment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!postId || !enabled) { setComments([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await (supabase.from('news_hub_comments' as any) as any)
      .select('*')
      .eq('post_id', postId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    const list: NewsHubComment[] = (rows || []) as any;
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await (supabase.from('profiles' as any) as any)
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', ids);
      const map = new Map<string, any>((profs || []).map((p: any) => [p.user_id, p]));
      list.forEach((c) => { c.author = map.get(c.user_id) || null; });
    }
    setComments(list);
    setLoading(false);
  }, [postId, enabled]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!postId || !enabled) return;
    const ch = supabase
      .channel(`news_hub_comments:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_hub_comments', filter: `post_id=eq.${postId}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId, enabled, fetchAll]);

  const addComment = useCallback(async (userId: string, content: string) => {
    const trimmed = content.trim();
    if (trimmed.length < 2 || trimmed.length > 2000) throw new Error('Komentarz musi mieć od 2 do 2000 znaków.');
    const { error } = await (supabase.from('news_hub_comments' as any) as any)
      .insert({ post_id: postId, user_id: userId, content: trimmed });
    if (error) throw error;
  }, [postId]);

  const updateComment = useCallback(async (id: string, patch: Partial<Pick<NewsHubComment, 'content' | 'is_hidden' | 'is_pinned'>>) => {
    if (patch.content !== undefined) {
      const t = patch.content.trim();
      if (t.length < 2 || t.length > 2000) throw new Error('Komentarz musi mieć od 2 do 2000 znaków.');
      patch.content = t;
    }
    const { error } = await (supabase.from('news_hub_comments' as any) as any).update(patch).eq('id', id);
    if (error) throw error;
  }, []);

  const deleteComment = useCallback(async (id: string) => {
    const { error } = await (supabase.from('news_hub_comments' as any) as any).delete().eq('id', id);
    if (error) throw error;
  }, []);

  return { comments, loading, refresh: fetchAll, addComment, updateComment, deleteComment };
}
