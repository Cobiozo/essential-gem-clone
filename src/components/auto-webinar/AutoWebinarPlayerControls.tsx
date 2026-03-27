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
  const controlsRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={controlsRef}
      className={cn(
        'absolute bottom-0 left-0 right-0 flex items-center justify-end px-3 py-2 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-30',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <button
        onClick={toggleFullscreen}
        className="text-white hover:text-white/80 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={isFullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'}
      >
        {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
      </button>
    </div>
  );
};
