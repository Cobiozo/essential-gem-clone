import { useState, useCallback, useRef } from 'react';
import { STORAGE_CONFIG, formatFileSize } from '@/lib/storageConfig';
import { supabase } from '@/integrations/supabase/client';

interface UploadOptions {
  folder?: string;
  onProgress?: (percent: number) => void;
}

interface UploadResult {
  success: boolean;
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

interface UseLocalStorageReturn {
  uploadFile: (file: File, options?: UploadOptions) => Promise<UploadResult>;
  deleteFile: (url: string) => Promise<{ success: boolean; error?: string }>;
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;
  listFiles: (folder?: string) => Promise<Array<{ name: string; url: string; type: string }>>;
}

const detectMediaType = (fileName: string): string => {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) return 'document';
  return 'file';
};

// Wybierz odpowiedni bucket na podstawie rozszerzenia pliku
const getBucketForFile = (fileName: string): string => {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'].includes(ext)) {
    return 'cms-videos';
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
    return 'cms-files';
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) {
    return 'cms-files';
  }
  return 'cms-images';
};

// Fallback upload do Supabase Storage
const uploadToSupabase = async (
  file: File, 
  folder: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> => {
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${folder}/${timestamp}-${sanitizedFileName}`;
  
  onProgress?.(50);
  
  const bucketName = getBucketForFile(file.name);
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
    
  if (error) {
    throw new Error(`Supabase upload error: ${error.message}`);
  }
  
  onProgress?.(80);
  
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);
    
  onProgress?.(100);
    
  return {
    success: true,
    url: urlData.publicUrl,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  };
};


// Weryfikuje, czy wgrany URL faktycznie wskazuje na plik wideo (a nie HTML/404 z SPA fallback).
async function verifyVideoUrl(url: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-store' });
  } catch {
    return 'Nie można zweryfikować wgranego pliku wideo (brak dostępu do serwera plików). Spróbuj jeszcze raz.';
  }
  if (res.status === 404) {
    return 'Serwer zwrócił 404 dla wgranego pliku — plik nie został zapisany w docelowym folderze. Spróbuj ponownie lub skontaktuj się z administratorem.';
  }
  if (res.status !== 200 && res.status !== 206) {
    return `Serwer zwrócił status ${res.status} dla wgranego pliku — upload jest nieprawidłowy.`;
  }
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.startsWith('text/html')) {
    return 'Serwer zwraca HTML zamiast pliku wideo — upload się nie powiódł. Spróbuj ponownie lub skontaktuj się z administratorem.';
  }
  if (ct && !ct.startsWith('video/') && !ct.startsWith('application/octet-stream')) {
    return `Serwer nie zwraca pliku wideo (content-type: ${ct}). Upload jest nieprawidłowy.`;
  }
  return null;
}

export const useLocalStorage = (): UseLocalStorageReturn => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadLockRef = useRef(false);
  const lastUploadRef = useRef<{ name: string; size: number; time: number } | null>(null);

  const uploadFile = useCallback(async (file: File, options?: UploadOptions): Promise<UploadResult> => {
    // Blokada równoległych uploadów - zapobiega duplikatom
    if (uploadLockRef.current) {
      throw new Error('Upload już trwa, poczekaj na zakończenie poprzedniego.');
    }
    uploadLockRef.current = true;

    // Detekcja duplikatów po nazwie+rozmiarze w oknie 10 sekund
    const now = Date.now();
    if (lastUploadRef.current &&
        lastUploadRef.current.name === file.name &&
        lastUploadRef.current.size === file.size &&
        now - lastUploadRef.current.time < 10000) {
      uploadLockRef.current = false;
      throw new Error('Duplikat uploadu wykryty - ten sam plik został właśnie przesłany.');
    }
    lastUploadRef.current = { name: file.name, size: file.size, time: now };

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    // Walidacja maksymalnego rozmiaru
    if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
      const errorMsg = `Plik jest za duży. Maksymalny rozmiar to ${STORAGE_CONFIG.MAX_FILE_SIZE_MB}MB (${formatFileSize(STORAGE_CONFIG.MAX_FILE_SIZE_BYTES)})`;
      setError(errorMsg);
      setIsUploading(false);
      uploadLockRef.current = false;
      throw new Error(errorMsg);
    }

    const folder = options?.folder || 'uploads';

    // Wideo zawsze idzie przez /upload (multer), z pominięciem limitów Supabase Storage.
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isVideo = (file.type || '').toLowerCase().startsWith('video/')
      || (STORAGE_CONFIG.VIDEO_EXTENSIONS as readonly string[]).includes(ext);

    // Małe pliki (<=2MB) NIE-WIDEO -> Supabase Storage (szybsze, CDN)
    if (!isVideo && file.size <= STORAGE_CONFIG.SUPABASE_MAX_SIZE_BYTES) {
      console.log(`📦 Mały plik ${file.name} (${formatFileSize(file.size)}) -> Supabase Storage`);

      try {
        setUploadProgress(10);
        const result = await uploadToSupabase(file, folder, (progress) => {
          setUploadProgress(progress);
          options?.onProgress?.(progress);
        });
        setIsUploading(false);

        uploadLockRef.current = false;
        return result;
      } catch (supabaseErr) {
        // Fallback do /upload jeśli Supabase nie działa
        console.warn('Supabase upload failed, trying server upload fallback:', supabaseErr);
      }
    } else if (isVideo) {
      console.log(`🎬 Wideo ${file.name} (${formatFileSize(file.size)}) -> upload przez multer (bez Supabase Storage)`);
    } else {
      console.log(`📁 Duży plik ${file.name} (${formatFileSize(file.size)}) -> upload przez serwer`);
    }

    // Duże pliki -> /upload lub fallback z małych plików gdy Supabase nie działa
    try {
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('folder', folder);
      formData.append('file', file);

      // XMLHttpRequest z realnym progress tracking i 10-minutowym timeout
      const result = await new Promise<{ success: boolean; url: string; fileName: string; fileSize: number; fileType: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const TIMEOUT_MS = 10 * 60 * 1000; // 10 minut

        xhr.timeout = TIMEOUT_MS;

        // Realny progress uploadu
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            // Mapujemy 0-100% uploadu na zakres 10-90% paska postępu
            const percent = Math.round(10 + (event.loaded / event.total) * 80);
            setUploadProgress(percent);
            options?.onProgress?.(percent);
          }
        };

        xhr.onload = () => {
          const contentType = xhr.getResponseHeader('content-type') || '';
          
          if (!contentType.includes('application/json')) {
            if (file.size > STORAGE_CONFIG.SUPABASE_MAX_SIZE_BYTES) {
              reject(new Error('Serwer uploadu niedostępny. Duże pliki (>2MB) wymagają połączenia z serwerem.'));
            } else {
              reject(new Error('Nie udało się przesłać pliku. Oba serwery niedostępne.'));
            }
            return;
          }

          let data: any;
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            reject(new Error('Nieprawidłowa odpowiedź serwera'));
            return;
          }

          if (xhr.status < 200 || xhr.status >= 300 || !data.success) {
            reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
            return;
          }

          setUploadProgress(95);
          resolve({
            success: true,
            url: data.url,
            fileName: data.fileName || file.name,
            fileSize: data.fileSize || file.size,
            fileType: data.fileType || file.type
          });
        };

        xhr.onerror = () => {
          reject(new Error('Błąd połączenia z serwerem uploadu.'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Upload przekroczył limit czasu (10 minut). Spróbuj ponownie lub użyj mniejszego pliku.'));
        };

        xhr.open('POST', STORAGE_CONFIG.UPLOAD_API_URL);
        xhr.send(formData);
      });

      // Dla wideo: weryfikacja, że plik faktycznie został zapisany i jest odtwarzalny
      // (Express SPA fallback potrafi zwrócić HTML/404 zamiast pliku)
      if (isVideo) {
        const verr = await verifyVideoUrl(result.url);
        if (verr) {
          throw new Error(verr);
        }
      }


      setUploadProgress(100);
      setIsUploading(false);
      uploadLockRef.current = false;
      options?.onProgress?.(100);
      
      return result;
    } catch (err) {
      let errorMsg = err instanceof Error ? err.message : 'Błąd uploadu pliku';
      
      if (errorMsg.includes('uploadu niedostępny') || errorMsg.includes('serwery niedostępne')) {
        errorMsg += '\n\nSpróbuj ponownie za chwilę lub skontaktuj się z administratorem systemu.';
      }
      
      setError(errorMsg);
      setIsUploading(false);
      uploadLockRef.current = false;
      throw new Error(errorMsg);
    }
  }, []);

  const listFiles = useCallback(async (folder?: string): Promise<Array<{ name: string; url: string; type: string }>> => {
    try {
      const folderPath = folder || '';
      
      const response = await fetch(`/list-files?folder=${encodeURIComponent(folderPath)}`);
      
      if (!response.ok) {
        console.error('Error listing files: HTTP', response.status);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.success || !Array.isArray(data.files)) {
        console.error('Error listing files: Invalid response', data);
        return [];
      }

      return data.files.map((file: any) => ({
        name: file.name,
        url: file.url,
        type: detectMediaType(file.name)
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }, []);

  const deleteFile = useCallback(async (url: string): Promise<{ success: boolean; error?: string }> => {
    if (!url) return { success: false, error: 'No URL provided' };
    
    try {
      // Files served by local upload server
      if (url.includes('purelife.info.pl/uploads/')) {
        const urlPath = new URL(url).pathname; // /uploads/training-media/filename.mp4
        const parts = urlPath.replace('/uploads/', '').split('/');
        const filename = parts.pop()!;
        const folder = parts.join('/');
        
        const deleteUrl = folder 
          ? `/upload/${encodeURIComponent(filename)}?folder=${encodeURIComponent(folder)}`
          : `/upload/${encodeURIComponent(filename)}`;
        
        const response = await fetch(deleteUrl, { method: 'DELETE' });
        const contentType = response.headers.get('content-type') || '';
        
        if (!contentType.includes('application/json')) {
          throw new Error('Server not available');
        }
        
        const result = await response.json();
        
        if (result.success) {
          console.log('🗑️ File deleted from upload server:', filename);
          return { success: true };
        } else {
          throw new Error(result.error || 'Delete failed');
        }
      } 
      // Supabase Storage
      else if (url.includes('supabase.co')) {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/storage/v1/object/public/');
        if (pathParts.length > 1) {
          const [bucket, ...filePath] = pathParts[1].split('/');
          const { error } = await supabase.storage.from(bucket).remove([filePath.join('/')]);
          if (error) throw error;
          console.log('🗑️ File deleted from Supabase:', filePath.join('/'));
          return { success: true };
        }
      }
      
      return { success: false, error: 'Unknown URL format' };
    } catch (err) {
      console.error('Delete error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Delete failed' };
    }
  }, []);

  return {
    uploadFile,
    deleteFile,
    uploadProgress,
    isUploading,
    error,
    listFiles
  };
};
