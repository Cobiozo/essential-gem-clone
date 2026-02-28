import { useState, useRef, useCallback, useEffect } from 'react';
import { VideoBackgroundProcessor, type BackgroundMode } from '@/components/meeting/VideoBackgroundProcessor';

const BACKGROUND_IMAGES = [
  '/backgrounds/bg-office.jpg',
  '/backgrounds/bg-nature.jpg',
  '/backgrounds/bg-abstract.jpg',
];

const LS_KEY_MODE = 'meeting_bg_mode';
const LS_KEY_IMAGE = 'meeting_bg_image';

function loadSavedMode(): BackgroundMode {
  try {
    const v = localStorage.getItem(LS_KEY_MODE);
    if (v === 'blur-light' || v === 'blur-heavy' || v === 'image') return v;
  } catch {}
  return 'none';
}

function loadSavedImage(): string | null {
  try {
    return localStorage.getItem(LS_KEY_IMAGE) || null;
  } catch {}
  return null;
}

function persistChoice(mode: BackgroundMode, image: string | null) {
  try {
    localStorage.setItem(LS_KEY_MODE, mode);
    if (image) localStorage.setItem(LS_KEY_IMAGE, image);
    else localStorage.removeItem(LS_KEY_IMAGE);
  } catch {}
}

export function useVideoBackground() {
  const [mode, setMode] = useState<BackgroundMode>(loadSavedMode);
  const [selectedImage, setSelectedImage] = useState<string | null>(loadSavedImage);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const processorRef = useRef<VideoBackgroundProcessor | null>(null);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rawStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
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

  const updateRawStream = useCallback((stream: MediaStream) => {
    rawStreamRef.current = stream;
  }, []);

  const applyBackground = useCallback(async (
    inputStream: MediaStream,
    newMode: BackgroundMode,
    imageSrc?: string | null,
  ): Promise<MediaStream> => {
    if (!rawStreamRef.current || rawStreamRef.current.getTracks().every(t => t.readyState === 'ended')) {
      if ((inputStream as any).__bgProcessed) {
        console.warn('[useVideoBackground] Cannot use processed stream as raw source, skipping effect');
        setMode('none');
        persistChoice('none', null);
        return inputStream;
      }
      rawStreamRef.current = inputStream;
    }
    const sourceStream = rawStreamRef.current;

    if (newMode === 'none') {
      processorRef.current?.stop();
      setMode('none');
      setSelectedImage(null);
      persistChoice('none', null);
      return sourceStream;
    }

    const videoTrack = sourceStream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState === 'ended') {
      console.warn('[useVideoBackground] Source stream has no live video track, cannot apply background');
      setMode('none');
      persistChoice('none', null);
      return sourceStream;
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
      const outputStream = await processor.start(sourceStream);
      (outputStream as any).__bgProcessed = true;

      setMode(newMode);
      setSelectedImage(imageSrc || null);
      persistChoice(newMode, imageSrc || null);
      setIsLoading(false);
      return outputStream;
    } catch (err) {
      console.error('[useVideoBackground] Failed to apply background:', err);
      setIsLoading(false);
      setMode('none');
      persistChoice('none', null);
      throw err;
    }
  }, [getProcessor, loadImage]);

  const stopBackground = useCallback(() => {
    processorRef.current?.stop();
    setMode('none');
    setSelectedImage(null);
    // Don't clear localStorage — background persists between meetings
  }, []);

  const setParticipantCount = useCallback((count: number) => {
    if (processorRef.current) {
      processorRef.current.setParticipantCount(count);
    }
  }, []);

  /** Returns saved background settings for auto-apply on reconnect */
  const getSavedBackground = useCallback((): { mode: BackgroundMode; image: string | null } => {
    return { mode: loadSavedMode(), image: loadSavedImage() };
  }, []);

  return {
    mode,
    selectedImage,
    isLoading,
    isSupported,
    applyBackground,
    stopBackground,
    updateRawStream,
    setParticipantCount,
    getSavedBackground,
    backgroundImages: BACKGROUND_IMAGES,
  };
}
