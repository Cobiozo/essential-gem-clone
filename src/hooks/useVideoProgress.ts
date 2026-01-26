import { useState, useCallback, useRef, useEffect } from 'react';

interface VideoProgress {
  position: number;
  updatedAt: number;
}

interface UseVideoProgressOptions {
  videoId: string;
  maxAge?: number; // Max age in ms before progress is discarded (default: 7 days)
}

export const useVideoProgress = ({ videoId, maxAge = 7 * 24 * 60 * 60 * 1000 }: UseVideoProgressOptions) => {
  const [savedPosition, setSavedPosition] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTimeRef = useRef(0);
  
  // Generate storage key from video ID
  const storageKey = `cms_video_progress_${videoId}`;
  
  // Load saved progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const progress: VideoProgress = JSON.parse(saved);
        if (Date.now() - progress.updatedAt < maxAge && progress.position > 5) {
          setSavedPosition(progress.position);
        }
      } catch (e) {
        console.error('Error parsing saved video progress:', e);
      }
    }
  }, [storageKey, maxAge]);
  
  // Save progress function
  const saveProgress = useCallback((position: number) => {
    if (!videoId || position <= 0) return;
    localStorage.setItem(storageKey, JSON.stringify({
      position,
      updatedAt: Date.now()
    }));
  }, [storageKey, videoId]);
  
  // Update ref when time changes
  const handleTimeUpdate = useCallback((time: number) => {
    currentTimeRef.current = time;
  }, []);
  
  // Handle play state change
  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);
  
  // Save on visibility change (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveProgress]);
  
  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProgress]);
  
  // Periodic save every 5 seconds during playback
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      if (currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPlaying, saveProgress]);
  
  // Clear saved progress
  const clearProgress = useCallback(() => {
    localStorage.removeItem(storageKey);
    setSavedPosition(null);
  }, [storageKey]);
  
  return {
    savedPosition,
    handleTimeUpdate,
    handlePlayStateChange,
    clearProgress,
    currentTimeRef
  };
};
