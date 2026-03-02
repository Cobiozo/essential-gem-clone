/**
 * VideoBackgroundProcessor - ML-powered background segmentation pipeline
 * Uses MediaPipe ImageSegmenter for real-time person/background separation.
 * Pipeline: Camera -> InputCanvas (downscale) -> Segmentation -> Canvas (blur/image) -> MediaStream
 * 
 * v3: Quality-first image mode with adaptive temporal smoothing,
 * edge-aware feathering (smoothstep), and two-stage alpha blending.
 * Blur modes are untouched for backward compatibility.
 */

import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

export type BackgroundMode = 'none' | 'blur-light' | 'blur-heavy' | 'image';

interface ProcessorOptions {
  mode: BackgroundMode;
  backgroundImage?: HTMLImageElement | null;
}

// --- Performance profiles ---
interface PerformanceProfile {
  maxProcessWidth: number;
  segmentationIntervalMs: number;
  outputFps: number;
  overloadThresholdMs: number;
}

const MOBILE_PROFILE: PerformanceProfile = {
  maxProcessWidth: 480,
  segmentationIntervalMs: 100,
  outputFps: 15,
  overloadThresholdMs: 120,
};

const DESKTOP_PROFILE: PerformanceProfile = {
  maxProcessWidth: 640,
  segmentationIntervalMs: 80,
  outputFps: 24,
  overloadThresholdMs: 250,
};

// Quality-first overrides for image mode (applied on top of base profile)
const IMAGE_MODE_OVERRIDES = {
  minProcessWidth: 960,        // high-res for image backgrounds (solo gets full benefit)
  segmentationIntervalMs: 16,  // ~60fps segmentation — real-time feel with GPU headroom
  mobileMinProcessWidth: 480,
  mobileSegmentationIntervalMs: 60,
};

// --- Blur profiles ---
interface BlurProfile {
  blurRadius: number;
  personThresholdHigh: number;
  personThresholdLow: number;
}

const BLUR_PROFILES: Record<string, BlurProfile> = {
  'blur-light': {
    blurRadius: 6,
    personThresholdHigh: 0.65,
    personThresholdLow: 0.35,
  },
  'blur-heavy': {
    blurRadius: 20,
    personThresholdHigh: 0.60,
    personThresholdLow: 0.30,
  },
  'image': {
    blurRadius: 0,
    personThresholdHigh: 0.60,
    personThresholdLow: 0.40,
  },
};

// --- Mask refinement helpers ---

/** Sigmoid-like contrast curve: pushes values toward 0 or 1 */
function contrastMask(mask: Float32Array, strength: number = 5) {
  for (let i = 0; i < mask.length; i++) {
    const x = mask[i];
    mask[i] = 1 / (1 + Math.exp(-strength * (x - 0.5)));
  }
}

/** Hermite smoothstep: smooth transition in [edge0, edge1] */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 1024);
}

// Primary model: selfie_segmenter (full-res output — mask matches input resolution)
const PRIMARY_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';
// Fallback model: multiclass 256x256
const FALLBACK_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float16/latest/selfie_multiclass_256x256.tflite';

export class VideoBackgroundProcessor {
  private segmenter: ImageSegmenter | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private outputStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private videoElement: HTMLVideoElement;
  private isRunning = false;
  private mode: BackgroundMode = 'none';
  private backgroundImage: HTMLImageElement | null = null;
  private initPromise: Promise<void> | null = null;
  private lastTimestamp = 0;
  private frameErrorCount = 0;
  private isMulticlassModel = false;

  // Dedicated input canvas for segmentation
  private inputCanvas: HTMLCanvasElement;
  private inputCtx: CanvasRenderingContext2D;

  private blurredCanvas: HTMLCanvasElement | null = null;
  private blurredCtx: CanvasRenderingContext2D | null = null;
  private maskCanvas: HTMLCanvasElement | null = null;
  private maskCtx: CanvasRenderingContext2D | null = null;

