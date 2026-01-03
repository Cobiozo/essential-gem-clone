import { useState, useCallback } from 'react';
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

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      
      formData.append('file', file);
      if (options?.folder) {
        formData.append('folder', options.folder);
      }

      // Progress event
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
          options?.onProgress?.(percent);
        }
      });

      // Complete event
      xhr.addEventListener('load', () => {
        setIsUploading(false);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve({
                success: true,
                url: response.url,
                fileName: response.fileName || file.name,
                fileSize: response.fileSize || file.size,
                fileType: response.fileType || file.type
              });
            } else {
              const errorMsg = response.error || 'Błąd uploadu';
              setError(errorMsg);
              reject(new Error(errorMsg));
            }
          } catch (e) {
            const errorMsg = 'Nieprawidłowa odpowiedź serwera';
            setError(errorMsg);
            reject(new Error(errorMsg));
          }
        } else {
          let errorMsg = `Błąd HTTP ${xhr.status}`;
          try {
            const response = JSON.parse(xhr.responseText);
            errorMsg = response.error || errorMsg;
          } catch {}
          setError(errorMsg);
          reject(new Error(errorMsg));
        }
      });

      // Error event
      xhr.addEventListener('error', () => {
        setIsUploading(false);
        const errorMsg = 'Błąd połączenia z serwerem';
        setError(errorMsg);
        reject(new Error(errorMsg));
      });

      // Abort event
      xhr.addEventListener('abort', () => {
        setIsUploading(false);
        const errorMsg = 'Upload został przerwany';
        setError(errorMsg);
        reject(new Error(errorMsg));
      });

      // Send request
      xhr.open('POST', STORAGE_CONFIG.UPLOAD_API_URL);
      xhr.setRequestHeader('X-API-Key', STORAGE_CONFIG.API_KEY);
      xhr.send(formData);
    });
  }, []);

  const listFiles = useCallback(async (folder?: string): Promise<Array<{ name: string; url: string; type: string }>> => {
    try {
      const url = folder 
        ? `${STORAGE_CONFIG.LIST_API_URL}?folder=${encodeURIComponent(folder)}`
        : STORAGE_CONFIG.LIST_API_URL;
        
      const response = await fetch(url, {
        headers: {
          'X-API-Key': STORAGE_CONFIG.API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.files || [];
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
