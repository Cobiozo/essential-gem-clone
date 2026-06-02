import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import type { IntroVideoSettings } from '@/hooks/useIntroVideoSettings';
import { cn } from '@/lib/utils';

interface Props {
  settings: IntroVideoSettings;
  mode?: 'live' | 'preview';
  onClose?: () => void;
  className?: string;
  /** Reset playback whenever this value changes (preview re-trigger). */
  resetKey?: number | string;
}

const positionToClass = (pos: string): string => {
  switch (pos) {
    case 'top': return 'items-start justify-center';
    case 'bottom': return 'items-end justify-center';
    case 'top-left': return 'items-start justify-start';
    case 'top-right': return 'items-start justify-end';
    case 'bottom-left': return 'items-end justify-start';
    case 'bottom-right': return 'items-end justify-end';
    case 'center':
    default: return 'items-center justify-center';
  }
};

const sizeToWidthPercent = (size: string, custom: number): number => {
  switch (size) {
    case 'small': return 30;
    case 'medium': return 60;
    case 'large': return 85;
    case 'fullscreen': return 100;
    case 'custom': return Math.min(100, Math.max(15, custom));
    default: return 60;
  }
};

const backdropClass = (style: string): string => {
  switch (style) {
    case 'blur': return 'bg-black/40 backdrop-blur-xl';
    case 'dim': return 'bg-black/70';
    case 'solid':
    default: return 'bg-black';
  }
};

export const IntroVideoStage: React.FC<Props> = ({
  settings,
  mode = 'live',
  onClose,
  className,
  resetKey,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(settings.default_muted);
  const [showSkip, setShowSkip] = useState(false);
  const [ended, setEnded] = useState(false);

  const displaySize = (settings as any).display_size ?? 'medium';
  const customW = (settings as any).custom_width_percent ?? 60;
  const position = (settings as any).position ?? 'center';
  const objectFit = (settings as any).object_fit ?? 'contain';
  const backdropStyle = (settings as any).backdrop_style ?? 'solid';
  const borderRadius = (settings as any).border_radius ?? 16;

  const widthPct = sizeToWidthPercent(displaySize, customW);
  const isFullscreen = displaySize === 'fullscreen';

  useEffect(() => {
    setMuted(settings.default_muted);
    setShowSkip(false);
    setEnded(false);
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      } catch { /* noop */ }
    }
    if (!settings.allow_skip) return;
    const t = window.setTimeout(() => setShowSkip(true), settings.skip_after_ms);
    return () => window.clearTimeout(t);
  }, [resetKey, settings.default_muted, settings.allow_skip, settings.skip_after_ms, settings.video_url]);

  const toggleMute = () => {
    setMuted((m) => {
      if (videoRef.current) videoRef.current.muted = !m;
      return !m;
    });
  };

  const handleEnded = () => {
    setEnded(true);
    if (mode === 'live') onClose?.();
  };

  const videoStyle: React.CSSProperties = isFullscreen
    ? { width: '100%', height: '100%', borderRadius: 0 }
    : {
        width: `${widthPct}%`,
        maxHeight: '90%',
        aspectRatio: '16 / 9',
        borderRadius: `${borderRadius}px`,
      };

  return (
    <div
      className={cn(
        'absolute inset-0 flex overflow-hidden',
        backdropClass(backdropStyle),
        positionToClass(position),
        !isFullscreen && 'p-4 md:p-8',
        className,
      )}
      role="dialog"
      aria-label="Intro"
    >
      {settings.video_url ? (
        <video
          ref={videoRef}
          src={settings.video_url}
          autoPlay
          muted={muted}
          playsInline
          preload="auto"
          style={videoStyle}
          className={cn(
            objectFit === 'cover' ? 'object-cover' : 'object-contain',
            !isFullscreen && 'shadow-2xl bg-black',
          )}
          onEnded={handleEnded}
          onError={handleEnded}
        />
      ) : (
        <div
          style={videoStyle}
          className="flex items-center justify-center bg-black/60 text-white/60 text-sm"
        >
          Brak pliku wideo
        </div>
      )}

      {settings.video_url && (
        <button
          type="button"
          onClick={toggleMute}
          className="absolute bottom-4 left-4 md:bottom-6 md:left-6 bg-black/50 hover:bg-black/70 text-white p-2.5 md:p-3 rounded-full backdrop-blur-sm transition z-10"
          aria-label={muted ? 'Włącz dźwięk' : 'Wycisz'}
        >
          {muted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
        </button>
      )}

      {settings.video_url && settings.allow_skip && showSkip && !ended && (
        <button
          type="button"
          onClick={() => (mode === 'live' ? onClose?.() : setEnded(true))}
          className="absolute top-4 right-4 md:top-6 md:right-6 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full backdrop-blur-sm flex items-center gap-2 text-xs md:text-sm font-medium animate-fade-in z-10"
          aria-label="Pomiń intro"
        >
          Pomiń <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
      )}
    </div>
  );
};

export default IntroVideoStage;
