import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const BUCKET = 'meeting-backgrounds';
const MAX_BACKGROUNDS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const CACHE_KEY_PREFIX = 'meeting_custom_backgrounds_';

function getCachedUrls(userId: string): string[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setCachedUrls(userId: string, urls: string[]) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + userId, JSON.stringify(urls));
  } catch {}
}

export function useCustomBackgrounds() {
  const { user } = useAuth();
  const [customImages, setCustomImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Load cached images immediately on user change
  useEffect(() => {
    if (user?.id && user.id !== userIdRef.current) {
      userIdRef.current = user.id;
      const cached = getCachedUrls(user.id);
      if (cached.length > 0) {
        setCustomImages(cached);
      }
    } else if (!user) {
      userIdRef.current = null;
      setCustomImages([]);
    }
  }, [user?.id]);

  const getPublicUrl = useCallback((path: string) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const listBackgrounds = useCallback(async (retryCount = 0) => {
    if (!user) {
      setCustomImages([]);
      return;
    }
    setIsLoading(true);
    try {
      console.log('[useCustomBackgrounds] Listing for user:', user.id, 'attempt:', retryCount + 1);
      const { data, error } = await supabase.storage.from(BUCKET).list(user.id, {
        limit: 100,
      });

      if (error) {
        console.error('[useCustomBackgrounds] List error:', error.message, 'statusCode:', (error as any).statusCode);
        
        // Retry once after 1.5s (auth race condition)
        if (retryCount === 0) {
          console.log('[useCustomBackgrounds] Retrying list after 1.5s...');
          setTimeout(() => listBackgrounds(1), 1500);
          return;
        }
        
        // Fallback to cache instead of empty
        const cached = getCachedUrls(user.id);
        if (cached.length > 0) {
          console.log('[useCustomBackgrounds] Using cached URLs as fallback:', cached.length);
          setCustomImages(cached);
        }
        return;
      }

      const files = (data || []).filter(f => f.name && !f.name.startsWith('.'));
      
      // Auto-cleanup: if over limit, delete oldest files via Storage API
      if (files.length > MAX_BACKGROUNDS) {
        const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
        const toDelete = sorted.slice(0, files.length - MAX_BACKGROUNDS);
        const paths = toDelete.map(f => `${user.id}/${f.name}`);
        console.log('[useCustomBackgrounds] Auto-cleaning', paths.length, 'excess files on list');
        await supabase.storage.from(BUCKET).remove(paths);
        const remaining = sorted.slice(files.length - MAX_BACKGROUNDS);
        const urls = remaining.map(f => getPublicUrl(`${user.id}/${f.name}`));
        console.log('[useCustomBackgrounds] After cleanup:', urls.length, 'backgrounds');
        setCustomImages(urls);
        setCachedUrls(user.id, urls);
        return;
      }
      
      files.sort((a, b) => a.name.localeCompare(b.name));
      const urls = files.map(f => getPublicUrl(`${user.id}/${f.name}`));
      console.log('[useCustomBackgrounds] Found', urls.length, 'backgrounds');
      setCustomImages(urls);
      setCachedUrls(user.id, urls);
    } catch (err) {
      console.error('[useCustomBackgrounds] List failed:', err);
      
      // Retry once after 1.5s
      if (retryCount === 0) {
        setTimeout(() => listBackgrounds(1), 1500);
        return;
      }
      
      // Fallback to cache
      const cached = getCachedUrls(user.id);
      if (cached.length > 0) {
        console.log('[useCustomBackgrounds] Using cached URLs as fallback:', cached.length);
        setCustomImages(cached);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, getPublicUrl]);

  useEffect(() => {
    listBackgrounds();
  }, [listBackgrounds]);

  const uploadImage = useCallback(async (file: File) => {
    if (!user) throw new Error('Nie jesteś zalogowany');
    if (!file.type.startsWith('image/')) {
      throw new Error('Tylko pliki graficzne są dozwolone.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Plik jest za duży (max 5MB).');
    }

    // Server-side count check
    const { data: existing, error: listErr } = await supabase.storage.from(BUCKET).list(user.id, { limit: 100 });
    if (listErr) {
      console.error('[useCustomBackgrounds] Pre-upload list error:', listErr.message);
    }
    
    const existingFiles = (existing || []).filter(f => f.name && !f.name.startsWith('.'));
    
    // If at or over limit, delete oldest files to make room
    if (existingFiles.length >= MAX_BACKGROUNDS) {
      const sorted = [...existingFiles].sort((a, b) => a.name.localeCompare(b.name));
      const toDelete = sorted.slice(0, sorted.length - MAX_BACKGROUNDS + 1);
      if (toDelete.length > 0) {
        const paths = toDelete.map(f => `${user.id}/${f.name}`);
        console.log('[useCustomBackgrounds] Auto-deleting', paths.length, 'old backgrounds to make room');
        const { error: delErr } = await supabase.storage.from(BUCKET).remove(paths);
        if (delErr) {
          console.error('[useCustomBackgrounds] Auto-delete failed:', delErr.message);
        }
      }
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${ext}`;
      const path = `${user.id}/${fileName}`;

      console.log('[useCustomBackgrounds] Uploading to path:', path);
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        console.error('[useCustomBackgrounds] Upload error:', error.message);
        if (error.message?.includes('Bucket not found')) {
          throw new Error('Bucket "meeting-backgrounds" nie istnieje.');
        }
        if (error.message?.includes('row-level security') || error.message?.includes('Unauthorized')) {
          throw new Error('Brak uprawnień do przesyłania. Sprawdź czy jesteś zalogowany.');
        }
        throw error;
      }

      // Optimistic update — add new URL to state immediately
      const newUrl = getPublicUrl(path);
      console.log('[useCustomBackgrounds] Upload successful, optimistic add:', newUrl);
      
      setCustomImages(prev => {
        // Keep only newest MAX_BACKGROUNDS (including this new one)
        const updated = [...prev, newUrl].slice(-MAX_BACKGROUNDS);
        setCachedUrls(user.id, updated);
        return updated;
      });

      // Background refresh for consistency (don't block on it)
      listBackgrounds().catch(() => {});
      
      return newUrl;
    } finally {
      setIsUploading(false);
    }
  }, [user, listBackgrounds, getPublicUrl]);

  const deleteImage = useCallback(async (url: string) => {
    if (!user) return;
    const bucketPath = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
    if (!bucketPath) return;

    // Optimistic removal
    setCustomImages(prev => {
      const updated = prev.filter(u => u !== url);
      setCachedUrls(user.id, updated);
      return updated;
    });

    const { error } = await supabase.storage.from(BUCKET).remove([bucketPath]);
    if (error) {
      console.error('[useCustomBackgrounds] Delete failed:', error);
      // Re-fetch to restore correct state
      await listBackgrounds();
      throw error;
    }
  }, [user, listBackgrounds]);

  return {
    customImages,
    isUploading,
    isLoading,
    uploadImage,
    deleteImage,
    refetch: listBackgrounds,
    maxBackgrounds: MAX_BACKGROUNDS,
  };
}
