import { useState, useRef, useCallback, useEffect } from 'react';
import { VideoBackgroundProcessor, BackgroundProcessorError, BG_ERROR_CODES, type BackgroundMode } from '@/components/meeting/VideoBackgroundProcessor';

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

function detectMobilePWA(): boolean {
  if (typeof navigator === 'undefined') return false;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  return isMobile || isStandalone;
}

export function useVideoBackground() {
  const [mode, setMode] = useState<BackgroundMode>(loadSavedMode);
  const [selectedImage, setSelectedImage] = useState<string | null>(loadSavedImage);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
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
    // If processor is actively running, hot-swap its source
    if (processorRef.current && processorRef.current.isReady()) {
      processorRef.current.updateSourceStream(stream);
    }
  }, []);

  const getRawStream = useCallback((): MediaStream | null => {
    return rawStreamRef.current;
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
        setLastError(null);
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
      setLastError(null);
      persistChoice('none', null);
      return sourceStream;
    }

    const videoTrack = sourceStream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState === 'ended') {
      console.warn('[useVideoBackground] Source stream has no live video track, cannot apply background');
      setMode('none');
      setLastError('BG_VIDEO_NOT_READY');
      persistChoice('none', null);
      return sourceStream;
    }

    setIsLoading(true);
    setLastError(null);
    const isMobilePWA = detectMobilePWA();

    // Stage 1: Normal attempt
    try {
      const result = await attemptApply(sourceStream, newMode, imageSrc);
      setIsLoading(false);
      return result;
    } catch (err1) {
      const errCode = err1 instanceof BackgroundProcessorError ? err1.code : 'BG_START_FAILED';
      console.warn(`[useVideoBackground] Stage 1 failed (${errCode}):`, err1);

      // Stage 2: On mobile/PWA, retry with compatibility mode
      if (isMobilePWA) {
        try {
          console.log('[useVideoBackground] Stage 2: retrying with compatibility mode...');
          // Destroy old processor, create fresh one in compat mode
          processorRef.current?.destroy();
          processorRef.current = null;
          const freshProcessor = getProcessor();
          freshProcessor.enableCompatibilityMode();
          
          const result = await attemptApply(sourceStream, newMode, imageSrc);
          setIsLoading(false);
          return result;
        } catch (err2) {
          console.warn('[useVideoBackground] Stage 2 (compat) failed:', err2);

          // Stage 3: Fallback to blur-light if original request was heavier
          if (newMode !== 'blur-light') {
            try {
              console.log('[useVideoBackground] Stage 3: falling back to blur-light...');
              const result = await attemptApply(sourceStream, 'blur-light', null);
              setIsLoading(false);
              setLastError('BG_FALLBACK_BLUR');
              return result;
            } catch (err3) {
              console.error('[useVideoBackground] Stage 3 (blur-light fallback) failed:', err3);
            }
          }
        }
      }

      // All stages failed
      setIsLoading(false);
      setMode('none');
      setLastError(errCode);
      persistChoice('none', null);
      throw err1;
    }
  }, [getProcessor, loadImage]);

  /** Internal helper: single apply attempt */
  const attemptApply = useCallback(async (
    sourceStream: MediaStream,
    newMode: BackgroundMode,
    imageSrc?: string | null,
  ): Promise<MediaStream> => {
    const processor = getProcessor();
    processor.stop();

    let bgImage: HTMLImageElement | null = null;
    if (newMode === 'image' && imageSrc) {
      bgImage = await loadImage(imageSrc);
    }

    processor.setOptions({ mode: newMode, backgroundImage: bgImage });
    const videoOnlyStream = await processor.start(sourceStream);
    
    // Combine video from processor with audio from raw source to prevent AEC issues
    const combinedStream = new MediaStream();
    videoOnlyStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));
    sourceStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
    (combinedStream as any).__bgProcessed = true;

    setMode(newMode);
    setSelectedImage(imageSrc || null);
    persistChoice(newMode, imageSrc || null);
    return combinedStream;
  }, [getProcessor, loadImage]);

  /** Lightweight preview: changes processor options without stop/start if already running */
  const previewBackground = useCallback(async (
    inputStream: MediaStream,
    newMode: BackgroundMode,
    imageSrc?: string | null,
  ): Promise<MediaStream> => {
    if (!rawStreamRef.current || rawStreamRef.current.getTracks().every(t => t.readyState === 'ended')) {
      if (!(inputStream as any).__bgProcessed) {
        rawStreamRef.current = inputStream;
      }
    }
    const sourceStream = rawStreamRef.current || inputStream;

    if (newMode === 'none') {
      processorRef.current?.stop();
      return sourceStream;
    }

    const videoTrack = sourceStream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState === 'ended') return sourceStream;

    const processor = getProcessor();

    let bgImage: HTMLImageElement | null = null;
    if (newMode === 'image' && imageSrc) {
      bgImage = await loadImage(imageSrc);
    }

    // If processor is already running, just swap options (no stop/start)
    if (processor.isReady()) {
      processor.setOptions({ mode: newMode, backgroundImage: bgImage });
      const videoStream = (processor as any).outputStream || sourceStream;
      if (videoStream !== sourceStream) {
        const combined = new MediaStream();
        videoStream.getVideoTracks().forEach((t: MediaStreamTrack) => combined.addTrack(t));
        sourceStream.getAudioTracks().forEach((t: MediaStreamTrack) => combined.addTrack(t));
        (combined as any).__bgProcessed = true;
        return combined;
      }
      return sourceStream;
    }

    // First time: full start
    processor.setOptions({ mode: newMode, backgroundImage: bgImage });
    const videoOnlyStream = await processor.start(sourceStream);
    const combinedStream = new MediaStream();
    videoOnlyStream.getVideoTracks().forEach((t: MediaStreamTrack) => combinedStream.addTrack(t));
    sourceStream.getAudioTracks().forEach((t: MediaStreamTrack) => combinedStream.addTrack(t));
    (combinedStream as any).__bgProcessed = true;
    return combinedStream;
  }, [getProcessor, loadImage]);

  const stopBackground = useCallback(() => {
    processorRef.current?.stop();
    // Stop raw camera tracks to release hardware (prevents camera LED staying on)
    rawStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
    rawStreamRef.current = null;
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
    lastError,
    applyBackground,
    previewBackground,
    stopBackground,
    updateRawStream,
    getRawStream,
    setParticipantCount,
    getSavedBackground,
    backgroundImages: [] as string[],
  };
}
