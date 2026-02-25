import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateMediaToken, getStreamMediaUrl, shouldProtectUrl, resolveStreamUrl } from '@/lib/mediaTokenService';
import { useAuth } from '@/contexts/AuthContext';
import { VideoControls } from '@/components/training/VideoControls';
import { SecureVideoControls } from '@/components/training/SecureVideoControls';
import { 
  getAdaptiveBufferConfig, 
  getBufferedRanges, 
  getBufferedAhead,
  getRetryDelay,
  getVideoErrorType,
  getNetworkQuality,
  isSlowNetwork,
  VIDEO_ERROR_TYPES,
  type BufferConfig 
} from '@/lib/videoBufferConfig';

interface NoteMarker {
  id: string;
  timestamp: number;
}

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
  // Notes integration
  noteMarkers?: NoteMarker[];
  onNoteMarkerClick?: (noteId: string) => void;
  seekToTimeRef?: React.MutableRefObject<((time: number) => void) | null>;
  // External pause request (e.g., when notes dialog opens)
  pauseRequested?: boolean;
  // Control mode: 'native' = browser controls, 'restricted' = no seek/speed (training), 'secure' = full controls without download (news)
  controlMode?: 'native' | 'restricted' | 'secure';
}

// YouTube URL detection and ID extraction
const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
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
  initialTime = 0,
  noteMarkers,
  onNoteMarkerClick,
  seekToTimeRef,
  pauseRequested = false,
  controlMode
}) => {
  // Get admin status for diagnostics
  const { isAdmin } = useAuth();
  
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [forceHideBuffering, setForceHideBuffering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasExhaustedRetries, setHasExhaustedRetries] = useState(false);
  
  // NEW: Debounced spinner state - spinner appears only after delay without pausing video
  const [showBufferingSpinner, setShowBufferingSpinner] = useState(false);
  const spinnerTimeoutRef = useRef<NodeJS.Timeout>();
  const stalledTimeoutRef = useRef<NodeJS.Timeout>(); // Debounce for stalled event
  const canplayGuardRef = useRef<boolean>(false); // Guard after canplay to ignore immediate waiting
  const pendingTokenRefreshRef = useRef<string | null>(null); // Deferred token refresh URL
  
  // NEW: Hide video until loadeddata fires to prevent showing wrong frame
  const [videoReady, setVideoReady] = useState(false);
  
  // Use adaptive buffer config based on device and network
  const bufferConfigRef = useRef<BufferConfig>(getAdaptiveBufferConfig());
  
  // Smart buffering states
  const [bufferProgress, setBufferProgress] = useState(0);
  const [isSmartBuffering, setIsSmartBuffering] = useState(false);
  const [isInitialBuffering, setIsInitialBuffering] = useState(true);
  
  // NEW: Buffer visualization and network quality
  const [bufferedRanges, setBufferedRanges] = useState<{ start: number; end: number }[]>([]);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'slow' | 'offline'>('good');
  
  // NEW: Connection details for admin diagnostics
  const [connectionDetails, setConnectionDetails] = useState<{
    type?: string;
    downlink?: number;
    rtt?: number;
  }>({});
  const [bufferedAhead, setBufferedAhead] = useState(0);
  
  // Guard to prevent double state reset on same mediaUrl
  const lastMediaUrlRef = useRef<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastValidTimeRef = useRef<number>(initialTime);
  const isSeekingRef = useRef<boolean>(false);
  const isBufferingRef = useRef<boolean>(false);
  const initialPositionSetRef = useRef<boolean>(false);
  const wasPlayingBeforeBufferRef = useRef<boolean>(false);
  const stuckCheckRef = useRef<NodeJS.Timeout>();
  const lastProgressTimeRef = useRef<number>(0);
  const bufferingTimeoutRef = useRef<NodeJS.Timeout>(); // NEW: Timeout for smart buffering delay
  const lastActivityEmitRef = useRef<number>(0); // Throttle video-activity events for inactivity timeout
  const playStartTimeRef = useRef<number | null>(null); // NEW: Track when playback started (for force-hide buffering)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1); // Playback speed for secure mode
  
  // State dla odświeżania signed URL przed wygaśnięciem
  const [urlExpiryTime, setUrlExpiryTime] = useState<number | null>(null);
  const urlRefreshTimerRef = useRef<NodeJS.Timeout>();
  const isSupabaseUrlRef = useRef<boolean>(false);
  const mediaTokenRef = useRef<string | null>(null); // Current active media token
  const tokenRefreshTimerRef = useRef<NodeJS.Timeout>(); // Timer for refreshing token before expiry
  
  // State to track when video element is mounted (for callback ref pattern)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const isInitialBufferingRef = useRef(true);
  const isSmartBufferingRef = useRef(false);
  
  // Callback ref to ensure event listeners are attached when element mounts
  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoElement(node);
  }, []);
  
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

  // Rewind 10 seconds (for restricted mode - backward seeking allowed)
  const handleRewind = useCallback(() => {
    if (!videoElement) return;
    
    const newTime = Math.max(0, videoElement.currentTime - 10);
    console.log('[SecureMedia] Rewinding 10s:', {
      from: videoElement.currentTime,
      to: newTime
    });
    
    // Set seeking flag to prevent handleSeeking from interfering
    isSeekingRef.current = true;
    videoElement.currentTime = newTime;
    setCurrentTime(newTime);
    
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 300);
  }, [videoElement]);

  // Seek to specific time (for completed lessons - jumping to note timestamps)
  const seekToTime = useCallback((time: number) => {
    if (!videoElement || disableInteraction) return; // Only allow when lesson is completed
    const safeTime = Math.max(0, Math.min(time, duration));
    console.log('[SecureMedia] Seeking to note timestamp:', { time: safeTime });
    isSeekingRef.current = true;
    videoElement.currentTime = safeTime;
    lastValidTimeRef.current = safeTime;
    setCurrentTime(safeTime);
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 300);
  }, [videoElement, duration, disableInteraction]);

  // Expose seekToTime via ref for external components
  useEffect(() => {
    if (seekToTimeRef) {
      seekToTimeRef.current = !disableInteraction ? seekToTime : null;
    }
  }, [seekToTimeRef, seekToTime, disableInteraction]);

  // Seek handler for secure mode (full seek capability)
  const handleSeek = useCallback((time: number) => {
    if (!videoElement) return;
    const safeTime = Math.max(0, Math.min(time, duration));
    console.log('[SecureMedia] Secure mode seek:', { time: safeTime });
    videoElement.currentTime = safeTime;
    setCurrentTime(safeTime);
  }, [videoElement, duration]);

  // Speed change handler for secure mode
  const handleSpeedChange = useCallback((rate: number) => {
    if (!videoElement) return;
    console.log('[SecureMedia] Speed change:', { rate });
    videoElement.playbackRate = rate;
    setPlaybackRate(rate);
  }, [videoElement]);

  // Fullscreen handler - secured against DOM errors
  const handleFullscreen = useCallback(async () => {
    try {
      // Check if container exists and is mounted
      if (!containerRef.current || !document.body.contains(containerRef.current)) {
        console.warn('[SecureMedia] Container not available for fullscreen');
        return;
      }
      
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch((err) => {
          console.warn('[SecureMedia] exitFullscreen error:', err);
        });
      } else {
        // Check if fullscreen is supported
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen().catch((err) => {
            console.warn('[SecureMedia] requestFullscreen error:', err);
          });
        } else {
          console.warn('[SecureMedia] Fullscreen not supported');
        }
      }
    } catch (error) {
      console.error('[SecureMedia] Fullscreen error:', error);
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

    // Protected URL — use token proxy (purelife.info.pl videos)
    if (shouldProtectUrl(mediaUrl)) {
      const fetchTokenUrl = async () => {
        try {
          console.log('[SecureMedia] Generating token for protected URL');
          const token = await generateMediaToken(mediaUrl);
          if (!mounted) return;
          mediaTokenRef.current = token;
          const realUrl = await resolveStreamUrl(token);
          if (!mounted) return;
          setSignedUrl(realUrl);
          setLoading(false);
          
          // CHANGE 5: Schedule token refresh - defer URL swap if video is playing
          if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
          tokenRefreshTimerRef.current = setTimeout(async () => {
            if (!mounted) return;
            try {
              console.log('[SecureMedia] Refreshing media token before expiry');
              const newToken = await generateMediaToken(mediaUrl);
              if (!mounted) return;
              mediaTokenRef.current = newToken;
              const newRealUrl = await resolveStreamUrl(newToken);
              if (!mounted) return;
              
              const video = videoRef.current;
              // CHANGE 5: If video is paused or not available, swap URL immediately
              if (!video || video.paused) {
                const currentVideoTime = video?.currentTime || 0;
                lastValidTimeRef.current = currentVideoTime;
                initialPositionSetRef.current = false;
                setSignedUrl(newRealUrl);
              } else {
                // CHANGE 5: Video is playing - store new URL and apply on next pause
                console.log('[SecureMedia] Video is playing - deferring URL swap to next pause');
                pendingTokenRefreshRef.current = newRealUrl;
              }
            } catch (err) {
              console.error('[SecureMedia] Token refresh failed:', err);
            }
          }, 3.5 * 60 * 1000);
        } catch (err) {
          console.error('[SecureMedia] Failed to generate media token:', err);
          // Fallback to direct URL if token generation fails
          if (mounted) {
            setSignedUrl(mediaUrl);
            setLoading(false);
          }
        }
      };
      fetchTokenUrl();
      return () => {
        mounted = false;
        if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
      };
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
        // Check if URL is already signed (from edge function - e.g., HK OTP access)
        if (mediaUrl.includes('/storage/v1/object/sign/')) {
          console.log('[SecureMedia] Using pre-signed URL from server');
          if (mounted) {
            setSignedUrl(mediaUrl);
            setLoading(false);
            // Set expiry time for refresh (assume 2 hours from now minus buffer)
            setUrlExpiryTime(Date.now() + 7000000);
            isSupabaseUrlRef.current = true;
          }
          return;
        }

        if (mediaUrl.includes('supabase.co')) {
          isSupabaseUrlRef.current = true;
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
              isSupabaseUrlRef.current = false;
              return;
            }
            setSignedUrl(data.signedUrl);
            // Ustaw czas wygaśnięcia (55 minut = 3300000ms, zostawić 5 min bufora)
            setUrlExpiryTime(Date.now() + 3300000);
            return;
          }
        }

        const urlParts = mediaUrl.split('/');
        const bucketName = urlParts[urlParts.length - 2];
        const fileName = urlParts[urlParts.length - 1];
        
        // Sprawdź czy to wygląda na URL z bucket Supabase
        const looksLikeSupabasePath = bucketName && fileName && !mediaUrl.startsWith('http');
        if (looksLikeSupabasePath) {
          isSupabaseUrlRef.current = true;
        }
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(fileName, 3600);

        if (!mounted) return;

        if (error) {
          console.warn('Error creating signed URL, using original:', error);
          setSignedUrl(mediaUrl);
          isSupabaseUrlRef.current = false;
          return;
        }

        setSignedUrl(data.signedUrl);
        // Ustaw czas wygaśnięcia dla URL z Supabase
        setUrlExpiryTime(Date.now() + 3300000);
      } catch (error) {
        console.error('Error processing media URL:', error);
        if (mounted) {
          setSignedUrl(mediaUrl);
          isSupabaseUrlRef.current = false;
        }
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

  // FULL RESET when mediaUrl changes - prevents state leakage between lessons
  // Uses 0 for lastValidTimeRef because initialTime may not be ready yet
  // Guard: Skip if same URL (prevent double reset from React strict mode or duplicate triggers)
  useEffect(() => {
    if (mediaUrl === lastMediaUrlRef.current) {
      console.log('[SecureMedia] Same mediaUrl, skipping reset');
      return;
    }
    lastMediaUrlRef.current = mediaUrl;
    
    console.log('[SecureMedia] mediaUrl changed, resetting all state');
    initialPositionSetRef.current = false;
    lastValidTimeRef.current = 0;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    isSeekingRef.current = false;
    isBufferingRef.current = false;
    setIsBuffering(false);
    setForceHideBuffering(false);
    playStartTimeRef.current = null;
    setRetryCount(0); // Reset retry count on new video
    setHasExhaustedRetries(false); // Reset flagi wyczerpanych prób
    // NEW: Reset buffering states
    setIsInitialBuffering(true);
    setBufferProgress(0);
    setIsSmartBuffering(false);
    wasPlayingBeforeBufferRef.current = false;
    setBufferedRanges([]);
    // NEW: Reset debounced spinner state and clear all pending timeouts
    setShowBufferingSpinner(false);
    // NEW: Reset videoReady so old frame is hidden until new video loads
    setVideoReady(false);
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
      spinnerTimeoutRef.current = undefined;
    }
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = undefined;
    }
    // Refresh buffer config on new video
    bufferConfigRef.current = getAdaptiveBufferConfig();
  }, [mediaUrl]);

  // Mechanizm odświeżania signed URL przed wygaśnięciem (dla wideo z Supabase Storage)
  useEffect(() => {
    // Tylko dla URL z Supabase, nie dla YouTube ani zewnętrznych
    if (!urlExpiryTime || !signedUrl || isYouTube || !isSupabaseUrlRef.current) {
      return;
    }
    
    const checkExpiry = () => {
      const timeToExpiry = urlExpiryTime - Date.now();
      
      // Mniej niż 5 minut do wygaśnięcia - odśwież URL
      if (timeToExpiry < 300000) {
        console.log('[SecureMedia] Refreshing signed URL before expiry, time left:', Math.round(timeToExpiry / 1000), 's');
        
        // Zapisz aktualną pozycję przed odświeżeniem
        const currentVideoTime = videoRef.current?.currentTime || 0;
        const wasPlaying = !videoRef.current?.paused;
        
        // Wyczyść URL aby wywołać ponowne pobranie
        setSignedUrl('');
        setLoading(true);
        setUrlExpiryTime(null);
        
        // Po ponownym załadowaniu przywróć pozycję
        // To zostanie obsłużone przez initialTime prop
        if (onTimeUpdateRef.current && currentVideoTime > 0) {
          lastValidTimeRef.current = currentVideoTime;
        }
        
        console.log('[SecureMedia] URL refresh triggered, saved position:', currentVideoTime);
      }
    };
    
    // Sprawdzaj co minutę
    urlRefreshTimerRef.current = setInterval(checkExpiry, 60000);
    
    return () => {
      if (urlRefreshTimerRef.current) {
        clearInterval(urlRefreshTimerRef.current);
      }
    };
  }, [urlExpiryTime, signedUrl, isYouTube]);

  // Monitor network quality changes and collect connection details for diagnostics
  useEffect(() => {
    const updateNetworkQuality = () => {
      if (!navigator.onLine) {
        setNetworkQuality('offline');
        setConnectionDetails({});
        return;
      }
      if (isSlowNetwork()) {
        setNetworkQuality('slow');
      } else {
        setNetworkQuality('good');
      }
      
      // Collect connection details for admin diagnostics
      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        if (conn) {
          setConnectionDetails({
            type: conn.effectiveType,
            downlink: conn.downlink,
            rtt: conn.rtt
          });
        }
      }
    };

    updateNetworkQuality();

    // Listen for online/offline events
    window.addEventListener('online', updateNetworkQuality);
    window.addEventListener('offline', updateNetworkQuality);

    // Listen for connection changes if API available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', updateNetworkQuality);
        return () => {
          window.removeEventListener('online', updateNetworkQuality);
          window.removeEventListener('offline', updateNetworkQuality);
          connection.removeEventListener('change', updateNetworkQuality);
        };
      }
    }

    return () => {
      window.removeEventListener('online', updateNetworkQuality);
      window.removeEventListener('offline', updateNetworkQuality);
    };
  }, []);

  // External pause request (e.g., when notes dialog opens)
  useEffect(() => {
    if (pauseRequested && videoRef.current && !videoRef.current.paused) {
      console.log('[SecureMedia] External pause requested (notes dialog)');
      videoRef.current.pause();
    }
  }, [pauseRequested]);

  // NOTE: Removed the useEffect that synced lastValidTimeRef with initialTime
  // This was causing issues because initialTime could change during playback
  // (when savedVideoPosition was updated), causing unexpected resets.
  // initialTime should only be used ONCE at component mount.

  // Set initial time when video metadata loads - SINGLE consolidated effect
  useEffect(() => {
    if (mediaType !== 'video' || !videoElement || !signedUrl) return;
    
    const video = videoElement;
    
    const setInitialPosition = () => {
      if (initialPositionSetRef.current) return; // Only set ONCE
      
      console.log('[SecureMedia] Setting initial position:', {
        initialTime,
        readyState: video.readyState,
        duration: video.duration
      });
      
      if (video.readyState >= 1) {
        if (initialTime > 0) {
          video.currentTime = initialTime;
          lastValidTimeRef.current = initialTime;
          setCurrentTime(initialTime);
        } else {
          lastValidTimeRef.current = 0;
        }
        initialPositionSetRef.current = true;
      }
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      onDurationChangeRef.current?.(video.duration);
      setInitialPosition();
    };
    
    // Try to set immediately if video already loaded
    if (video.readyState >= 1) {
      setDuration(video.duration);
      onDurationChangeRef.current?.(video.duration);
      setInitialPosition();
    }
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [mediaType, signedUrl, initialTime, videoElement]);

  // Seek blocking and time tracking for restricted mode
  useEffect(() => {
    if (mediaType !== 'video' || !disableInteraction || !videoElement) return;

    const video = videoElement;
    console.log('[SecureMedia] Attaching event listeners to video element');

    // Buffering handlers - prevent false seek detection during network delays
    // OPTIMIZED: Smarter buffering logic - only pause on slow networks, debounced spinner
    const handleWaiting = () => {
      // CHANGE 6: Ignore waiting if video has sufficient data (readyState >= 3 = HAVE_FUTURE_DATA)
      if (video.readyState >= 3) {
        console.log('[SecureMedia] Ignoring waiting event - readyState:', video.readyState, '(has future data)');
        return;
      }
      
      // CHANGE 6: Ignore waiting during canplay guard period
      if (canplayGuardRef.current) {
        console.log('[SecureMedia] Ignoring waiting event - within canplay guard period');
        return;
      }
      
      const bufferedAheadValue = getBufferedAhead(video);
      const networkQualityNow = getNetworkQuality();
      const isSlowNetworkNow = isSlowNetwork() || networkQualityNow === '3g';
      
      console.log('[SecureMedia] Video waiting for data:', {
        currentTime: video.currentTime.toFixed(2),
        bufferedAhead: bufferedAheadValue.toFixed(2),
        readyState: video.readyState,
        networkQuality: networkQualityNow,
        isSlowNetwork: isSlowNetworkNow,
        duration: video.duration?.toFixed(2) || 'unknown',
        paused: video.paused
      });
      
      // Clear any existing timeouts
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
      }
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
      }
      
      const smartBufferingDelay = bufferConfigRef.current.smartBufferingDelayMs || 3500;
      const spinnerDebounce = bufferConfigRef.current.spinnerDebounceMs || 1500;
      const minRequired = bufferConfigRef.current.minBufferSeconds * 0.5;
      
      // Debounced spinner - shows after delay without pausing video
      spinnerTimeoutRef.current = setTimeout(() => {
        if (!video.paused && video.readyState < 3) {
          console.log('[SecureMedia] Showing buffering spinner (debounced)');
          setShowBufferingSpinner(true);
        }
      }, spinnerDebounce);
      
      // Smart buffering - only for SLOW networks, pause video and wait for buffer
      bufferingTimeoutRef.current = setTimeout(() => {
        const currentBufferedAhead = getBufferedAhead(video);
        if (video.paused || video.readyState >= 3 || currentBufferedAhead >= minRequired) {
          console.log('[SecureMedia] Video recovered before smart buffering activation');
          return;
        }
        
        console.log('[SecureMedia] Buffering timeout reached');
        isBufferingRef.current = true;
        setIsBuffering(true);
        
        if (isSlowNetworkNow && !video.paused) {
          wasPlayingBeforeBufferRef.current = true;
          video.pause();
          setIsSmartBuffering(true);
          console.log('[SecureMedia] Smart buffering activated (slow network)');
        } else {
          console.log('[SecureMedia] Good network - not pausing, waiting for browser to catch up');
        }
      }, smartBufferingDelay);
    };

    // CHANGE 2: Debounced stalled handler - prevents false buffering from browser stalled events
    const handleStalled = () => {
      console.log('[SecureMedia] Video stalled event received');
      
      // Clear previous stalled timeout
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
      }
      
      const stalledDebounce = bufferConfigRef.current.stalledDebounceMs || 2000;
      
      stalledTimeoutRef.current = setTimeout(() => {
        // Only set buffering if video is still actually stalled
        if (video.readyState < 3 && !video.paused) {
          console.log('[SecureMedia] Stalled confirmed after debounce - setting buffering');
          isBufferingRef.current = true;
          setIsBuffering(true);
        } else {
          console.log('[SecureMedia] Stalled resolved during debounce period');
        }
      }, stalledDebounce);
    };

    // CHANGE 1: Fixed canplay handler - immediate resume, delayed UI cleanup
    const handleCanPlay = () => {
      console.log('[SecureMedia] Video can play');
      // CHANGE 4: Mark video as ready to display
      setVideoReady(true);
      
      // Clear ALL pending timeouts - video recovered
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = undefined;
      }
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = undefined;
      }
      // CHANGE 2: Clear stalled debounce timeout
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
        stalledTimeoutRef.current = undefined;
      }
      setShowBufferingSpinner(false);
      
      // CHANGE 6: Set canplay guard to prevent immediate waiting from re-triggering buffering
      canplayGuardRef.current = true;
      const guardMs = bufferConfigRef.current.canplayGuardMs || 500;
      setTimeout(() => {
        canplayGuardRef.current = false;
      }, guardMs);
      
      // CHANGE 1: IMMEDIATE resume if smart buffering was active (no 800ms delay)
      if (isSmartBufferingRef.current && wasPlayingBeforeBufferRef.current) {
        console.log('[SecureMedia] Smart buffering recovery - resuming IMMEDIATELY');
        setIsSmartBuffering(false);
        setIsBuffering(false);
        isBufferingRef.current = false;
        lastValidTimeRef.current = video.currentTime;
        if (!document.hidden) {
          video.play().catch(console.error);
        }
        wasPlayingBeforeBufferRef.current = false;
        return;
      }
      
      // CHANGE 1: Immediate resume for regular buffering too, delay only for UI flag cleanup
      if (isBufferingRef.current) {
        // Sync position immediately
        lastValidTimeRef.current = video.currentTime;
        
        // Resume playback immediately if was playing
        if (wasPlayingBeforeBufferRef.current && !document.hidden) {
          video.play().catch(console.error);
          wasPlayingBeforeBufferRef.current = false;
        }
        
        // Update buffer stats
        if (video.buffered.length > 0 && video.duration > 0) {
          const bufferedAheadValue = getBufferedAhead(video);
          const remainingDuration = video.duration - video.currentTime;
          const minBuffer = bufferConfigRef.current.minBufferSeconds;
          const targetBuffer = Math.min(minBuffer, remainingDuration);
          
          const progress = targetBuffer > 0 
            ? Math.max(0, Math.min(100, (bufferedAheadValue / targetBuffer) * 100)) 
            : 100;
          setBufferProgress(progress);
          setBufferedRanges(getBufferedRanges(video));
          
          if (isInitialBufferingRef.current) {
            console.log('[SecureMedia] Initial buffer complete via canPlay');
            setIsInitialBuffering(false);
          }
          
          if (bufferedAheadValue >= targetBuffer || bufferedAheadValue >= remainingDuration) {
            setIsSmartBuffering(false);
          }
        }
      }
      
      // Clear buffering flags immediately (no 800ms delay that caused the loop)
      isBufferingRef.current = false;
      setIsBuffering(false);
    };
    
    // NEW: Progress handler for buffer calculation
    const handleProgress = () => {
      if (video.buffered.length > 0 && video.duration > 0) {
        const currentPos = video.currentTime;
        const remainingDuration = video.duration - currentPos;
        const minBuffer = bufferConfigRef.current.minBufferSeconds;
        
        // Use utility that correctly finds range containing current position
        const bufferedAheadValue = getBufferedAhead(video);
        
        // Update bufferedAhead state for admin diagnostics
        setBufferedAhead(bufferedAheadValue);
        
        // Calculate buffer progress percentage (target: minBuffer or end of video)
        // Ensure value is always between 0-100
        const targetBuffer = Math.min(minBuffer, remainingDuration);
        const progress = targetBuffer > 0 
          ? Math.max(0, Math.min(100, (bufferedAheadValue / targetBuffer) * 100)) 
          : 100;
        
        setBufferProgress(progress);
        
        // Update buffered ranges for visualization
        setBufferedRanges(getBufferedRanges(video));
        
        // NEW: Check initial buffering - unlock Play button when buffer is ready
        if (isInitialBufferingRef.current && (bufferedAheadValue >= targetBuffer * 0.7 || progress >= 70)) {
          console.log('[SecureMedia] Initial buffer ready (' + bufferedAheadValue.toFixed(1) + 's), Play button enabled');
          setIsInitialBuffering(false);
        }
        
        // SMART RESUME: When buffer is sufficient, resume playback
        if (isSmartBufferingRef.current && bufferedAheadValue >= minBuffer) {
          console.log('[SecureMedia] Buffer sufficient (' + bufferedAheadValue.toFixed(1) + 's), resuming playback');
          setIsSmartBuffering(false);
          isBufferingRef.current = false;
          setIsBuffering(false);
          
          if (wasPlayingBeforeBufferRef.current && !document.hidden) {
            video.play().catch(console.error);
            wasPlayingBeforeBufferRef.current = false;
          }
        }
        
        // Sync lastValidTimeRef during normal buffering (not user seeking)
        if (Math.abs(currentPos - lastValidTimeRef.current) < bufferConfigRef.current.seekToleranceSeconds) {
          lastValidTimeRef.current = currentPos;
        }
      }
    };

    // CHANGE 3: Handle video errors - only use video.load() for actual errors
    const handleError = (e: Event) => {
      const errorType = getVideoErrorType(video);
      console.error('[SecureMedia] Video error:', errorType, e);
      
      const maxRetries = bufferConfigRef.current.maxRetries;
      
      if (retryCount < maxRetries) {
        const delay = getRetryDelay(retryCount, bufferConfigRef.current.retryDelayMs);
        console.log(`[SecureMedia] Retrying... attempt ${retryCount + 1}/${maxRetries} after ${delay}ms`);
        
        setTimeout(() => {
          if (video) {
            const currentPos = lastValidTimeRef.current;
            // Only use video.load() for actual network/source errors (destroys buffer)
            if (errorType === VIDEO_ERROR_TYPES.NETWORK || errorType === VIDEO_ERROR_TYPES.SRC_NOT_SUPPORTED) {
              video.load();
            }
            video.currentTime = currentPos;
            video.play().catch(console.error);
            setRetryCount(prev => prev + 1);
          }
        }, delay);
      } else {
        console.error('[SecureMedia] Max retries reached, error type:', errorType);
        setHasExhaustedRetries(true);
      }
    };

    // Block FORWARD seeking only - allow backward seeking to already-watched parts
    const handleSeeking = () => {
      // Don't block during buffering - it's not a user seek
      if (isSeekingRef.current || isBufferingRef.current) return;
      
      const seekTarget = video.currentTime;
      const maxWatchedPosition = lastValidTimeRef.current;
      
      // FORWARD SEEK - block if trying to skip ahead of max watched position
      if (seekTarget > maxWatchedPosition + 5) {
        console.log('[SecureMedia] Forward seek blocked:', {
          seekTarget,
          maxWatchedPosition,
          diff: seekTarget - maxWatchedPosition
        });
        isSeekingRef.current = true;
        video.currentTime = maxWatchedPosition;
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 500);
        return;
      }
      
      // BACKWARD SEEK - always allowed (user wants to rewatch)
      if (seekTarget < maxWatchedPosition) {
        console.log('[SecureMedia] Backward seek allowed:', {
          from: maxWatchedPosition,
          to: seekTarget
        });
        // Don't update lastValidTimeRef - user can still only progress to where they were
      }
    };

    // Update valid time only during normal playback
    const handleTimeUpdate = () => {
      if (isSeekingRef.current) return;
      
      const timeDiff = video.currentTime - lastValidTimeRef.current;
      
      // Accept larger jumps during/after buffering, or normal forward progress
      if (timeDiff > 0 && (timeDiff <= 3 || isBufferingRef.current)) {
        lastValidTimeRef.current = video.currentTime;
      }
      
      setCurrentTime(video.currentTime);
      onTimeUpdateRef.current?.(video.currentTime);
      
      // Throttled: emit video-activity event every ~10 seconds to prevent auto-logout
      const now = Date.now();
      if (now - lastActivityEmitRef.current >= 10000) {
        lastActivityEmitRef.current = now;
        window.dispatchEvent(new CustomEvent('video-activity', { 
          detail: { type: 'timeupdate' } 
        }));
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChangeRef.current?.(true);
      
      // NEW: Start timer to force-hide buffering spinner after 3s of playback
      playStartTimeRef.current = Date.now();
      setTimeout(() => {
        if (playStartTimeRef.current && Date.now() - playStartTimeRef.current >= 2900) {
          setForceHideBuffering(true);
        }
      }, 3000);
      
      // Emit video-activity event to prevent auto-logout during video playback
      window.dispatchEvent(new CustomEvent('video-activity', { 
        detail: { type: 'play' } 
      }));
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChangeRef.current?.(false);
      
      playStartTimeRef.current = null;
      setForceHideBuffering(false);
      
      // CRITICAL: Save current position on pause
      if (video) {
        const currentPos = video.currentTime;
        lastValidTimeRef.current = currentPos;
        onTimeUpdateRef.current?.(currentPos);
      }
      
      // CHANGE 5: Apply deferred token refresh URL on pause
      if (pendingTokenRefreshRef.current) {
        console.log('[SecureMedia] Applying deferred token refresh on pause');
        const newUrl = pendingTokenRefreshRef.current;
        pendingTokenRefreshRef.current = null;
        lastValidTimeRef.current = video.currentTime;
        initialPositionSetRef.current = false;
        setSignedUrl(newUrl);
      }
    };
    
    // CHANGE 4: loadeddata handler to ensure videoReady is set even if canplay is delayed
    const handleLoadedData = () => {
      console.log('[SecureMedia] Video loadeddata fired');
      setVideoReady(true);
    };

    // Block playback rate changes
    const handleRateChange = () => {
      if (video.playbackRate !== 1) {
        video.playbackRate = 1;
      }
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlay);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('error', handleError);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('loadeddata', handleLoadedData); // CHANGE 4
    
    return () => {
      console.log('[SecureMedia] Removing event listeners from video element');
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlay);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('loadeddata', handleLoadedData);
      
      // CRITICAL: Clear pending timeouts to prevent memory leaks
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = undefined;
      }
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = undefined;
      }
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
        stalledTimeoutRef.current = undefined;
      }
    };
  }, [mediaType, disableInteraction, signedUrl, videoElement, retryCount]);

  // Sync refs with state for stable listener access
  useEffect(() => { isInitialBufferingRef.current = isInitialBuffering; }, [isInitialBuffering]);
  useEffect(() => { isSmartBufferingRef.current = isSmartBuffering; }, [isSmartBuffering]);

  // Time tracking for unrestricted mode and secure mode - WITH BUFFERING SUPPORT
  useEffect(() => {
    if (mediaType !== 'video' || !videoElement) return;
    // Skip if restricted mode (has its own handlers) and not secure mode
    if (disableInteraction && controlMode !== 'secure') return;

    let mounted = true; // Prevent state updates after unmount
    const video = videoElement;

    // Buffering handlers for unrestricted/secure modes - with same fixes as restricted
    const handleWaiting = () => {
      if (!mounted) return;
      // CHANGE 6: Ignore waiting if sufficient data or within canplay guard
      if (video.readyState >= 3 || canplayGuardRef.current) {
        console.log('[SecureMedia] Unrestricted mode - ignoring waiting (readyState:', video.readyState, ')');
        return;
      }
      console.log('[SecureMedia] Unrestricted mode - video waiting');
      setIsBuffering(true);
      
      if (spinnerTimeoutRef.current) clearTimeout(spinnerTimeoutRef.current);
      spinnerTimeoutRef.current = setTimeout(() => {
        if (!video.paused && video.readyState < 3) {
          setShowBufferingSpinner(true);
        }
      }, 1500);
    };

    // CHANGE 2: Debounced stalled for unrestricted mode
    const handleStalled = () => {
      if (!mounted) return;
      console.log('[SecureMedia] Unrestricted mode - video stalled');
      if (stalledTimeoutRef.current) clearTimeout(stalledTimeoutRef.current);
      stalledTimeoutRef.current = setTimeout(() => {
        if (video.readyState < 3 && !video.paused) {
          setIsBuffering(true);
        }
      }, 2000);
    };

    const handleCanPlay = () => {
      if (!mounted) return;
      console.log('[SecureMedia] Unrestricted mode - can play');
      setIsBuffering(false);
      setShowBufferingSpinner(false);
      setVideoReady(true);
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = undefined;
      }
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
        stalledTimeoutRef.current = undefined;
      }
      // CHANGE 6: canplay guard
      canplayGuardRef.current = true;
      setTimeout(() => { canplayGuardRef.current = false; }, 500);
    };

    // CHANGE 3: Same fix - only use video.load() for network/source errors
    const handleError = (e: Event) => {
      if (!mounted) return;
      const errorType = getVideoErrorType(video);
      console.error('[SecureMedia] Unrestricted mode error:', errorType, e);
      
      const maxRetries = bufferConfigRef.current.maxRetries;
      if (retryCount < maxRetries) {
        const delay = getRetryDelay(retryCount, bufferConfigRef.current.retryDelayMs);
        console.log(`[SecureMedia] Unrestricted retry ${retryCount + 1}/${maxRetries} after ${delay}ms`);
        
        setTimeout(() => {
          if (video && mounted) {
            const currentPos = video.currentTime;
            if (errorType === VIDEO_ERROR_TYPES.NETWORK || errorType === VIDEO_ERROR_TYPES.SRC_NOT_SUPPORTED) {
              video.load();
            }
            video.currentTime = currentPos;
            video.play().catch(console.error);
            setRetryCount(prev => prev + 1);
          }
        }, delay);
      } else {
        setHasExhaustedRetries(true);
      }
    };

    const handleTimeUpdate = () => {
      if (!mounted) return;
      setCurrentTime(video.currentTime);
      onTimeUpdateRef.current?.(video.currentTime);
      
      // Throttled: emit video-activity event every ~10 seconds to prevent auto-logout
      const now = Date.now();
      if (now - lastActivityEmitRef.current >= 10000) {
        lastActivityEmitRef.current = now;
        window.dispatchEvent(new CustomEvent('video-activity', { 
          detail: { type: 'timeupdate' } 
        }));
      }
    };

    const handlePlay = () => {
      if (!mounted) return;
      setIsPlaying(true);
      onPlayStateChangeRef.current?.(true);
      
      // Emit video-activity event to prevent auto-logout during video playback
      window.dispatchEvent(new CustomEvent('video-activity', { 
        detail: { type: 'play' } 
      }));
    };

    const handlePause = () => {
      if (!mounted) return;
      setIsPlaying(false);
      onPlayStateChangeRef.current?.(false);
      
      if (video) {
        onTimeUpdateRef.current?.(video.currentTime);
      }
      
      // CHANGE 5: Apply deferred token refresh on pause
      if (pendingTokenRefreshRef.current) {
        console.log('[SecureMedia] Unrestricted: Applying deferred token refresh on pause');
        const newUrl = pendingTokenRefreshRef.current;
        pendingTokenRefreshRef.current = null;
        lastValidTimeRef.current = video.currentTime;
        initialPositionSetRef.current = false;
        setSignedUrl(newUrl);
      }
    };

    // CHANGE 4: loadeddata handler for unrestricted mode
    const handleLoadedData = () => {
      if (!mounted) return;
      console.log('[SecureMedia] Unrestricted: loadeddata fired');
      setVideoReady(true);
    };

    const handleLoadedMetadata = () => {
      if (!mounted) return;
      setDuration(video.duration);
    };

    // NEW: Track buffering progress for unrestricted mode (same as restricted mode)
    const handleProgress = () => {
      if (!mounted || !video.buffered || video.buffered.length === 0) return;
      
      const bufferedAheadValue = getBufferedAhead(video);
      setBufferedAhead(bufferedAheadValue);
      
      // Update buffered ranges for visualization
      setBufferedRanges(getBufferedRanges(video));
      
      // Calculate buffer progress percentage
      if (video.duration > 0) {
        let totalBuffered = 0;
        for (let i = 0; i < video.buffered.length; i++) {
          totalBuffered += video.buffered.end(i) - video.buffered.start(i);
        }
        const progress = (totalBuffered / video.duration) * 100;
        setBufferProgress(Math.min(progress, 100));
      }
    };

    // Add buffering listeners for unrestricted mode
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadeddata', handleLoadedData); // CHANGE 4
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      mounted = false;
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Clear pending timeouts
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = undefined;
      }
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
        stalledTimeoutRef.current = undefined;
      }
    };
  }, [mediaType, disableInteraction, signedUrl, videoElement, retryCount, controlMode]);

  // Visibility API - pause video when tab is hidden (for ALL video types)
  useEffect(() => {
    if (mediaType !== 'video') return;

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

    const handleWindowBlur = () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsTabHidden(true);
      }
    };

    const handlePageHide = () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsTabHidden(true);
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setIsTabHidden(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow as EventListener);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow as EventListener);
    };
  }, [mediaType]);

  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, []);

  // CHANGE 3: Manual retry - try without video.load() first, preserve buffer
  const handleRetry = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    console.log('[SecureMedia] Manual retry triggered');
    const currentPos = lastValidTimeRef.current;
    
    // Reset states
    setIsBuffering(false);
    setIsSmartBuffering(false);
    isBufferingRef.current = false;
    wasPlayingBeforeBufferRef.current = false;
    setBufferProgress(0);
    setShowBufferingSpinner(false);
    canplayGuardRef.current = false;
    
    // CHANGE 3: Try to resume without destroying buffer first
    // Only use video.load() if simple resume doesn't work
    video.currentTime = currentPos;
    video.play().catch((err) => {
      console.warn('[SecureMedia] Resume failed, falling back to full reload:', err);
      video.load();
      video.currentTime = currentPos;
      video.play().catch(console.error);
    });
  }, []);

  // NEW: Auto-recovery for stuck playback detection
  useEffect(() => {
    if (mediaType !== 'video' || !disableInteraction || !videoElement) return;
    
    const checkStuck = () => {
      const video = videoElement;
      
      // Don't check if video is paused, buffering, tab hidden, or smart buffering active
      if (video.paused || isBufferingRef.current || isSmartBuffering || isTabHidden) {
        lastProgressTimeRef.current = video.currentTime;
        return;
      }
      
      // If video is playing but time hasn't changed for 10 seconds AND video has sufficient data
      if (video.currentTime === lastProgressTimeRef.current && 
          video.currentTime > 0 && 
          video.readyState >= 2) { // HAVE_CURRENT_DATA or better
        console.warn('[SecureMedia] Playback appears stuck, attempting auto-recovery');
        handleRetry();
      }
      lastProgressTimeRef.current = video.currentTime;
    };
    
    // Increased interval from 5s to 10s for better tolerance
    stuckCheckRef.current = setInterval(checkStuck, 10000);
    
    return () => {
      if (stuckCheckRef.current) {
        clearInterval(stuckCheckRef.current);
      }
    };
  }, [mediaType, disableInteraction, videoElement, isSmartBuffering, handleRetry]);

  // ENHANCED: Native event listeners for context menu blocking in secure mode
  useEffect(() => {
    if (controlMode !== 'secure' || !videoElement) return;
    
    const blockContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };
    
    // Block on video element with capture phase for maximum priority
    videoElement.addEventListener('contextmenu', blockContextMenu, true);
    
    // Also block on container
    const container = containerRef.current;
    if (container) {
      container.addEventListener('contextmenu', blockContextMenu, true);
    }
    
    return () => {
      videoElement.removeEventListener('contextmenu', blockContextMenu, true);
      if (container) {
        container.removeEventListener('contextmenu', blockContextMenu, true);
      }
    };
  }, [controlMode, videoElement]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // handleSelectStart usunięty - userSelect: 'none' w CSS załatwia sprawę bez ostrzeżeń React

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
    // onSelectStart usunięty - powodował ostrzeżenia React, CSS userSelect wystarczy
    style: { 
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      WebkitTouchCallout: 'none'  // Dodatkowe zabezpieczenie dla iOS
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

    // Handle secure mode (full controls without download - for news/articles)
    if (controlMode === 'secure') {
      // Error fallback
      if (hasExhaustedRetries) {
        return (
          <div className="bg-destructive/10 border border-destructive rounded-lg w-full p-6 flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-destructive">Nie można załadować wideo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sprawdź połączenie internetowe i spróbuj ponownie
              </p>
            </div>
            <button 
              onClick={() => {
                setRetryCount(0);
                setHasExhaustedRetries(false);
                setLoading(true);
                setSignedUrl('');
              }}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Spróbuj ponownie
            </button>
          </div>
        );
      }
      
      return (
        <div 
          ref={containerRef}
          className={`space-y-3 ${isFullscreen ? 'bg-black flex flex-col justify-center h-screen p-4' : ''}`}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="relative" onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <video
              ref={videoRefCallback}
              {...securityProps}
              src={signedUrl}
              controls={false}
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              className={`w-full h-auto rounded-lg ${isFullscreen ? 'max-h-[85vh] object-contain' : ''} ${className || ''}`}
              style={{ opacity: videoReady ? 1 : 0, transition: 'opacity 0.15s ease-in' }}
              preload={signedUrl.includes('purelife.info.pl') ? 'auto' : 'metadata'}
              playsInline
              // @ts-ignore - webkit-playsinline for older iOS
              webkit-playsinline="true"
              // @ts-ignore - x5-playsinline for WeChat browser
              x5-playsinline="true"
              {...(signedUrl.includes('supabase.co') && { crossOrigin: "anonymous" })}
            >
              Twoja przeglądarka nie obsługuje odtwarzania wideo.
            </video>
            {(!videoReady || (isBuffering && !forceHideBuffering)) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                <span className="text-white text-sm mt-2">Ładowanie...</span>
              </div>
            )}
          </div>
          <SecureVideoControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onSpeedChange={handleSpeedChange}
            onFullscreen={handleFullscreen}
            isFullscreen={isFullscreen}
            onRetry={handleRetry}
            isBuffering={isBuffering}
            playbackRate={playbackRate}
          />
        </div>
      );
    }

    // Handle regular video files with restricted mode
    if (disableInteraction) {
      // Pokaż komunikat fallback gdy wyczerpane są wszystkie próby
      if (hasExhaustedRetries) {
        return (
          <div className="bg-destructive/10 border border-destructive rounded-lg w-full p-6 flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-destructive">Nie można załadować wideo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sprawdź połączenie internetowe i spróbuj ponownie
              </p>
              {networkQuality === 'offline' && (
                <p className="text-xs text-destructive mt-2">
                  Brak połączenia z internetem
                </p>
              )}
            </div>
            <button 
              onClick={() => {
                setRetryCount(0);
                setHasExhaustedRetries(false);
                setLoading(true);
                setSignedUrl('');
              }}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Spróbuj ponownie
            </button>
          </div>
        );
      }
      
      return (
        <div 
          ref={containerRef}
          className={`space-y-3 ${isFullscreen ? 'bg-black flex flex-col justify-center h-screen p-4' : ''}`}
        >
          <div className="relative">
            <video
              ref={videoRefCallback}
              {...securityProps}
              src={signedUrl}
              controls={false}
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              className={`w-full h-auto rounded-lg ${isFullscreen ? 'max-h-[85vh] object-contain' : ''} ${className || ''}`}
              style={{ opacity: videoReady ? 1 : 0, transition: 'opacity 0.15s ease-in' }}
              preload={signedUrl.includes('purelife.info.pl') ? 'auto' : bufferConfigRef.current.preloadStrategy}
              playsInline
              // @ts-ignore - webkit-playsinline for older iOS
              webkit-playsinline="true"
              // @ts-ignore - x5-playsinline for WeChat browser
              x5-playsinline="true"
              // Only use crossOrigin for Supabase storage URLs (which support CORS)
              {...(signedUrl.includes('supabase.co') && { crossOrigin: "anonymous" })}
            >
              Twoja przeglądarka nie obsługuje odtwarzania wideo.
            </video>
            {/* OPTIMIZED: Use debounced spinner state instead of isBuffering */}
            {(!videoReady || (showBufferingSpinner && !isSmartBuffering && !forceHideBuffering)) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                <span className="text-white text-sm mt-2">Ładowanie...</span>
              </div>
            )}
          </div>
          <VideoControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={handlePlayPause}
            onRewind={handleRewind}
            isTabHidden={isTabHidden}
            onFullscreen={handleFullscreen}
            isFullscreen={isFullscreen}
            isBuffering={isInitialBuffering || isSmartBuffering}
            bufferProgress={bufferProgress}
            onRetry={handleRetry}
            bufferedRanges={bufferedRanges}
            networkQuality={networkQuality}
            // Admin diagnostics props
            showDiagnostics={isAdmin}
            videoSrc={mediaTokenRef.current ? `[protected] token:${mediaTokenRef.current.slice(0,8)}...` : undefined}
            retryCount={retryCount}
            smartBufferingActive={isSmartBuffering}
            bufferedAheadSeconds={bufferedAhead}
            connectionType={connectionDetails.type}
            downlink={connectionDetails.downlink}
            rtt={connectionDetails.rtt}
          />
        </div>
      );
    }

    // Handle regular video files with full controls (lesson completed)
    // Pokaż komunikat fallback gdy wyczerpane są wszystkie próby
    if (hasExhaustedRetries) {
      return (
        <div className="bg-destructive/10 border border-destructive rounded-lg w-full p-6 flex flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-destructive">Nie można załadować wideo</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sprawdź połączenie internetowe i spróbuj ponownie
            </p>
          </div>
          <button 
            onClick={() => {
              setRetryCount(0);
              setHasExhaustedRetries(false);
              setLoading(true);
              setSignedUrl('');
            }}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Spróbuj ponownie
          </button>
        </div>
      );
    }
    
    // Regular video with native controls for completed lessons
    return (
      <div className={`relative w-full aspect-video bg-black rounded-lg ${className || ''}`}>
        <video
          ref={videoRefCallback}
          {...securityProps}
          src={signedUrl}
          controls
          controlsList="nodownload"
          className="absolute inset-0 w-full h-full object-contain rounded-lg"
          style={{ opacity: videoReady ? 1 : 0, transition: 'opacity 0.15s ease-in' }}
          preload={signedUrl.includes('purelife.info.pl') ? 'auto' : 'metadata'}
          playsInline
          // @ts-ignore - webkit-playsinline for older iOS
          webkit-playsinline="true"
          // Only use crossOrigin for Supabase storage URLs (which support CORS)
          {...(signedUrl.includes('supabase.co') && { crossOrigin: "anonymous" })}
        >
          Twoja przeglądarka nie obsługuje odtwarzania wideo.
        </video>
        {/* Buffering spinner overlay for native controls */}
        {(!videoReady || showBufferingSpinner) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-lg pointer-events-none">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            <span className="text-white text-sm mt-2">Ładowanie...</span>
          </div>
        )}
      </div>
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
          onError={(e) => {
            console.error('[SecureMedia] Audio error:', e);
            // Show user-friendly error toast (if toast is available via import)
            const event = new CustomEvent('audio-error', { 
              detail: { message: 'Nie można załadować pliku audio. Spróbuj odświeżyć stronę.' }
            });
            window.dispatchEvent(event);
          }}
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