  // Reusable ImageData to reduce GC pressure
  private cachedFrameData: ImageData | null = null;
  private cachedBlurredData: ImageData | null = null;
  private cachedBgData: ImageData | null = null;
  private cachedMaskImgData: ImageData | null = null;

  // Adaptive performance
  private profile: PerformanceProfile;
  private baseProfile: PerformanceProfile; // original profile before image-mode overrides
  private lastSegmentationTime = 0;
  private cachedMask: Float32Array | null = null;
  private previousMask: Float32Array | null = null;
  private overloadCounter = 0;
  private isPassThrough = false;
  private processWidth = 0;
  private processHeight = 0;

  // Motion detection for adaptive temporal smoothing
  private motionScore = 0;

  // Mask mismatch recovery
  private noMaskFrameCount = 0;
  private static readonly NO_MASK_WARN_THRESHOLD = 60;

  // Background tab handling (PiP fix)
  private isTabHidden = false;
  private backgroundIntervalId: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.inputCanvas = document.createElement('canvas');
    this.inputCtx = this.inputCanvas.getContext('2d')!;
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    // @ts-ignore webkit
    this.videoElement.setAttribute('webkit-playsinline', '');
    const base = detectMobile() ? MOBILE_PROFILE : DESKTOP_PROFILE;
    this.baseProfile = { ...base };
    this.profile = { ...base };
  }

  async initialize(): Promise<void> {
    if (this.segmenter) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
        );

        const createSegmenter = async (modelUrl: string, delegate: 'GPU' | 'CPU') => {
          return ImageSegmenter.createFromOptions(vision, {
            baseOptions: { modelAssetPath: modelUrl, delegate },
            runningMode: 'VIDEO' as const,
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });
        };

        // Try primary full-res selfie_segmenter with GPU
        try {
          this.segmenter = await createSegmenter(PRIMARY_MODEL_URL, 'GPU');
          this.isMulticlassModel = false;
          console.log('[BackgroundProcessor] ✅ Full-res selfie_segmenter loaded (GPU)');
        } catch (e1) {
          console.warn('[BackgroundProcessor] Full-res GPU failed, trying CPU:', e1);
          try {
            this.segmenter = await createSegmenter(PRIMARY_MODEL_URL, 'CPU');
            this.isMulticlassModel = false;
            console.log('[BackgroundProcessor] ✅ Full-res selfie_segmenter loaded (CPU)');
          } catch (e2) {
            console.warn('[BackgroundProcessor] Full-res model failed, falling back to multiclass 256x256:', e2);
            try {
              this.segmenter = await createSegmenter(FALLBACK_MODEL_URL, 'GPU');
              this.isMulticlassModel = true;
              console.log('[BackgroundProcessor] ⚠️ Multiclass 256x256 fallback loaded (GPU)');
            } catch (e3) {
              this.segmenter = await createSegmenter(FALLBACK_MODEL_URL, 'CPU');
              this.isMulticlassModel = true;
              console.log('[BackgroundProcessor] ⚠️ Multiclass 256x256 fallback loaded (CPU)');
            }
          }
        }
      } catch (err) {
        console.error('[BackgroundProcessor] Failed to initialize:', err);
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  setOptions(options: ProcessorOptions) {
    this.mode = options.mode;
    this.backgroundImage = options.backgroundImage || null;
    this.cachedBgData = null; // invalidate cached background when image changes
    this.applyImageModeOverrides();
  }

  /** Apply quality-first overrides when in image mode */
  private applyImageModeOverrides() {
    if (this.mode === 'image') {
      const isMobile = detectMobile();
      const minW = isMobile ? IMAGE_MODE_OVERRIDES.mobileMinProcessWidth : IMAGE_MODE_OVERRIDES.minProcessWidth;
      const segMs = isMobile ? IMAGE_MODE_OVERRIDES.mobileSegmentationIntervalMs : IMAGE_MODE_OVERRIDES.segmentationIntervalMs;
      
      this.profile.maxProcessWidth = Math.max(this.baseProfile.maxProcessWidth, minW);
      this.profile.segmentationIntervalMs = Math.min(this.baseProfile.segmentationIntervalMs, segMs);
      
      console.log(`[BackgroundProcessor] 🎯 Image mode quality overrides: processWidth≥${minW}, segInterval=${this.profile.segmentationIntervalMs}ms`);
    } else {
      // Restore base profile for blur modes
      this.profile.maxProcessWidth = this.baseProfile.maxProcessWidth;
      this.profile.segmentationIntervalMs = this.baseProfile.segmentationIntervalMs;
    }
  }

  async start(inputStream: MediaStream): Promise<MediaStream> {
    if (this.mode === 'none') {
      return inputStream;
    }

    await this.initialize();

    const videoTrack = inputStream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState === 'ended') {
      console.warn('[BackgroundProcessor] No live video track available, returning input stream');
      return inputStream;
    }
    const wasDisabled = !videoTrack.enabled;
    if (wasDisabled) {
      videoTrack.enabled = true;
    }

    this.videoElement.srcObject = new MediaStream([videoTrack]);

    if (this.videoElement.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('[BackgroundProcessor] onloadeddata timeout, forcing start');
          resolve();
        }, 3000);
        this.videoElement.onloadeddata = () => { clearTimeout(timeout); resolve(); };
        this.videoElement.onerror = () => { clearTimeout(timeout); reject(new Error('Video element error')); };
      });
    }
    try { await this.videoElement.play(); } catch {}

    const srcWidth = this.videoElement.videoWidth || videoTrack.getSettings().width || 640;
    const srcHeight = this.videoElement.videoHeight || videoTrack.getSettings().height || 480;

    // Apply image mode overrides before computing scale
    this.applyImageModeOverrides();

    const scale = Math.min(1, this.profile.maxProcessWidth / srcWidth);
    this.processWidth = Math.round(srcWidth * scale) & ~1;
    this.processHeight = Math.round(srcHeight * scale) & ~1;

    console.log(`[BackgroundProcessor] 📐 Source: ${srcWidth}x${srcHeight}, Process: ${this.processWidth}x${this.processHeight}, model=${this.isMulticlassModel ? 'multiclass-256' : 'selfie-fullres'}, mode=${this.mode}, segInterval=${this.profile.segmentationIntervalMs}ms`);

    this.canvas.width = this.processWidth;
    this.canvas.height = this.processHeight;
    this.inputCanvas.width = this.processWidth;
    this.inputCanvas.height = this.processHeight;

    this.blurredCanvas = document.createElement('canvas');
    this.blurredCanvas.width = this.processWidth;
    this.blurredCanvas.height = this.processHeight;
    this.blurredCtx = this.blurredCanvas.getContext('2d')!;

    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = this.processWidth;
    this.maskCanvas.height = this.processHeight;
    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true })!;

    // Reset state
    this.lastTimestamp = 0;
    this.frameErrorCount = 0;
    this.lastSegmentationTime = 0;
    this.cachedMask = null;
    this.previousMask = null;
    this.overloadCounter = 0;
    this.isPassThrough = false;
    this.noMaskFrameCount = 0;
    this.motionScore = 0;

    this.cachedFrameData = null;
    this.cachedBlurredData = null;
    this.cachedBgData = null;
    this.cachedMaskImgData = null;

    this.outputStream = this.canvas.captureStream(this.profile.outputFps);

    inputStream.getAudioTracks().forEach(track => {
      this.outputStream!.addTrack(track);
    });

    this.isRunning = true;
    this.setupVisibilityHandler();
    console.log(`[BackgroundProcessor] Started: ${this.processWidth}x${this.processHeight} @ ${this.profile.outputFps}fps, mobile=${detectMobile()}`);
    this.processFrame();

    return this.outputStream;
  }

  private processFrame = () => {
    if (!this.isRunning || !this.segmenter) return;

    const frameStart = performance.now();

    const now = performance.now();
    const timestamp = now > this.lastTimestamp ? now : this.lastTimestamp + 1;
    this.lastTimestamp = timestamp;

    try {
      if (this.videoElement.videoWidth === 0 || this.videoElement.videoHeight === 0) {
        if (!this.isTabHidden) {
          this.animationFrameId = requestAnimationFrame(this.processFrame);
        }
        return;
      }

      const { processWidth: width, processHeight: height } = this;

      if (this.isPassThrough) {
        this.ctx.drawImage(this.videoElement, 0, 0, width, height);
        if (frameStart - this.lastSegmentationTime > 3000) {
          this.isPassThrough = false;
          this.overloadCounter = 0;
          console.log('[BackgroundProcessor] Attempting to exit pass-through mode');
        }
        if (!this.isTabHidden) {
          this.animationFrameId = requestAnimationFrame(this.processFrame);
        }
        return;
      }

      // Draw video to inputCanvas at processing resolution
      this.inputCtx.drawImage(this.videoElement, 0, 0, width, height);

      // Throttled segmentation
      const timeSinceLastSeg = frameStart - this.lastSegmentationTime;
      let maskData = this.cachedMask;

      if (timeSinceLastSeg >= this.profile.segmentationIntervalMs) {
        const result = this.segmenter.segmentForVideo(this.inputCanvas, timestamp);
        const masks = result.confidenceMasks;

        if (masks && masks.length > 0) {
          let rawMask: Float32Array;

          if (this.isMulticlassModel && masks.length > 1) {
            const bgMask = masks[0].getAsFloat32Array();
            rawMask = new Float32Array(bgMask.length);
            for (let i = 0; i < bgMask.length; i++) {
              rawMask[i] = 1.0 - bgMask[i];
            }
            masks.forEach(m => m.close());
          } else {
            const personMask = masks[0];
            rawMask = personMask.getAsFloat32Array();
            personMask.close();
          }

          if (rawMask.length === width * height) {
            if (!this.cachedMask || this.cachedMask.length !== rawMask.length) {
              this.cachedMask = new Float32Array(rawMask.length);
            }
            this.cachedMask.set(rawMask);
            this.refineMask(this.cachedMask, width, height);
            maskData = this.cachedMask;
            this.noMaskFrameCount = 0;
          } else {
            this.noMaskFrameCount++;
            if (this.noMaskFrameCount === 1 || this.noMaskFrameCount % 30 === 0) {
              console.warn(`[BackgroundProcessor] Mask dimension mismatch: mask=${rawMask.length}, expected=${width * height} (frame #${this.noMaskFrameCount})`);
            }
          }
        }
        this.lastSegmentationTime = frameStart;
      }

      // Draw current frame to output canvas
      this.ctx.drawImage(this.inputCanvas, 0, 0);

      if (maskData && maskData.length === width * height) {
        if (!this.cachedFrameData || this.cachedFrameData.width !== width || this.cachedFrameData.height !== height) {
          this.cachedFrameData = this.ctx.getImageData(0, 0, width, height);
        } else {
          const src = this.ctx.getImageData(0, 0, width, height);
          this.cachedFrameData.data.set(src.data);
        }
        const frame = this.cachedFrameData;

        if (this.mode === 'blur-light' || this.mode === 'blur-heavy') {
          this.applyBlur(frame, maskData, width, height);
        } else if (this.mode === 'image' && this.backgroundImage) {
          this.applyImageBackground(frame, maskData, width, height);
        }

        this.ctx.putImageData(frame, 0, 0);
        this.noMaskFrameCount = 0;
      } else {
        this.noMaskFrameCount++;
        if (this.noMaskFrameCount === VideoBackgroundProcessor.NO_MASK_WARN_THRESHOLD) {
          console.warn(`[BackgroundProcessor] ${this.noMaskFrameCount} frames without valid mask, effect may not be visible`);
        }
      }

      this.frameErrorCount = 0;

      const frameDuration = performance.now() - frameStart;
      if (frameDuration > this.profile.overloadThresholdMs) {
        this.overloadCounter++;
        if (this.overloadCounter > 60) {
          console.warn(`[BackgroundProcessor] Overload detected (${frameDuration.toFixed(0)}ms), switching to pass-through`);
          this.isPassThrough = true;
          this.lastSegmentationTime = performance.now();
        }
      } else {
        this.overloadCounter = Math.max(0, this.overloadCounter - 1);
      }
    } catch (e) {
      this.frameErrorCount++;
      try { this.ctx.drawImage(this.videoElement, 0, 0, this.processWidth, this.processHeight); } catch {}
      if (this.frameErrorCount > 30) {
        console.error('[BackgroundProcessor] Too many frame errors, entering pass-through:', e);
        this.isPassThrough = true;
        this.frameErrorCount = 0;
      }
    }

    if (!this.isTabHidden) {
      this.animationFrameId = requestAnimationFrame(this.processFrame);
    }
  };

  /**
   * Multi-pass mask refinement with adaptive temporal smoothing and edge-aware feathering.
   * 
   * For image mode: gentle contrast → erode/dilate → spatial blur → edge-aware smoothstep → adaptive temporal blend
   * For blur modes: original aggressive pipeline (unchanged)
   */
  private refineMask(mask: Float32Array, width: number, height: number) {
    const isImageMode = this.mode === 'image';
    const isFullResModel = !this.isMulticlassModel;

    // Step 1: Pre-blur contrast
    // Image mode with full-res model: very gentle — preserve natural gradients from high-res mask
    // Multiclass fallback: aggressive to compensate for low-res artifacts
    if (isImageMode) {
      contrastMask(mask, isFullResModel ? 4 : 14);
    } else {
      contrastMask(mask, 7);
    }

    // Step 2: Morphological erode/dilate (1px) — removes thin halo artifacts
    this.erodeDilateMask(mask, width, height);

    // Step 2b: Aggressive radius-2 erosion ONLY for multiclass fallback in image mode
    if (isImageMode && !isFullResModel) {
      this.erodeMaskRadius2(mask, width, height);
    }

    // Step 3: Spatial smoothing via canvas blur
    if (this.maskCtx && this.maskCanvas) {
      if (!this.cachedMaskImgData || this.cachedMaskImgData.width !== width || this.cachedMaskImgData.height !== height) {
        this.cachedMaskImgData = this.maskCtx.createImageData(width, height);
      }
      const imgData = this.cachedMaskImgData;
      for (let i = 0; i < mask.length; i++) {
        const v = Math.round(mask[i] * 255);
        const idx = i * 4;
        imgData.data[idx] = v;
        imgData.data[idx + 1] = v;
        imgData.data[idx + 2] = v;
        imgData.data[idx + 3] = 255;
      }
      this.maskCtx.filter = 'none';
      this.maskCtx.putImageData(imgData, 0, 0);

      // Image mode: wider blur for edge feathering; blur modes: standard
      const blurPx = isImageMode ? (isFullResModel ? 4 : 1) : 3;
      this.maskCtx.filter = `blur(${blurPx}px)`;
      this.maskCtx.drawImage(this.maskCanvas, 0, 0);
      this.maskCtx.filter = 'none';

      const smoothed = this.maskCtx.getImageData(0, 0, width, height);
      for (let i = 0; i < mask.length; i++) {
        mask[i] = smoothed.data[i * 4] / 255;
      }
    }

    // Step 4: Post-blur processing
    if (isImageMode && isFullResModel) {
      // Edge-aware smoothstep instead of hard contrast + clamp
      // This creates a natural feathered edge without halo or chopping
      this.applyEdgeAwareSmoothstep(mask);
    } else {
      // Blur modes & multiclass fallback: original contrast pipeline
      contrastMask(mask, isImageMode ? 12 : 5);
    }

    // Step 5: Adaptive temporal smoothing
    if (!this.previousMask || this.previousMask.length !== mask.length) {
      this.previousMask = new Float32Array(mask.length);
      this.previousMask.set(mask);
    } else {
      if (isImageMode) {
        // Motion-aware: compute motion score from mask difference
        this.motionScore = this.computeMotionScore(mask, this.previousMask);
        
        // High motion → low weight (follow movement closely)
        // Low motion → higher weight (stability)
        const weight = this.motionScore > 0.05 ? 0.03 : this.motionScore > 0.02 ? 0.08 : 0.15;
        
        for (let i = 0; i < mask.length; i++) {
          mask[i] = this.previousMask[i] * weight + mask[i] * (1 - weight);
          this.previousMask[i] = mask[i];
        }
      } else {
        // Blur modes: static temporal smoothing (unchanged)
        const weight = 0.30;
        for (let i = 0; i < mask.length; i++) {
          mask[i] = this.previousMask[i] * weight + mask[i] * (1 - weight);
          this.previousMask[i] = mask[i];
        }
      }
    }

    // Step 6: Final clamp for image mode (only multiclass fallback uses hard clamp)
    if (isImageMode && !isFullResModel) {
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] < 0.15) mask[i] = 0;
        else if (mask[i] > 0.85) mask[i] = 1;
      }
    }
    // Full-res image mode: NO hard clamp — smoothstep already handles transitions
  }

  /**
   * Edge-aware smoothstep: replaces hard contrast + clamp.
   * Creates a narrow, natural transition band at edges without halo or chopping.
   * Core person (>0.65) → 1.0, core background (<0.25) → 0.0,
   * transition zone → smooth Hermite interpolation.
   */
  private applyEdgeAwareSmoothstep(mask: Float32Array) {
    const edgeLow = 0.25;   // below this → definitely background
    const edgeHigh = 0.65;  // above this → definitely person
    
    for (let i = 0; i < mask.length; i++) {
      mask[i] = smoothstep(edgeLow, edgeHigh, mask[i]);
    }
  }

  /**
   * Compute average absolute difference between current and previous mask.
   * Returns 0..1 where 0 = no motion, 1 = complete change.
   */
  private computeMotionScore(current: Float32Array, previous: Float32Array): number {
    const sampleStep = 4; // sample every 4th pixel for performance
    let totalDiff = 0;
    let count = 0;
    for (let i = 0; i < current.length; i += sampleStep) {
      totalDiff += Math.abs(current[i] - previous[i]);
      count++;
    }
    return count > 0 ? totalDiff / count : 0;
  }

  /**
   * Morphological erode (1px) then dilate (1px) on the mask.
   */
  private erodeDilateMask(mask: Float32Array, width: number, height: number) {
    const len = mask.length;
    if (!this._morphBuffer || this._morphBuffer.length !== len) {
      this._morphBuffer = new Float32Array(len);
    }
    const tmp = this._morphBuffer;

    // Erode: each pixel = min of itself and 4-connected neighbors
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        let minVal = mask[idx];
        if (x > 0) minVal = Math.min(minVal, mask[idx - 1]);
        if (x < width - 1) minVal = Math.min(minVal, mask[idx + 1]);
        if (y > 0) minVal = Math.min(minVal, mask[idx - width]);
        if (y < height - 1) minVal = Math.min(minVal, mask[idx + width]);
        tmp[idx] = minVal;
      }
    }

    // Dilate: each pixel = max of itself and 4-connected neighbors
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        let maxVal = tmp[idx];
        if (x > 0) maxVal = Math.max(maxVal, tmp[idx - 1]);
        if (x < width - 1) maxVal = Math.max(maxVal, tmp[idx + 1]);
        if (y > 0) maxVal = Math.max(maxVal, tmp[idx - width]);
        if (y < height - 1) maxVal = Math.max(maxVal, tmp[idx + width]);
        mask[idx] = maxVal;
      }
    }
  }
  private _morphBuffer: Float32Array | null = null;
  private _erodeBuffer: Float32Array | null = null;

  /** Radius-2 erosion — only used for multiclass fallback */
  private erodeMaskRadius2(mask: Float32Array, width: number, height: number) {
    const len = mask.length;
    if (!this._erodeBuffer || this._erodeBuffer.length !== len) {
      this._erodeBuffer = new Float32Array(len);
    }
    const tmp = this._erodeBuffer;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        let minVal = mask[idx];
        for (let dy = -2; dy <= 2; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -2; dx <= 2; dx++) {
            if (Math.abs(dx) + Math.abs(dy) > 2) continue;
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            minVal = Math.min(minVal, mask[ny * width + nx]);
          }
        }
        tmp[idx] = minVal;
      }
    }
    mask.set(tmp);
  }

  private applyBlur(frame: ImageData, mask: Float32Array, width: number, height: number) {
    const profile = BLUR_PROFILES[this.mode] || BLUR_PROFILES['blur-light'];

    if (!this.blurredCtx || !this.blurredCanvas) return;

    this.blurredCtx.filter = `blur(${profile.blurRadius}px)`;
    this.blurredCtx.drawImage(this.inputCanvas, 0, 0);
    if (!this.cachedBlurredData || this.cachedBlurredData.width !== width || this.cachedBlurredData.height !== height) {
      this.cachedBlurredData = this.blurredCtx.getImageData(0, 0, width, height);
    } else {
      const src = this.blurredCtx.getImageData(0, 0, width, height);
      this.cachedBlurredData.data.set(src.data);
    }
    const blurred = this.cachedBlurredData;

    for (let i = 0; i < mask.length; i++) {
      const personConf = mask[i];

      if (personConf >= profile.personThresholdHigh) {
        continue;
      } else if (personConf <= profile.personThresholdLow) {
        const idx = i * 4;
        frame.data[idx] = blurred.data[idx];
        frame.data[idx + 1] = blurred.data[idx + 1];
        frame.data[idx + 2] = blurred.data[idx + 2];
      } else {
        const range = profile.personThresholdHigh - profile.personThresholdLow;
        const bgAlpha = 1 - (personConf - profile.personThresholdLow) / range;
        const idx = i * 4;
        frame.data[idx] = frame.data[idx] * (1 - bgAlpha) + blurred.data[idx] * bgAlpha;
        frame.data[idx + 1] = frame.data[idx + 1] * (1 - bgAlpha) + blurred.data[idx + 1] * bgAlpha;
        frame.data[idx + 2] = frame.data[idx + 2] * (1 - bgAlpha) + blurred.data[idx + 2] * bgAlpha;
      }
    }
  }

  /**
   * Two-stage alpha blending for image backgrounds:
   * - Core person (mask ≥ high threshold): keep original pixel 1:1
   * - Core background (mask ≤ low threshold): replace with bg 1:1
   * - Transition band: smoothstep-based soft blend
   */
  private applyImageBackground(frame: ImageData, mask: Float32Array, width: number, height: number) {
    if (!this.backgroundImage || !this.blurredCtx || !this.blurredCanvas) return;

    const profile = BLUR_PROFILES['image'];
    const imgRatio = this.backgroundImage.width / this.backgroundImage.height;
    const canvasRatio = width / height;
    let sx = 0, sy = 0, sw = this.backgroundImage.width, sh = this.backgroundImage.height;
    if (imgRatio > canvasRatio) {
      sw = this.backgroundImage.height * canvasRatio;
      sx = (this.backgroundImage.width - sw) / 2;
    } else {
      sh = this.backgroundImage.width / canvasRatio;
      sy = (this.backgroundImage.height - sh) / 2;
    }
    // Draw background only once (cache until size changes)
    if (!this.cachedBgData || this.cachedBgData.width !== width || this.cachedBgData.height !== height) {
      this.blurredCtx.filter = 'none';
      this.blurredCtx.save();
      this.blurredCtx.scale(-1, 1);
      this.blurredCtx.drawImage(this.backgroundImage, sx, sy, sw, sh, -width, 0, width, height);
      this.blurredCtx.restore();
      this.cachedBgData = this.blurredCtx.getImageData(0, 0, width, height);
    }
    const bgData = this.cachedBgData;

    const thHigh = profile.personThresholdHigh;
    const thLow = profile.personThresholdLow;

    for (let i = 0; i < mask.length; i++) {
      const m = mask[i];

      if (m >= thHigh) {
        // Core person — keep original pixel untouched
        continue;
      } else if (m <= thLow) {
        // Core background — replace 1:1
        const idx = i * 4;
        frame.data[idx] = bgData.data[idx];
        frame.data[idx + 1] = bgData.data[idx + 1];
        frame.data[idx + 2] = bgData.data[idx + 2];
      } else {
        // Transition band — person-priority blend (bias toward person pixels)
        const t = smoothstep(thLow, thHigh, m); // 0 at thLow, 1 at thHigh
        const personAlpha = Math.pow(t, 0.7);   // bias: favors person to prevent bg bleed-through
        const bgAlpha = 1 - personAlpha;
        const idx = i * 4;
        frame.data[idx] = frame.data[idx] * personAlpha + bgData.data[idx] * bgAlpha;
        frame.data[idx + 1] = frame.data[idx + 1] * personAlpha + bgData.data[idx + 1] * bgAlpha;
        frame.data[idx + 2] = frame.data[idx + 2] * personAlpha + bgData.data[idx + 2] * bgAlpha;
      }
    }
  }

  private setupVisibilityHandler() {
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.isTabHidden = true;
        if (this.animationFrameId !== null) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
        if (!this.backgroundIntervalId) {
          this.backgroundIntervalId = setInterval(() => {
            if (this.isRunning) this.processFrame();
          }, 100);
          console.log('[BackgroundProcessor] Tab hidden → setInterval fallback (10fps)');
        }
      } else {
        this.isTabHidden = false;
        if (this.backgroundIntervalId) {
          clearInterval(this.backgroundIntervalId);
          this.backgroundIntervalId = null;
        }
        if (this.isRunning && this.animationFrameId === null) {
          this.animationFrameId = requestAnimationFrame(this.processFrame);
          console.log('[BackgroundProcessor] Tab visible → rAF resumed');
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.backgroundIntervalId) {
      clearInterval(this.backgroundIntervalId);
      this.backgroundIntervalId = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.isTabHidden = false;
    this.videoElement.srcObject = null;
    this.outputStream = null;
    this.blurredCanvas = null;
    this.blurredCtx = null;
    this.maskCanvas = null;
    this.maskCtx = null;
    this.cachedMask = null;
    this.previousMask = null;
    this.cachedFrameData = null;
    this.cachedBlurredData = null;
    this.cachedBgData = null;
    this.cachedMaskImgData = null;
    this.isPassThrough = false;
    this.overloadCounter = 0;
    this.noMaskFrameCount = 0;
    this.motionScore = 0;
  }

  destroy() {
    this.stop();
    if (this.segmenter) {
      this.segmenter.close();
      this.segmenter = null;
    }
    this.initPromise = null;
  }

  setParticipantCount(count: number) {
    const isMobile = detectMobile();
    if (isMobile) {
      this.baseProfile.maxProcessWidth = count >= 2 ? 320 : 480;
      this.baseProfile.segmentationIntervalMs = count >= 2 ? 150 : 100;
    } else {
      if (count >= 4) {
        this.baseProfile.maxProcessWidth = 320;
        this.baseProfile.segmentationIntervalMs = 120;
      } else if (count >= 2) {
        this.baseProfile.maxProcessWidth = 480;
        this.baseProfile.segmentationIntervalMs = 100;
    } else {
        this.baseProfile.maxProcessWidth = 800;
        this.baseProfile.segmentationIntervalMs = 70;
        this.baseProfile.outputFps = 30;
      }
    }
    // Re-apply image mode overrides if active
    this.applyImageModeOverrides();
    console.log(`[BackgroundProcessor] Participant count: ${count}, maxProcessWidth: ${this.profile.maxProcessWidth}, segInterval: ${this.profile.segmentationIntervalMs}ms`);
  }

  isReady(): boolean {
    return this.segmenter !== null && this.isRunning;
  }

  getMode(): BackgroundMode {
    return this.mode;
  }
}
