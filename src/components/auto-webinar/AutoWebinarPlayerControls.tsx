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
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen not supported', err);
    }
  };

  return (
    <div
      ref={controlsRef}
      className={cn(
        'absolute bottom-0 left-0 right-0 flex items-center justify-end px-3 py-2 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Fullscreen */}
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
