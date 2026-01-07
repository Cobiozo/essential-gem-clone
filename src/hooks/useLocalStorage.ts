import { useState, useCallback } from 'react';
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

export const useLocalStorage = (): UseLocalStorageReturn => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, options?: UploadOptions): Promise<UploadResult> => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    // Walidacja rozmiaru
    if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
      const errorMsg = `Plik jest za duży. Maksymalny rozmiar to ${STORAGE_CONFIG.MAX_FILE_SIZE_MB}MB (${formatFileSize(STORAGE_CONFIG.MAX_FILE_SIZE_BYTES)})`;
      setError(errorMsg);
      setIsUploading(false);
      throw new Error(errorMsg);
    }

    const folder = options?.folder || 'uploads';

    try {
      setUploadProgress(10);
      
      // Próbuj lokalny upload (VPS)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      
      setUploadProgress(30);
      
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
      
      // Sprawdź czy odpowiedź jest JSON (lokalny serwer) czy HTML (brak serwera)
      const contentType = response.headers.get('content-type') || '';
      
      if (!contentType.includes('application/json')) {
        // Fallback do Supabase Storage gdy lokalny serwer niedostępny
        console.warn('Local upload not available, using Supabase Storage fallback');
        const result = await uploadToSupabase(file, folder, (progress) => {
          setUploadProgress(progress);
          options?.onProgress?.(progress);
        });
        setIsUploading(false);
        return result;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      setUploadProgress(80);
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      
      setUploadProgress(100);
      setIsUploading(false);
      
      options?.onProgress?.(100);
      
      return {
        success: true,
        url: result.url,
        fileName: result.fileName || file.name,
        fileSize: result.fileSize || file.size,
        fileType: result.fileType || file.type
      };
    } catch (err) {
      // Fallback do Supabase przy jakimkolwiek błędzie lokalnego uploadu
      console.warn('Local upload failed, trying Supabase Storage fallback:', err);
      
      try {
        const result = await uploadToSupabase(file, folder, (progress) => {
          setUploadProgress(progress);
          options?.onProgress?.(progress);
        });
        setIsUploading(false);
        setError(null);
        return result;
      } catch (supabaseErr) {
        const errorMsg = supabaseErr instanceof Error ? supabaseErr.message : 'Błąd uploadu pliku';
        setError(errorMsg);
        setIsUploading(false);
        throw new Error(errorMsg);
      }
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

  return {
    uploadFile,
    uploadProgress,
    isUploading,
    error,
    listFiles
  };
};
