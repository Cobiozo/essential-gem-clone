import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_CONFIG, formatFileSize } from '@/lib/storageConfig';

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
  return 'file';
};

const getBucketForFileType = (fileType: string): string => {
  if (fileType.startsWith('video/')) return 'cms-videos';
  if (fileType.startsWith('audio/') || fileType.includes('pdf')) return 'cms-files';
  return 'cms-images';
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

    try {
      setUploadProgress(10);
      
      const folder = options?.folder || 'uploads';
      const bucket = getBucketForFileType(file.type);
      
      // Generowanie unikalnej nazwy pliku
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${folder}/${timestamp}-${sanitizedName}`;
      
      setUploadProgress(30);
      
      // Upload do Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(uploadError.message);
      }
      
      setUploadProgress(80);
      
      // Pobierz publiczny URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      setUploadProgress(100);
      setIsUploading(false);
      
      options?.onProgress?.(100);
      
      return {
        success: true,
        url: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Błąd uploadu pliku';
      setError(errorMsg);
      setIsUploading(false);
      throw new Error(errorMsg);
    }
  }, []);

  const listFiles = useCallback(async (folder?: string): Promise<Array<{ name: string; url: string; type: string }>> => {
    try {
      const bucket = 'cms-images';
      const folderPath = folder || '';
      
      const { data, error: listError } = await supabase.storage
        .from(bucket)
        .list(folderPath, { 
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError || !data) {
        console.error('Error listing files:', listError);
        return [];
      }

      return data
        .filter(file => file.name && !file.name.startsWith('.'))
        .map(file => {
          const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fullPath);
          
          return {
            name: file.name,
            url: urlData.publicUrl,
            type: detectMediaType(file.name)
          };
        });
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
