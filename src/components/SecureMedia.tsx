import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecureMediaProps {
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document' | 'audio' | 'other';
  altText?: string;
  className?: string;
  disableInteraction?: boolean; // For training videos - prevents pause and seek
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
  disableInteraction = false
}) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let mounted = true;

    // Check if it's a YouTube URL first
    if (isYouTubeUrl(mediaUrl)) {
      const id = extractYouTubeId(mediaUrl);
      if (mounted) {
        setIsYouTube(true);
        setYoutubeId(id);
        setLoading(false);
      }
      return;
    }

    // Reset YouTube state for non-YouTube URLs
    setIsYouTube(false);
    setYoutubeId(null);

    const getSignedUrl = async () => {
      try {
        // Extract bucket and path from the media URL
        const urlParts = mediaUrl.split('/');
        const bucketName = urlParts[urlParts.length - 2];
        const fileName = urlParts[urlParts.length - 1];
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(fileName, 3600); // 1 hour expiry

        if (!mounted) return;

        if (error) {
          console.error('Error creating signed URL:', error);
          return;
        }

        setSignedUrl(data.signedUrl);
      } catch (error) {
        console.error('Error processing media URL:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (mediaUrl) {
      getSignedUrl();
    }

    return () => {
      mounted = false;
    };
  }, [mediaUrl]);

  // Block seeking for training videos
  useEffect(() => {
    if (mediaType !== 'video' || !disableInteraction || !videoRef.current) return;

    const video = videoRef.current;
    let lastValidTime = 0;

    const preventSeek = () => {
      // Force video to continue from where it was, preventing backwards seek
      if (Math.abs(video.currentTime - lastValidTime) > 0.5 && video.currentTime < lastValidTime) {
        video.currentTime = lastValidTime;
      } else {
        lastValidTime = video.currentTime;
      }
    };

    video.addEventListener('timeupdate', preventSeek);
    
    return () => {
      video.removeEventListener('timeupdate', preventSeek);
    };
  }, [mediaType, disableInteraction, signedUrl]);

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
        <div className={`relative w-full aspect-video rounded-lg overflow-hidden ${className || ''}`}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
            title={altText || 'YouTube video'}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    // Handle regular video files
    const handleVideoInteraction = (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (!disableInteraction) return;
      
      const video = e.currentTarget;
      
      // Prevent pause
      if (e.type === 'pause' && !video.ended) {
        video.play();
      }
      
      // Prevent seeking
      if (e.type === 'seeking' || e.type === 'seeked') {
        // This will be handled by blocking the seek in the effect
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!disableInteraction) return;
      
      // Block space (pause) and arrow keys (seek)
      if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
      }
    };

    return (
      <video
        ref={videoRef}
        {...securityProps}
        src={signedUrl}
        controls={!disableInteraction}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        className={`w-full h-auto rounded-lg ${className || ''}`}
        preload="metadata"
        onPause={handleVideoInteraction}
        onSeeking={handleVideoInteraction}
        onSeeked={handleVideoInteraction}
        onKeyDown={handleKeyDown}
        autoPlay={disableInteraction}
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