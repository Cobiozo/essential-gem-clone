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

// Próg powyżej którego plik leci przez Express /upload (multer) zamiast Supabase Storage.
import { STORAGE_CONFIG } from '@/lib/storageConfig';

const SERVER_UPLOAD_THRESHOLD_BYTES = 2 * 1024 * 1024;

// `training-media` jest stabilnym folderem dla plików News Hub obsługiwanych przez multer.
type NewsHubFolderKey = 'covers' | 'media' | 'files';
const SERVER_UPLOAD_FOLDERS: Record<NewsHubFolderKey, string> = {
  covers: STORAGE_CONFIG.NEWS_HUB_FOLDERS.cover,
  media: STORAGE_CONFIG.NEWS_HUB_FOLDERS.video,
  files: STORAGE_CONFIG.NEWS_HUB_FOLDERS.file,
};

// Co użytkownik wgrywa — używamy do walidacji client-side i weryfikacji
// content-type po uploadzie. NIE musi się pokrywać z folderem zapisu.
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
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const isVideoByExt = (STORAGE_CONFIG.VIDEO_EXTENSIONS as readonly string[]).includes(ext);
  const isVideoByMime = (file.type || '').toLowerCase().startsWith('video/');
  const isVideo = options.kind === 'video' || isVideoByExt || isVideoByMime;

  // Dla wideo wymuszamy folder 'media' (mapowany na 'training-media')
  const effectiveFolder: NewsHubFolderKey = isVideo ? 'media' : folder;
  const kind = isVideo ? 'video' : (options.kind || inferKind(effectiveFolder, file));

  const mimeErr = validateClientMime(file, kind);
  if (mimeErr) throw new Error(mimeErr);

  // WIDEO: ZAWSZE multer przez /upload (omijamy Supabase i jego limit bucketu)
  if (isVideo) {
    const url = await uploadWithMulter(file, SERVER_UPLOAD_FOLDERS[effectiveFolder], options.onProgress);
    const verr = await verifyUploadedUrl(url, 'video');
    if (verr) {
      console.error('[useNewsHub] Video verification failed:', verr, url);
      throw new Error(verr);
    }
    return url;
  }

  // NIE-WIDEO: duże pliki przez /upload, małe na Supabase
  if (file.size > SERVER_UPLOAD_THRESHOLD_BYTES) {
    const url = await uploadWithMulter(file, SERVER_UPLOAD_FOLDERS[effectiveFolder], options.onProgress);
    const verr = await verifyUploadedUrl(url, kind);
    if (verr) {
      console.error('[useNewsHub] Verification failed:', verr, url);
      throw new Error(verr);
    }
    return url;
  }
  return uploadToSupabase(file, effectiveFolder);
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

// Po uploadzie sprawdzamy realną dostępność pliku przez GET Range bytes=0-0.
// HEAD bywa blokowane przez CORS preflight, GET z Range jest niezawodny.
// Wymaga: status 200/206, content-type pasujący do typu uploadu, NIE text/html.
// Dla wideo: każda inna odpowiedź = błąd (nie zapisujemy URL-a).
async function verifyUploadedUrl(url: string, kind: NewsHubUploadKind): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-store' });
  } catch (e) {
    // CORS / sieć — dla wideo nie ryzykujemy zapisania złego URL-a.
    if (kind === 'video') {
      return 'Nie można zweryfikować wgranego pliku wideo (brak dostępu sieciowego do serwera plików). Spróbuj jeszcze raz.';
    }
    return null;
  }
  if (res.status === 404) {
    return 'Serwer zwrócił 404 dla wgranego pliku — upload nie został zapisany w docelowym folderze. Spróbuj ponownie lub skontaktuj się z administratorem.';
  }
  if (res.status !== 200 && res.status !== 206) {
    return `Serwer zwrócił status ${res.status} dla wgranego pliku — upload jest nieprawidłowy.`;
  }
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.startsWith('text/html')) {
    return 'Serwer zwraca stronę HTML zamiast pliku — upload się nie powiódł. Spróbuj ponownie lub skontaktuj się z administratorem.';
  }
  if (kind === 'video') {
    if (ct.startsWith('video/') || ct.startsWith('application/octet-stream') || ct === '') {
      // dopuszczamy gdy nginx/Express nie ustawi content-type, ale status jest OK
      return null;
    }
    return `Serwer nie zwraca pliku wideo (content-type: ${ct || 'brak'}). Upload jest nieprawidłowy.`;
  }
  if (kind === 'image' || kind === 'cover') {
    if (ct.startsWith('image/') || ct.startsWith('application/octet-stream') || ct === '') return null;
    return `Serwer nie zwraca obrazu (content-type: ${ct}).`;
  }
  return null;
}

function uploadWithMulter(file: File, folder: string, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('folder', folder);
    form.append('file', file);

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
        reject(new Error('Serwer uploadu niedostępny (brak odpowiedzi JSON).'));
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
    xhr.onerror = () => reject(new Error('Błąd połączenia z serwerem uploadu.'));
    xhr.ontimeout = () => reject(new Error('Upload przekroczył limit czasu (10 min). Spróbuj jeszcze raz.'));

    xhr.open('POST', STORAGE_CONFIG.UPLOAD_API_URL);
    xhr.send(form);
  });
}
