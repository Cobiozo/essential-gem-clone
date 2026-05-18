import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { NewsHubPost, NewsHubCategory, NewsHubPostType } from '@/types/newsHub';

export function useNewsHubCategories() {
  const [categories, setCategories] = useState<NewsHubCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from('news_hub_categories' as any) as any)
      .select('*')
      .order('sort_order', { ascending: true });
    setCategories((data as NewsHubCategory[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { categories, loading, refresh };
}

interface UseNewsHubPostsOptions {
  type?: NewsHubPostType | 'all';
  categoryId?: string | null;
  search?: string;
  adminMode?: boolean;
}

export function useNewsHubPosts(opts: UseNewsHubPostsOptions = {}) {
  const [posts, setPosts] = useState<NewsHubPost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = (supabase.from('news_hub_posts' as any) as any)
      .select('*, category:news_hub_categories(*)')
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false });

    if (!opts.adminMode) q = q.eq('is_published', true);
    if (opts.type && opts.type !== 'all') q = q.eq('type', opts.type);
    if (opts.categoryId) q = q.eq('category_id', opts.categoryId);
    if (opts.search && opts.search.trim()) {
      const s = opts.search.trim();
      q = q.or(`title.ilike.%${s}%,short_description.ilike.%${s}%,content.ilike.%${s}%`);
    }

    const { data } = await q;
    setPosts((data as NewsHubPost[]) || []);
    setLoading(false);
  }, [opts.type, opts.categoryId, opts.search, opts.adminMode]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel('news_hub_posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_hub_posts' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  return { posts, loading, refresh };
}

export async function incrementPostView(postId: string, userId?: string | null) {
  try {
    await (supabase.from('news_hub_views' as any) as any).insert({ post_id: postId, user_id: userId ?? null });
    await (supabase.rpc as any)('increment', {}).catch(() => {});
    // Direct update fallback
    const { data } = await (supabase.from('news_hub_posts' as any) as any).select('view_count').eq('id', postId).maybeSingle();
    if (data) {
      await (supabase.from('news_hub_posts' as any) as any).update({ view_count: ((data as any).view_count || 0) + 1 }).eq('id', postId);
    }
  } catch {}
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

export async function uploadNewsHubFile(file: File, folder: 'covers' | 'media' | 'files' = 'media'): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'bin';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from('news-hub-media').upload(fileName, file, { upsert: false });
  if (error || !data) return null;
  const { data: pub } = supabase.storage.from('news-hub-media').getPublicUrl(data.path);
  return pub.publicUrl;
}
