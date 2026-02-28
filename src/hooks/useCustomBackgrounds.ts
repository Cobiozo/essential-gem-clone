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
    console.log('[useCustomBackgrounds] listBackgrounds called, user:', user?.id ?? 'null');
    if (!user) {
      setCustomImages([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET).list(user.id, {
        limit: 100,
      });
      if (error) {
        console.error('[useCustomBackgrounds] List error details:', error.message);
        if (error.message?.includes('Bucket not found')) {
          throw new Error('Bucket "meeting-backgrounds" nie istnieje.');
        }
        if (error.message?.includes('row-level security') || error.message?.includes('Unauthorized')) {
          throw new Error('Brak uprawnień do odczytu teł.');
        }
        throw error;
      }
      const files = (data || []).filter(f => f.name && !f.name.startsWith('.'));
      // Sort by name (timestamp-based filenames) on client side
      files.sort((a, b) => a.name.localeCompare(b.name));
      const urls = files.map(f => getPublicUrl(`${user.id}/${f.name}`));
      console.log('[useCustomBackgrounds] Found', urls.length, 'backgrounds');
      setCustomImages(urls);
    } catch (err) {
      console.error('[useCustomBackgrounds] List failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, getPublicUrl]);

  useEffect(() => {
    listBackgrounds().catch(() => {});
  }, [listBackgrounds]);

  const uploadImage = useCallback(async (file: File) => {
    if (!user) throw new Error('Not authenticated');
    if (!file.type.startsWith('image/')) {
      throw new Error('Tylko pliki graficzne są dozwolone.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Plik jest za duży (max 5MB).');
    }

    // Server-side limit validation
    const { data: existing, error: listErr } = await supabase.storage.from(BUCKET).list(user.id, { limit: 100 });
    if (listErr) throw listErr;
    const existingCount = (existing || []).filter(f => f.name && !f.name.startsWith('.')).length;
    if (existingCount >= MAX_BACKGROUNDS) {
      throw new Error(`Maksymalnie ${MAX_BACKGROUNDS} własnych teł. Usuń jedno, aby dodać nowe.`);
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
        console.error('[useCustomBackgrounds] Upload failed:', error.message, error);
        if (error.message?.includes('Bucket not found')) {
          throw new Error('Bucket "meeting-backgrounds" nie istnieje. Skontaktuj się z administratorem.');
        }
        if (error.message?.includes('row-level security') || error.message?.includes('Unauthorized')) {
          throw new Error('Brak uprawnień do przesyłania plików. Sprawdź czy jesteś zalogowany.');
        }
        throw error;
      }

      // Refresh list — propagate errors so caller knows if refresh failed
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
