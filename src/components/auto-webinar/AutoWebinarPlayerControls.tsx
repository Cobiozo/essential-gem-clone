import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoWebinarPlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const AutoWebinarPlayerControls: React.FC<AutoWebinarPlayerControlsProps> = ({
  videoRef,
  containerRef,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visible, setVisible] = useState(true);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();
  const controlsRef = useRef<HTMLButtonElement>(null);

  const showControls = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleMove = () => showControls();
    const handleLeave = () => {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = setTimeout(() => setVisible(false), 1000);
    };
    container.addEventListener('mousemove', handleMove);
    container.addEventListener('mouseleave', handleLeave);
    container.addEventListener('touchstart', handleMove);
    showControls();
    return () => {
      container.removeEventListener('mousemove', handleMove);
      container.removeEventListener('mouseleave', handleLeave);
      container.removeEventListener('touchstart', handleMove);
      clearTimeout(hideTimeout.current);
    };
  }, [containerRef, showControls]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    
    // iOS video fullscreen events
    const video = videoRef.current;
    const videoBegin = () => setIsFullscreen(true);
    const videoEnd = () => setIsFullscreen(false);
    if (video) {
      video.addEventListener('webkitbeginfullscreen', videoBegin);
      video.addEventListener('webkitendfullscreen', videoEnd);
    }
    
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', videoBegin);
        video.removeEventListener('webkitendfullscreen', videoEnd);
      }
    };
  }, [videoRef]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
    } catch {}

    // Try standard fullscreen on container first
    const container = containerRef.current;
    if (container) {
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
          return;
        }
        // webkit prefix
        if ((container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
          return;
        }
      } catch {}
    }

    // iOS Safari fallback: fullscreen on video element
    const video = videoRef.current;
    if (video) {
      try {
        if ((video as any).webkitEnterFullscreen) {
          (video as any).webkitEnterFullscreen();
          return;
        }
        if ((video as any).webkitRequestFullscreen) {
          (video as any).webkitRequestFullscreen();
          return;
        }
      } catch (err) {
        console.warn('Fullscreen not supported', err);
      }
    }
  };

  return (
    <button
      ref={controlsRef}
      onClick={toggleFullscreen}
      className={cn(
        'absolute bottom-2 left-2 z-30 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all duration-300',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      aria-label={isFullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'}
    >
      {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
    </button>
  );
};
