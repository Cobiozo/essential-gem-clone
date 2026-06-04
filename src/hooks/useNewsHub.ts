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

// Próg powyżej którego plik leci na VPS (Express /upload) zamiast Supabase Storage.
// Zgodnie z polityką "VPS Uploads": pliki > 2MB idą XHR-em na lokalny VPS.
const VPS_THRESHOLD_BYTES = 2 * 1024 * 1024;

// Express VPS używa jednosegmentowych folderów (np. "training-media"). Zagnieżdżone
// ścieżki typu "news-hub/media" nie były tworzone i plik nigdy nie był zapisywany –
// serwer SPA zwracał HTML 200, przez co odtwarzacz pokazywał 0:00.
type NewsHubFolderKey = 'covers' | 'media' | 'files';
const VPS_FOLDERS: Record<NewsHubFolderKey, string> = {
  covers: 'news-hub-covers',
  media: 'news-hub-media',
  files: 'news-hub-files',
};

export interface UploadOptions {
  onProgress?: (pct: number) => void;
}

export async function uploadNewsHubFile(
  file: File,
  folder: NewsHubFolderKey = 'media',
  options: UploadOptions = {}
): Promise<string | null> {
  // Duże pliki – VPS (np. wideo 180MB)
  if (file.size > VPS_THRESHOLD_BYTES) {
    try {
      const url = await uploadToVps(file, VPS_FOLDERS[folder], options.onProgress);
      // Walidacja: serwer SPA zwraca HTML 200 dla brakujących ścieżek – wykryjmy to.
      const ok = await verifyUploadedUrl(url, file.type);
      if (!ok) {
        throw new Error('Plik został przyjęty, ale serwer nie udostępnia go pod oczekiwanym adresem. Skontaktuj się z administratorem (konfiguracja VPS).');
      }
      return url;
    } catch (err) {
      console.error('[useNewsHub] VPS upload failed:', err);
      // Fallback do Supabase tylko jeśli plik jest poniżej hard-limitu (50MB)
      if (file.size <= 50 * 1024 * 1024) {
        return uploadToSupabase(file, folder);
      }
      throw err;
    }
  }
  return uploadToSupabase(file, folder);
}

async function uploadToSupabase(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'bin';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from('news-hub-media').upload(fileName, file, { upsert: false });
  if (error || !data) {
    console.error('[useNewsHub] Supabase upload error:', error);
    return null;
  }
  const { data: pub } = supabase.storage.from('news-hub-media').getPublicUrl(data.path);
  return pub.publicUrl;
}

// Po uploadzie na VPS sprawdzamy nagłówki – jeśli content-type to text/html,
// oznacza to fallback SPA i plik faktycznie NIE został zapisany.
async function verifyUploadedUrl(url: string, expectedMime: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.startsWith('text/html')) return false;
    // Akceptujemy zgodny prefix typu, application/octet-stream lub brak typu (niektóre serwery).
    if (expectedMime) {
      const prefix = expectedMime.split('/')[0];
      if (ct && !ct.startsWith(prefix) && !ct.includes('octet-stream')) {
        // dopuszczamy, jeśli serwer zwraca akceptujący typ – ale nie HTML
        return !ct.startsWith('text/');
      }
    }
    return true;
  } catch {
    // Brak HEAD nie powinien blokować uploadu – ufamy oryginalnej odpowiedzi.
    return true;
  }
}

function uploadToVps(file: File, folder: string, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);

    const xhr = new XMLHttpRequest();
    // 10 minut dla dużych plików
    xhr.timeout = 10 * 60 * 1000;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      const ct = xhr.getResponseHeader('content-type') || '';
      if (!ct.includes('application/json')) {
        reject(new Error('Serwer VPS niedostępny (brak odpowiedzi JSON).'));
        return;
      }
      let data: any;
      try { data = JSON.parse(xhr.responseText); } catch { reject(new Error('Nieprawidłowa odpowiedź serwera')); return; }
      if (xhr.status < 200 || xhr.status >= 300 || !data?.success || !data?.url) {
        reject(new Error(data?.error || `Upload nieudany (status ${xhr.status})`));
        return;
      }
      resolve(data.url as string);
    };
    xhr.onerror = () => reject(new Error('Błąd połączenia z serwerem VPS.'));
    xhr.ontimeout = () => reject(new Error('Upload przekroczył limit czasu (10 min). Spróbuj jeszcze raz.'));

    xhr.open('POST', '/upload');
    xhr.send(form);
  });
}
