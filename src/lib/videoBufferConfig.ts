/**
 * Video Buffering Configuration
 * Centralized settings for video playback across desktop and mobile devices
 */

export interface BufferConfig {
  minBufferSeconds: number;
  targetBufferSeconds: number;
  preloadStrategy: 'auto' | 'metadata' | 'none';
  retryDelayMs: number;
  maxRetries: number;
  stuckDetectionIntervalMs: number;
  bufferingStateDelayMs: number;
  seekToleranceSeconds: number;
}

export const VIDEO_BUFFER_CONFIG = {
  // Desktop settings - faster networks, larger buffers
  desktop: {
    minBufferSeconds: 5,           // Zmniejszone z 10 na 5 dla szybszego startu
    targetBufferSeconds: 30,       // Target buffer during playback
    preloadStrategy: 'auto' as const, // Full preload for better UX
    retryDelayMs: 2000,            // Initial retry delay
    maxRetries: 5,                 // Maximum retry attempts (increased from 3)
  },
  
  // Mobile settings - more conservative for variable networks
  mobile: {
    minBufferSeconds: 5,           // Smaller buffer for faster start
    targetBufferSeconds: 15,       // Smaller target buffer to save data
    preloadStrategy: 'metadata' as const, // Light preload to save bandwidth
    retryDelayMs: 3000,            // Longer delay on mobile (worse networks)
    maxRetries: 5,                 // More retries on mobile
  },
  
  // Common settings (device-independent)
  common: {
    stuckDetectionIntervalMs: 10000,  // Check every 10s for stuck playback (increased from 5s)
    bufferingStateDelayMs: 500,       // Delay before showing buffering state (increased from 300)
    seekToleranceSeconds: 5,          // Max allowed time jump before blocking
  }
} as const;

/**
 * Network quality types from Navigator.connection API
 */
export type NetworkQuality = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

/**
 * Get buffer configuration based on device type and network quality
 */
export const getBufferConfig = (): BufferConfig => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const deviceConfig = isMobile ? VIDEO_BUFFER_CONFIG.mobile : VIDEO_BUFFER_CONFIG.desktop;
  
  return {
    ...deviceConfig,
    ...VIDEO_BUFFER_CONFIG.common,
  };
};

/**
 * Get network quality using Navigator.connection API
 * Returns 'unknown' if API is not available
 */
export const getNetworkQuality = (): NetworkQuality => {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection && connection.effectiveType) {
      return connection.effectiveType as NetworkQuality;
    }
  }
  return 'unknown';
};

/**
 * Check if network is slow (2g or slow-2g)
 */
export const isSlowNetwork = (): boolean => {
  const quality = getNetworkQuality();
  return quality === '2g' || quality === 'slow-2g';
};

/**
 * Get adjusted buffer config based on network quality
 * Increases buffers on slow networks
 */
export const getAdaptiveBufferConfig = (): BufferConfig => {
  const baseConfig = getBufferConfig();
  const networkQuality = getNetworkQuality();
  
  // Increase buffers on slow networks
  if (networkQuality === 'slow-2g' || networkQuality === '2g') {
    return {
      ...baseConfig,
      minBufferSeconds: Math.min(baseConfig.minBufferSeconds * 1.5, 15),
      targetBufferSeconds: Math.min(baseConfig.targetBufferSeconds * 1.5, 45),
      retryDelayMs: baseConfig.retryDelayMs * 1.5,
    };
  }
  
  if (networkQuality === '3g') {
    return {
      ...baseConfig,
      minBufferSeconds: Math.min(baseConfig.minBufferSeconds * 1.2, 12),
      targetBufferSeconds: Math.min(baseConfig.targetBufferSeconds * 1.2, 36),
    };
  }
  
  return baseConfig;
};

/**
 * Calculate progressive retry delay with exponential backoff
 * @param attempt Current retry attempt (0-indexed)
 * @param baseDelay Base delay in milliseconds
 * @param maxDelay Maximum delay cap
 */
export const getRetryDelay = (
  attempt: number, 
  baseDelay: number = 2000, 
  maxDelay: number = 10000
): number => {
  return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
};

/**
 * Get buffered ranges from video element as array
 */
export const getBufferedRanges = (video: HTMLVideoElement): { start: number; end: number }[] => {
  const ranges: { start: number; end: number }[] = [];
  
  if (video.buffered && video.buffered.length > 0) {
    for (let i = 0; i < video.buffered.length; i++) {
      ranges.push({
        start: video.buffered.start(i),
        end: video.buffered.end(i),
      });
    }
  }
  
  return ranges;
};

/**
 * Calculate buffer ahead of current position
 */
export const getBufferedAhead = (video: HTMLVideoElement): number => {
  if (!video.buffered || video.buffered.length === 0) return 0;
  
  const currentTime = video.currentTime;
  
  // Find the buffered range that contains current position
  for (let i = 0; i < video.buffered.length; i++) {
    const start = video.buffered.start(i);
    const end = video.buffered.end(i);
    
    if (currentTime >= start && currentTime <= end) {
      return end - currentTime;
    }
  }
  
  return 0;
};

/**
 * Video error types for better error handling
 */
export const VIDEO_ERROR_TYPES = {
  NETWORK: 'network',
  DECODE: 'decode',
  SRC_NOT_SUPPORTED: 'src_not_supported',
  UNKNOWN: 'unknown',
} as const;

/**
 * Get error type from video error code
 */
export const getVideoErrorType = (video: HTMLVideoElement): typeof VIDEO_ERROR_TYPES[keyof typeof VIDEO_ERROR_TYPES] => {
  if (!video.error) return VIDEO_ERROR_TYPES.UNKNOWN;
  
  switch (video.error.code) {
    case MediaError.MEDIA_ERR_NETWORK:
      return VIDEO_ERROR_TYPES.NETWORK;
    case MediaError.MEDIA_ERR_DECODE:
      return VIDEO_ERROR_TYPES.DECODE;
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return VIDEO_ERROR_TYPES.SRC_NOT_SUPPORTED;
    default:
      return VIDEO_ERROR_TYPES.UNKNOWN;
  }
};
