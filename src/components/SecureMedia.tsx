import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VideoControls } from '@/components/training/VideoControls';

interface SecureMediaProps {
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document' | 'audio' | 'other';
  altText?: string;
  className?: string;
  disableInteraction?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  initialTime?: number;
}

// YouTube URL detection and ID extraction
const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};

export const SecureMedia: React.FC<SecureMediaProps> = ({
  mediaUrl,
  mediaType,
  altText,
  className,
  disableInteraction = false,
  onPlayStateChange,
  onTimeUpdate,
  onDurationChange,
  initialTime = 0
}) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTabHidden, setIsTabHidden] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastValidTimeRef = useRef<number>(initialTime);
  const isSeekingRef = useRef<boolean>(false);
  const initialPositionSetRef = useRef<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Refs for callbacks to avoid dependency cycles in useEffect
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onPlayStateChangeRef = useRef(onPlayStateChange);
  const onDurationChangeRef = useRef(onDurationChange);
  
  // Keep refs in sync with latest callbacks
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);
  
  useEffect(() => {
    onPlayStateChangeRef.current = onPlayStateChange;
  }, [onPlayStateChange]);
  
  useEffect(() => {
    onDurationChangeRef.current = onDurationChange;
  }, [onDurationChange]);

  // Fullscreen handler
  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  // Listener for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // URL processing effect
  useEffect(() => {
    let mounted = true;

    if (isYouTubeUrl(mediaUrl)) {
      const id = extractYouTubeId(mediaUrl);
      if (mounted) {
        setIsYouTube(true);
        setYoutubeId(id);
        setLoading(false);
      }
      return;
    }

    setIsYouTube(false);
    setYoutubeId(null);

    if (mediaUrl.includes('purelife.info.pl')) {
      if (mounted) {
        setSignedUrl(mediaUrl);
        setLoading(false);
      }
      return;
    }

    if ((mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) && 
        !mediaUrl.includes('supabase.co')) {
      if (mounted) {
        setSignedUrl(mediaUrl);
        setLoading(false);
      }
      return;
    }

    const getSignedUrl = async () => {
      try {
        if (mediaUrl.includes('supabase.co')) {
          const urlObj = new URL(mediaUrl);
          const pathParts = urlObj.pathname.split('/storage/v1/object/public/');
          if (pathParts.length > 1) {
            const [bucket, ...filePath] = pathParts[1].split('/');
            
            const { data, error } = await supabase.storage
              .from(bucket)
              .createSignedUrl(filePath.join('/'), 3600);

            if (!mounted) return;
            if (error) {
              console.warn('Error creating signed URL, using original:', error);
              setSignedUrl(mediaUrl);
              return;
            }
            setSignedUrl(data.signedUrl);
            return;
          }
        }

        const urlParts = mediaUrl.split('/');
        const bucketName = urlParts[urlParts.length - 2];
        const fileName = urlParts[urlParts.length - 1];
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(fileName, 3600);

        if (!mounted) return;

        if (error) {
          console.warn('Error creating signed URL, using original:', error);
          setSignedUrl(mediaUrl);
          return;
        }

        setSignedUrl(data.signedUrl);
      } catch (error) {
        console.error('Error processing media URL:', error);
        if (mounted) setSignedUrl(mediaUrl);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (mediaUrl) {
      getSignedUrl();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [mediaUrl]);

  // Reset initial position flag when video source changes
  useEffect(() => {
    initialPositionSetRef.current = false;
  }, [signedUrl]);

  // Sync lastValidTimeRef when initialTime changes (for resume functionality)
  useEffect(() => {
    if (initialTime > 0 && disableInteraction) {
      lastValidTimeRef.current = initialTime;
      setCurrentTime(initialTime);
    }
  }, [initialTime, disableInteraction]);

  // Set video position when initialTime changes and video is ready (only once)
  useEffect(() => {
    if (mediaType !== 'video' || !videoRef.current || !signedUrl) return;
    if (initialPositionSetRef.current) return; // Only set once
    
    const video = videoRef.current;
    
    // Set position when video is ready and initialTime is available
    if (initialTime > 0 && disableInteraction && video.readyState >= 1) {
      video.currentTime = initialTime;
      lastValidTimeRef.current = initialTime;
      setCurrentTime(initialTime);
      initialPositionSetRef.current = true;
    }
  }, [initialTime, mediaType, signedUrl, disableInteraction]);

  // Set initial time when video metadata loads
  useEffect(() => {
    if (mediaType !== 'video' || !videoRef.current || !signedUrl) return;
    
    const video = videoRef.current;
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      onDurationChangeRef.current?.(video.duration);
      
      // Set position if initialTime is already available and not set yet
      if (initialTime > 0 && disableInteraction && !initialPositionSetRef.current) {
        video.currentTime = initialTime;
        lastValidTimeRef.current = initialTime;
        setCurrentTime(initialTime);
        initialPositionSetRef.current = true;
      }
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [mediaType, signedUrl, initialTime, disableInteraction]);

  // Seek blocking and time tracking for restricted mode
  useEffect(() => {
    if (mediaType !== 'video' || !disableInteraction || !videoRef.current) return;

    const video = videoRef.current;

    // Block ALL seeking (forward and backward)
    const handleSeeking = () => {
      if (isSeekingRef.current) return;
      
      const timeDiff = Math.abs(video.currentTime - lastValidTimeRef.current);
      
      // If time jumped more than 1.5 seconds, it's a seek attempt - block it
      if (timeDiff > 1.5) {
        isSeekingRef.current = true;
        video.currentTime = lastValidTimeRef.current;
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 100);
      }
    };

    // Update valid time only during normal playback
    const handleTimeUpdate = () => {
      if (isSeekingRef.current) return;
      
      const timeDiff = video.currentTime - lastValidTimeRef.current;
      
      // Only update if time moved forward naturally (within 1.5 seconds)
      if (timeDiff > 0 && timeDiff <= 1.5) {
        lastValidTimeRef.current = video.currentTime;
      }
      
      setCurrentTime(video.currentTime);
      onTimeUpdateRef.current?.(video.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChangeRef.current?.(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChangeRef.current?.(false);
      
      // CRITICAL: Save current position on pause for accurate progress tracking
      if (video) {
        const currentPos = video.currentTime;
        lastValidTimeRef.current = currentPos;
        onTimeUpdateRef.current?.(currentPos);
      }
    };

    // Block playback rate changes
    const handleRateChange = () => {
      if (video.playbackRate !== 1) {
        video.playbackRate = 1;
      }
    };

    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ratechange', handleRateChange);
    
    return () => {
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ratechange', handleRateChange);
    };
  }, [mediaType, disableInteraction, signedUrl]); // Removed callback deps - using refs

  // Time tracking for unrestricted mode
  useEffect(() => {
    if (mediaType !== 'video' || disableInteraction || !videoRef.current) return;

    const video = videoRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdateRef.current?.(video.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChangeRef.current?.(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChangeRef.current?.(false);
      
      // Ensure accurate position is saved on pause (consistent with restricted mode)
      if (video) {
        onTimeUpdateRef.current?.(video.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [mediaType, disableInteraction, signedUrl]); // Removed callback deps - using refs

  // Visibility API - pause video when tab is hidden
  useEffect(() => {
    if (mediaType !== 'video' || !disableInteraction) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabHidden(true);
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      } else {
        setIsTabHidden(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mediaType, disableInteraction]);

  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSelectStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-muted rounded-lg w-full h-48 flex items-center justify-center">
        <span className="text-muted-foreground">Ładowanie...</span>
      </div>
    );
  }

  if (!signedUrl && !isYouTube) {
    return (
      <div className="bg-muted rounded-lg w-full h-48 flex items-center justify-center">
        <span className="text-muted-foreground">Nie można załadować mediów</span>
      </div>
    );
  }

  const securityProps = {
    onContextMenu: handleContextMenu,
    onDragStart: handleDragStart,
    onSelectStart: handleSelectStart,
    style: { 
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    } as React.CSSProperties,
    draggable: false
  };

  if (mediaType === 'video') {
    // Handle YouTube videos
    if (isYouTube && youtubeId) {
      return (
        <div className="space-y-3">
          <div className={`relative w-full aspect-video rounded-lg overflow-hidden ${className || ''}`}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
              title={altText || 'YouTube video'}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {disableInteraction && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              <strong>Uwaga:</strong> Dla filmów YouTube pełna kontrola odtwarzania nie jest możliwa. 
              Timer będzie liczył czas niezależnie od stanu wideo.
            </div>
          )}
        </div>
      );
    }

    // Handle regular video files with restricted mode
    if (disableInteraction) {
      return (
        <div 
          ref={containerRef}
          className={`space-y-3 ${isFullscreen ? 'bg-black flex flex-col justify-center h-screen p-4' : ''}`}
        >
          <video
            ref={videoRef}
            {...securityProps}
            src={signedUrl}
            controls={false}
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            className={`w-full h-auto rounded-lg ${isFullscreen ? 'max-h-[85vh] object-contain' : ''} ${className || ''}`}
            preload="metadata"
            playsInline
          >
            Twoja przeglądarka nie obsługuje odtwarzania wideo.
          </video>
          <VideoControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={handlePlayPause}
            isTabHidden={isTabHidden}
            onFullscreen={handleFullscreen}
            isFullscreen={isFullscreen}
          />
        </div>
      );
    }

    // Handle regular video files with full controls (lesson completed)
    return (
      <video
        ref={videoRef}
        {...securityProps}
        src={signedUrl}
        controls
        controlsList="nodownload"
        className={`w-full h-auto rounded-lg ${className || ''}`}
        preload="metadata"
      >
        Twoja przeglądarka nie obsługuje odtwarzania wideo.
      </video>
    );
  }

  if (mediaType === 'audio') {
    return (
      <div className={`w-full p-4 border rounded-lg bg-card ${className || ''}`}>
        <audio
          {...securityProps}
          src={signedUrl}
          controls
          controlsList="nodownload"
          className="w-full"
          preload="metadata"
        >
          Twoja przeglądarka nie obsługuje odtwarzania audio.
        </audio>
        <p className="text-sm text-muted-foreground mt-2">{altText || 'Plik audio'}</p>
      </div>
    );
  }

  if (mediaType === 'document' || mediaType === 'other') {
    const fileName = mediaUrl.split('/').pop() || 'Dokument';
    const extension = fileName.split('.').pop()?.toUpperCase() || '';
    
    return (
      <div className={`w-full p-4 border rounded-lg bg-card flex items-center gap-3 ${className || ''}`}>
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-primary font-semibold text-xs">{extension}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{altText || fileName}</p>
          <p className="text-xs text-muted-foreground">Dokument • {extension}</p>
        </div>
        <button
          onClick={() => window.open(signedUrl, '_blank')}
          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Otwórz
        </button>
      </div>
    );
  }

  return (
    <img
      {...securityProps}
      src={signedUrl}
      alt={altText || 'Zabezpieczone zdjęcie'}
      className={`max-w-full h-auto rounded-lg ${className || ''}`}
      loading="lazy"
    />
  );
};
