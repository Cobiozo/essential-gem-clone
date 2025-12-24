import { useCallback, useRef, useEffect } from 'react';

interface CompressionResult {
  type: 'success' | 'error' | 'progress';
  blob?: ArrayBuffer;
  originalSize?: number;
  compressedSize?: number;
  message?: string;
  error?: string;
}

interface UseImageCompressionWorkerReturn {
  compressImage: (file: File) => Promise<File>;
  isSupported: boolean;
}

// Feature detection for OffscreenCanvas support
const isOffscreenCanvasSupported = (): boolean => {
  try {
    return typeof OffscreenCanvas !== 'undefined' && 
           typeof createImageBitmap !== 'undefined';
  } catch {
    return false;
  }
};

export const useImageCompressionWorker = (
  onProgress?: (message: string) => void
): UseImageCompressionWorkerReturn => {
  const workerRef = useRef<Worker | null>(null);
  const isSupported = isOffscreenCanvasSupported();

  useEffect(() => {
    // Only create worker if OffscreenCanvas is supported
    if (isSupported && !workerRef.current) {
      try {
        workerRef.current = new Worker(
          new URL('../workers/imageCompression.worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch (error) {
        console.warn('Failed to create compression worker:', error);
      }
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [isSupported]);

  // Fallback compression for browsers without OffscreenCanvas support
  const compressImageFallback = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        const fileSizeMB = file.size / (1024 * 1024);
        let scaleFactor = 0.8;
        let quality = 0.8;

        if (fileSizeMB > 100) {
          scaleFactor = 0.5;
          quality = 0.6;
        } else if (fileSizeMB > 75) {
          scaleFactor = 0.6;
          quality = 0.7;
        } else if (fileSizeMB > 50) {
          scaleFactor = 0.7;
          quality = 0.75;
        }

        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;

        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        canvas.toBlob(
          async (blob) => {
            if (blob) {
              try {
                const buffer = await blob.arrayBuffer();
                const compressedFile = new File([buffer], file.name, {
                  type: blob.type,
                });

                const newSizeMB = blob.size / (1024 * 1024);
                onProgress?.(
                  `Kompresja zakończona: ${Math.round(fileSizeMB)}MB → ${Math.round(newSizeMB)}MB`
                );
                resolve(compressedFile);
              } catch (e) {
                console.error('Blob to File conversion failed:', e);
                resolve(file);
              }
            } else {
              resolve(file);
            }
          },
          file.type,
          quality
        );

        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(file);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, [onProgress]);

  // Main compression function using Web Worker
  const compressImageWithWorker = useCallback(
    async (file: File): Promise<File> => {
      const worker = workerRef.current;

      if (!worker) {
        // Fallback if worker failed to initialize
        return compressImageFallback(file);
      }

      return new Promise((resolve) => {
        const handleMessage = (e: MessageEvent<CompressionResult>) => {
          const result = e.data;

          if (result.type === 'progress') {
            onProgress?.(result.message || 'Kompresowanie...');
          } else if (result.type === 'success' && result.blob) {
            worker.removeEventListener('message', handleMessage);
            
            const compressedFile = new File([result.blob], file.name, {
              type: file.type,
            });
            
            onProgress?.(result.message || 'Kompresja zakończona');
            resolve(compressedFile);
          } else if (result.type === 'error') {
            worker.removeEventListener('message', handleMessage);
            console.error('Worker compression error:', result.error);
            // Fallback to main thread compression
            compressImageFallback(file).then(resolve);
          }
        };

        worker.addEventListener('message', handleMessage);

        // Send file data to worker
        file.arrayBuffer().then((arrayBuffer) => {
          worker.postMessage(
            {
              type: 'compress',
              imageData: arrayBuffer,
              fileName: file.name,
              fileType: file.type,
              fileSizeMB: file.size / (1024 * 1024),
            },
            [arrayBuffer] // Transfer ownership
          );
        });
      });
    },
    [onProgress, compressImageFallback]
  );

  const compressImage = useCallback(
    async (file: File): Promise<File> => {
      const fileSizeMB = file.size / (1024 * 1024);

      // Only compress images over 49MB
      if (fileSizeMB <= 49 || !file.type.startsWith('image/')) {
        return file;
      }

      onProgress?.('Rozpoczynanie kompresji obrazu...');

      // Use worker if supported, otherwise fallback
      if (isSupported && workerRef.current) {
        return compressImageWithWorker(file);
      } else {
        return compressImageFallback(file);
      }
    },
    [isSupported, compressImageWithWorker, compressImageFallback, onProgress]
  );

  return {
    compressImage,
    isSupported,
  };
};
