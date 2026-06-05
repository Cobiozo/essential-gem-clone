import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NewsHubReactionSummary {
  up: number;
  down: number;
  mine: -1 | 0 | 1;
}

export interface NewsHubComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
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
  reactions: NewsHubReactionSummary;
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

async function attachReactions(list: NewsHubComment[], myUserId: string | null) {
  const ids = list.map((c) => c.id);
  if (!ids.length) return list;
  const { data: rxs } = await (supabase.from('news_hub_comment_reactions' as any) as any)
    .select('comment_id, user_id, value')
    .in('comment_id', ids);
  const agg = new Map<string, NewsHubReactionSummary>();
  ids.forEach((id) => agg.set(id, { up: 0, down: 0, mine: 0 }));
  (rxs || []).forEach((r: any) => {
    const a = agg.get(r.comment_id)!;
    if (r.value === 1) a.up += 1; else if (r.value === -1) a.down += 1;
    if (myUserId && r.user_id === myUserId) a.mine = r.value;
  });
  list.forEach((c) => { c.reactions = agg.get(c.id) || { up: 0, down: 0, mine: 0 }; });
  return list;
}

export function useNewsHubComments(postId: string | undefined, enabled = true) {
  const [comments, setComments] = useState<NewsHubComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id || null));
  }, []);

  const fetchAll = useCallback(async () => {
    if (!postId || !enabled) { setComments([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await (supabase.from('news_hub_comments' as any) as any)
      .select('*')
      .eq('post_id', postId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    const list: NewsHubComment[] = (rows || []).map((r: any) => ({ ...r, reactions: { up: 0, down: 0, mine: 0 } })) as any;
    await attachAuthors(list);
    await attachReactions(list, myUserId);
    setComments(list);
    setLoading(false);
  }, [postId, enabled, myUserId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!postId || !enabled) return;
    const ch = supabase
      .channel(`news_hub_comments:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_hub_comments', filter: `post_id=eq.${postId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_hub_comment_reactions' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId, enabled, fetchAll]);

  const addComment = useCallback(async (userId: string, content: string, parentId: string | null = null) => {
    const trimmed = content.trim();
    if (trimmed.length < 2 || trimmed.length > 2000) throw new Error('Komentarz musi mieć od 2 do 2000 znaków.');
    const { data, error } = await (supabase.from('news_hub_comments' as any) as any)
      .insert({ post_id: postId, user_id: userId, content: trimmed, parent_id: parentId })
      .select('*')
      .single();
    if (error) throw error;
    if (data) {
      const inserted: NewsHubComment = { ...(data as any), reactions: { up: 0, down: 0, mine: 0 } };
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
    setComments((cs) => cs.filter((c) => c.id !== id));
    const { error } = await (supabase.from('news_hub_comments' as any) as any).delete().eq('id', id);
    if (error) {
      setComments(prev);
      throw error;
    }
  }, [comments]);

  const react = useCallback(async (commentId: string, value: 1 | -1) => {
    if (!myUserId) throw new Error('Musisz być zalogowany.');
    const current = comments.find((c) => c.id === commentId);
    const mine = current?.reactions.mine || 0;
    // Optimistic update
    setComments((prev) => prev.map((c) => {
      if (c.id !== commentId) return c;
      const r = { ...c.reactions };
      // Revert previous
      if (mine === 1) r.up = Math.max(0, r.up - 1);
      if (mine === -1) r.down = Math.max(0, r.down - 1);
      if (mine === value) {
        r.mine = 0;
      } else {
        if (value === 1) r.up += 1; else r.down += 1;
        r.mine = value;
      }
      return { ...c, reactions: r };
    }));
    if (mine === value) {
      const { error } = await (supabase.from('news_hub_comment_reactions' as any) as any)
        .delete().eq('comment_id', commentId).eq('user_id', myUserId);
      if (error) { fetchAll(); throw error; }
    } else {
      const { error } = await (supabase.from('news_hub_comment_reactions' as any) as any)
        .upsert({ comment_id: commentId, user_id: myUserId, value }, { onConflict: 'comment_id,user_id' });
      if (error) { fetchAll(); throw error; }
    }
  }, [comments, myUserId, fetchAll]);

  return { comments, loading, refresh: fetchAll, addComment, updateComment, deleteComment, react };
}
