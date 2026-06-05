import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NewsHubComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_hidden: boolean;
  is_pinned: boolean;
  is_pending_review?: boolean;
  flagged_words?: string[];
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_decision?: 'approved' | 'rejected' | null;
  created_at: string;
  updated_at: string;
  author?: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const EDIT_WINDOW_MS = 60 * 1000;

export function canAuthorEditNow(c: Pick<NewsHubComment, 'created_at' | 'is_pending_review'>) {
  if (c.is_pending_review) return false;
  return Date.now() - new Date(c.created_at).getTime() < EDIT_WINDOW_MS;
}

async function attachAuthors(list: NewsHubComment[]) {
  const ids = Array.from(new Set(list.map((c) => c.user_id)));
  if (!ids.length) return list;
  const { data: profs } = await (supabase.from('profiles' as any) as any)
    .select('user_id, first_name, last_name, avatar_url')
    .in('user_id', ids);
  const map = new Map<string, any>((profs || []).map((p: any) => [p.user_id, p]));
  list.forEach((c) => { c.author = map.get(c.user_id) || null; });
  return list;
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
    await attachAuthors(list);
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
    const { data, error } = await (supabase.from('news_hub_comments' as any) as any)
      .insert({ post_id: postId, user_id: userId, content: trimmed })
      .select('*')
      .single();
    if (error) throw error;
    // Optimistic local insert (realtime will reconcile)
    if (data) {
      const inserted: NewsHubComment = data as any;
      await attachAuthors([inserted]);
      setComments((prev) => [inserted, ...prev.filter((c) => c.id !== inserted.id)]);
      return inserted;
    }
  }, [postId]);

  const updateComment = useCallback(async (id: string, patch: Partial<Pick<NewsHubComment, 'content' | 'is_hidden' | 'is_pinned' | 'is_pending_review' | 'review_decision'>>) => {
    if (patch.content !== undefined) {
      const t = patch.content.trim();
      if (t.length < 2 || t.length > 2000) throw new Error('Komentarz musi mieć od 2 do 2000 znaków.');
      patch.content = t;
    }
    const { error } = await (supabase.from('news_hub_comments' as any) as any).update(patch).eq('id', id);
    if (error) throw error;
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } as NewsHubComment : c));
  }, []);

  const deleteComment = useCallback(async (id: string) => {
    const prev = comments;
    // Optimistic remove
    setComments((cs) => cs.filter((c) => c.id !== id));
    const { error } = await (supabase.from('news_hub_comments' as any) as any).delete().eq('id', id);
    if (error) {
      setComments(prev);
      throw error;
    }
  }, [comments]);

  return { comments, loading, refresh: fetchAll, addComment, updateComment, deleteComment };
}
