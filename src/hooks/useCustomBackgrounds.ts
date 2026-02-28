import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const BUCKET = 'meeting-backgrounds';
const MAX_BACKGROUNDS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function useCustomBackgrounds() {
  const { user } = useAuth();
  const [customImages, setCustomImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getPublicUrl = useCallback((path: string) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const listBackgrounds = useCallback(async () => {
    if (!user) {
      setCustomImages([]);
      return;
    }
    setIsLoading(true);
    try {
      console.log('[useCustomBackgrounds] Listing for user:', user.id);
      const { data, error } = await supabase.storage.from(BUCKET).list(user.id, {
        limit: 100,
      });
      if (error) {
        console.error('[useCustomBackgrounds] List error:', JSON.stringify(error));
        setCustomImages([]);
        return;
      }
      const files = (data || []).filter(f => f.name && !f.name.startsWith('.'));
      // Sort by name (timestamp-based filenames) — newest last
      files.sort((a, b) => a.name.localeCompare(b.name));
      const urls = files.map(f => getPublicUrl(`${user.id}/${f.name}`));
      console.log('[useCustomBackgrounds] Found', urls.length, 'backgrounds');
      setCustomImages(urls);
    } catch (err) {
      console.error('[useCustomBackgrounds] List failed:', err);
      setCustomImages([]);
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
      console.error('[useCustomBackgrounds] Pre-upload list error:', listErr);
      throw new Error('Nie udało się sprawdzić liczby teł. Spróbuj ponownie.');
    }
    const existingFiles = (existing || []).filter(f => f.name && !f.name.startsWith('.'));
    
    // If over limit, auto-delete oldest files to make room
    if (existingFiles.length >= MAX_BACKGROUNDS) {
      const sorted = [...existingFiles].sort((a, b) => a.name.localeCompare(b.name));
      const toDelete = sorted.slice(0, sorted.length - MAX_BACKGROUNDS + 1);
      if (toDelete.length > 0) {
        const paths = toDelete.map(f => `${user.id}/${f.name}`);
        console.log('[useCustomBackgrounds] Auto-deleting', paths.length, 'old backgrounds to make room');
        await supabase.storage.from(BUCKET).remove(paths);
      }
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${ext}`;
      const path = `${user.id}/${fileName}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        console.error('[useCustomBackgrounds] Upload error:', JSON.stringify(error));
        if (error.message?.includes('Bucket not found')) {
          throw new Error('Bucket "meeting-backgrounds" nie istnieje.');
        }
        if (error.message?.includes('row-level security') || error.message?.includes('Unauthorized')) {
          throw new Error('Brak uprawnień do przesyłania. Sprawdź czy jesteś zalogowany.');
        }
        throw error;
      }

      await listBackgrounds();
      return getPublicUrl(path);
    } finally {
      setIsUploading(false);
    }
  }, [user, listBackgrounds, getPublicUrl]);

  const deleteImage = useCallback(async (url: string) => {
    if (!user) return;
    const bucketPath = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
    if (!bucketPath) return;

    const { error } = await supabase.storage.from(BUCKET).remove([bucketPath]);
    if (error) {
      console.error('[useCustomBackgrounds] Delete failed:', error);
      throw error;
    }
    await listBackgrounds();
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
