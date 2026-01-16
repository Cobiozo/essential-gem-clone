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
  smartBufferingDelayMs: number; // NEW: Delay before activating smart buffering
}

export const VIDEO_BUFFER_CONFIG = {
  // Desktop settings - faster networks, smaller buffers for quick start
  desktop: {
    minBufferSeconds: 2,           // Zmniejszone z 5 na 2 dla natychmiastowego startu
    targetBufferSeconds: 15,       // Zmniejszone z 30 na 15 dla płynności
    preloadStrategy: 'auto' as const, // Full preload for better UX
    retryDelayMs: 2000,            // Initial retry delay
    maxRetries: 5,                 // Maximum retry attempts
  },
  
  // Mobile settings - more conservative for variable networks
  mobile: {
    minBufferSeconds: 2,           // Zmniejszone z 5 na 2 dla szybszego startu
    targetBufferSeconds: 10,       // Zmniejszone z 15 na 10 dla oszczędności danych
    preloadStrategy: 'metadata' as const, // Light preload to save bandwidth
    retryDelayMs: 3000,            // Longer delay on mobile (worse networks)
    maxRetries: 5,                 // More retries on mobile
  },
  
  // Common settings (device-independent)
  common: {
    stuckDetectionIntervalMs: 10000,  // Check every 10s for stuck playback
    bufferingStateDelayMs: 1000,      // Zwiększone z 500 na 1000ms - opóźnienie pokazania spinnera
    seekToleranceSeconds: 5,          // Max allowed time jump before blocking
    smartBufferingDelayMs: 1500,      // NEW: Tolerancja dla mikro-zacinań przed aktywacją smart buffering
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
 * Check if network is slow (2g, slow-2g, low downlink, high RTT)
 */
export const isSlowNetwork = (): boolean => {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink; // Mbps
      const rtt = connection.rtt; // ms
      
      // Slow if 2g/slow-2g OR downlink < 1.5 Mbps OR RTT > 400ms
      if (effectiveType === '2g' || effectiveType === 'slow-2g') return true;
      if (downlink && downlink < 1.5) return true;
      if (rtt && rtt > 400) return true;
    }
  }
  return false;
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
