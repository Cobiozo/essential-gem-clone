import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AutoWebinarPlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const AutoWebinarPlayerControls: React.FC<AutoWebinarPlayerControlsProps> = ({
  videoRef,
  containerRef,
  isMuted,
  onToggleMute,
}) => {
  const [volume, setVolume] = useState(1);
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

  const handleVolumeChange = (values: number[]) => {
    const v = values[0];
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      if (v > 0 && videoRef.current.muted) {
        onToggleMute();
      }
    }
  };

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
        'absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Mute toggle */}
      <button
        onClick={onToggleMute}
        className="text-white hover:text-white/80 transition-colors p-1"
        aria-label={isMuted ? 'Włącz dźwięk' : 'Wycisz'}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* Volume slider */}
      <div className="w-20 sm:w-28">
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.05}
          onValueChange={handleVolumeChange}
          className="cursor-pointer"
        />
      </div>

      <div className="flex-1" />

      {/* Fullscreen */}
      <button
        onClick={toggleFullscreen}
        className="text-white hover:text-white/80 transition-colors p-1"
        aria-label={isFullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'}
      >
        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      </button>
    </div>
  );
};
