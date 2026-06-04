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
import { STORAGE_CONFIG } from '@/lib/storageConfig';

const VPS_THRESHOLD_BYTES = 2 * 1024 * 1024;

// Express VPS na produkcji ma utworzony i przetestowany TYLKO folder
// `training-media`. Foldery typu `news-hub-*` nie istnieją na VPS,
// więc serwer zwracał SPA HTML zamiast pliku → wideo 0:00. Używamy
// `training-media` dla wszystkich uploadów News Hub jako stabilnego targetu.
type NewsHubFolderKey = 'covers' | 'media' | 'files';
const VPS_FOLDERS: Record<NewsHubFolderKey, string> = {
  covers: 'training-media',
  media: 'training-media',
  files: 'training-media',
};

// Co użytkownik wgrywa — używamy do walidacji client-side i weryfikacji
// content-type po uploadzie. NIE musi się pokrywać z folderem na VPS.
export type NewsHubUploadKind = 'video' | 'image' | 'file' | 'cover';

function inferKind(folder: NewsHubFolderKey, file: File): NewsHubUploadKind {
  if (folder === 'covers') return 'cover';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('image/')) return 'image';
  return 'file';
}

function validateClientMime(file: File, kind: NewsHubUploadKind): string | null {
  const t = (file.type || '').toLowerCase();
  if (kind === 'video') {
    if (!t.startsWith('video/')) return 'To nie jest plik wideo. Wybierz plik MP4 / WebM / MOV.';
  } else if (kind === 'image' || kind === 'cover') {
    if (!t.startsWith('image/')) return 'To nie jest plik obrazu.';
  }
  if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
    return `Plik jest za duży (max ${STORAGE_CONFIG.MAX_FILE_SIZE_MB} MB).`;
  }
  return null;
}

export interface UploadOptions {
  onProgress?: (pct: number) => void;
  /** Nadpisuje typ wykrywany z folderu/MIME — używaj gdy field to wideo niezależnie od MIME pliku. */
  kind?: NewsHubUploadKind;
}

export async function uploadNewsHubFile(
  file: File,
  folder: NewsHubFolderKey = 'media',
  options: UploadOptions = {}
): Promise<string | null> {
  const kind = options.kind || inferKind(folder, file);

  const mimeErr = validateClientMime(file, kind);
  if (mimeErr) throw new Error(mimeErr);

  // Duże pliki – VPS (np. wideo 180MB)
  if (file.size > VPS_THRESHOLD_BYTES) {
    try {
      const url = await uploadToVps(file, VPS_FOLDERS[folder], options.onProgress);
      // Walidacja: serwer SPA zwraca HTML 200 dla brakujących ścieżek – wykryjmy to.
      const verr = await verifyUploadedUrl(url, kind);
      if (verr) throw new Error(verr);
      return url;
    } catch (err) {
      console.error('[useNewsHub] VPS upload failed:', err);
      throw err;
    }
  }
  return uploadToSupabase(file, folder);
}

async function uploadToSupabase(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'bin';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from('news-hub-media').upload(fileName, file, { upsert: false, contentType: file.type || undefined });
  if (error || !data) {
    console.error('[useNewsHub] Supabase upload error:', error);
    throw new Error(error?.message || 'Błąd uploadu do Supabase Storage.');
  }
  const { data: pub } = supabase.storage.from('news-hub-media').getPublicUrl(data.path);
  return pub.publicUrl;
}

// Po uploadzie sprawdzamy nagłówki – jeśli content-type to text/html,
// oznacza to fallback SPA i plik faktycznie NIE został zapisany.
// Dla wideo dodatkowo wymagamy `video/*` lub `application/octet-stream` (poprawne mp4 czasem tak serwuje nginx).
// Zwraca komunikat błędu (PL) lub null gdy OK.
async function verifyUploadedUrl(url: string, kind: NewsHubUploadKind): Promise<string | null> {
  const ct = await fetchContentType(url);
  if (ct === null) {
    // HEAD/range zablokowane — nie blokujemy.
    return null;
  }
  const lower = ct.toLowerCase();
  if (lower.startsWith('text/html')) {
    return 'Serwer zwraca stronę HTML zamiast pliku — upload się nie powiódł (skontaktuj się z administratorem VPS).';
  }
  if (kind === 'video') {
    if (lower.startsWith('video/')) return null;
    if (lower.startsWith('application/octet-stream')) return null; // tolerujemy
    return `Serwer nie zwraca pliku wideo (content-type: ${ct}). Upload jest nieprawidłowy.`;
  }
  if (kind === 'image' || kind === 'cover') {
    if (lower.startsWith('image/')) return null;
    if (lower.startsWith('application/octet-stream')) return null;
    return `Serwer nie zwraca obrazu (content-type: ${ct}).`;
  }
  return null;
}

async function fetchContentType(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return res.headers.get('content-type') || '';
    // 405/403 → spróbuj range GET
    if (res.status === 405 || res.status === 403) {
      const r2 = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
      if (r2.ok || r2.status === 206) return r2.headers.get('content-type') || '';
    }
    return null;
  } catch {
    return null;
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

    xhr.open('POST', STORAGE_CONFIG.UPLOAD_API_URL);
    xhr.send(form);
  });
}
