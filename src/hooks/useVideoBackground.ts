import { useState, useRef, useCallback, useEffect } from 'react';
import { VideoBackgroundProcessor, type BackgroundMode } from '@/components/meeting/VideoBackgroundProcessor';

const BACKGROUND_IMAGES = [
  '/backgrounds/bg-office.jpg',
  '/backgrounds/bg-nature.jpg',
  '/backgrounds/bg-abstract.jpg',
];

export function useVideoBackground() {
  const [mode, setMode] = useState<BackgroundMode>('none');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const processorRef = useRef<VideoBackgroundProcessor | null>(null);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    // Check basic support (WebGL/GPU required)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) setIsSupported(false);
    } catch {
      setIsSupported(false);
    }
    return () => {
      processorRef.current?.destroy();
      processorRef.current = null;
    };
  }, []);

  const loadImage = useCallback(async (src: string): Promise<HTMLImageElement> => {
    const cached = loadedImagesRef.current.get(src);
    if (cached) return cached;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { loadedImagesRef.current.set(src, img); resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const getProcessor = useCallback(() => {
    if (!processorRef.current) {
      processorRef.current = new VideoBackgroundProcessor();
    }
    return processorRef.current;
  }, []);

  const applyBackground = useCallback(async (
    inputStream: MediaStream,
    newMode: BackgroundMode,
    imageSrc?: string | null,
  ): Promise<MediaStream> => {
    if (newMode === 'none') {
      processorRef.current?.stop();
      setMode('none');
      setSelectedImage(null);
      return inputStream;
    }

    setIsLoading(true);
    try {
      const processor = getProcessor();
      processor.stop();

      let bgImage: HTMLImageElement | null = null;
      if (newMode === 'image' && imageSrc) {
        bgImage = await loadImage(imageSrc);
      }

      processor.setOptions({ mode: newMode, backgroundImage: bgImage });
      const outputStream = await processor.start(inputStream);

      setMode(newMode);
      setSelectedImage(imageSrc || null);
      setIsLoading(false);
      return outputStream;
    } catch (err) {
      console.error('[useVideoBackground] Failed to apply background:', err);
      setIsLoading(false);
      setMode('none');
      return inputStream;
    }
  }, [getProcessor, loadImage]);

  const stopBackground = useCallback(() => {
    processorRef.current?.stop();
    setMode('none');
    setSelectedImage(null);
  }, []);

  return {
    mode,
    selectedImage,
    isLoading,
    isSupported,
    applyBackground,
    stopBackground,
    backgroundImages: BACKGROUND_IMAGES,
  };
}
