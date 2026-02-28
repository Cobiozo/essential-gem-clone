/**
 * VideoBackgroundProcessor - ML-powered background segmentation pipeline
 * Uses MediaPipe ImageSegmenter for real-time person/background separation.
 * Pipeline: Camera -> InputCanvas (downscale) -> Segmentation -> Canvas (blur/image) -> MediaStream
 * 
 * v2: Multi-pass mask refinement (contrast→blur→contrast), temporal smoothing,
 * tighter alpha thresholds, upgraded model (selfie_multiclass).
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

// --- Blur profiles (tightened thresholds for cleaner edges) ---
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
    personThresholdHigh: 0.75,   // tighter: keep more person pixels
    personThresholdLow: 0.50,    // tighter: replace background more aggressively
  },
};

// --- Mask refinement helpers ---

/** Sigmoid-like contrast curve: pushes values toward 0 or 1 */
function contrastMask(mask: Float32Array, strength: number = 5) {
  for (let i = 0; i < mask.length; i++) {
    // Sigmoid centered at 0.5
    const x = mask[i];
    mask[i] = 1 / (1 + Math.exp(-strength * (x - 0.5)));
  }
}

function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 1024);
}

// Primary model (multiclass, better hair/body separation)
const PRIMARY_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float16/latest/selfie_multiclass_256x256.tflite';
// Fallback model
const FALLBACK_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';

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

  // Dedicated input canvas for segmentation (always processWidth×processHeight)
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
  private lastSegmentationTime = 0;
  private cachedMask: Float32Array | null = null;
  private previousMask: Float32Array | null = null; // temporal smoothing
  private overloadCounter = 0;
  private isPassThrough = false;
  private processWidth = 0;
  private processHeight = 0;

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
    this.profile = detectMobile() ? MOBILE_PROFILE : DESKTOP_PROFILE;
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

        // Try primary multiclass model with GPU
        try {
          this.segmenter = await createSegmenter(PRIMARY_MODEL_URL, 'GPU');
          this.isMulticlassModel = true;
          console.log('[BackgroundProcessor] Multiclass model loaded (GPU)');
        } catch (e1) {
          console.warn('[BackgroundProcessor] Multiclass GPU failed, trying CPU:', e1);
          try {
            this.segmenter = await createSegmenter(PRIMARY_MODEL_URL, 'CPU');
            this.isMulticlassModel = true;
            console.log('[BackgroundProcessor] Multiclass model loaded (CPU)');
          } catch (e2) {
            console.warn('[BackgroundProcessor] Multiclass failed, falling back to basic model:', e2);
            // Fallback to basic selfie_segmenter
            try {
              this.segmenter = await createSegmenter(FALLBACK_MODEL_URL, 'GPU');
              console.log('[BackgroundProcessor] Basic model loaded (GPU)');
            } catch (e3) {
              this.segmenter = await createSegmenter(FALLBACK_MODEL_URL, 'CPU');
              console.log('[BackgroundProcessor] Basic model loaded (CPU)');
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

    // Wait for video metadata to get true dimensions
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

    const scale = Math.min(1, this.profile.maxProcessWidth / srcWidth);
    this.processWidth = Math.round(srcWidth * scale) & ~1;
    this.processHeight = Math.round(srcHeight * scale) & ~1;

    console.log(`[BackgroundProcessor] Source: ${srcWidth}x${srcHeight}, Process: ${this.processWidth}x${this.processHeight}, multiclass=${this.isMulticlassModel}`);

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
          // For multiclass model, combine person-related classes (skip background class 0)
          let rawMask: Float32Array;

          if (this.isMulticlassModel && masks.length > 1) {
            // Multiclass: classes are [background, hair, body-skin, face-skin, clothes, others...]
            // Combine all non-background classes into one person mask
            const bgMask = masks[0].getAsFloat32Array();
            rawMask = new Float32Array(bgMask.length);
            for (let i = 0; i < bgMask.length; i++) {
              rawMask[i] = 1.0 - bgMask[i]; // person = 1 - background
            }
            masks.forEach(m => m.close());
          } else {
            // Basic model: single confidence mask
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
   * Multi-pass mask refinement: contrast → blur → contrast → temporal blend
   * Produces crystal-clear edges with no flickering.
   */
  private refineMask(mask: Float32Array, width: number, height: number) {
    const isImageMode = this.mode === 'image';

    // Step 1: Pre-blur contrast — push values toward 0/1 (stronger for image mode)
    contrastMask(mask, isImageMode ? 10 : 7);

    // Step 2: Single erode/dilate pass — removes thin halo artifacts
    this.erodeDilateMask(mask, width, height);

    // Step 2b: Extra erode pass for image mode — tightens edges to cut furniture bleed
    if (isImageMode) {
      this.erodeMaskOnly(mask, width, height);
    }

    // Step 3: Spatial smoothing via canvas blur (smaller for image mode to keep edges sharp)
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

      this.maskCtx.filter = isImageMode ? 'blur(1.5px)' : 'blur(3px)';
      this.maskCtx.drawImage(this.maskCanvas, 0, 0);
      this.maskCtx.filter = 'none';

      const smoothed = this.maskCtx.getImageData(0, 0, width, height);
      for (let i = 0; i < mask.length; i++) {
        mask[i] = smoothed.data[i * 4] / 255;
      }
    }

    // Step 4: Post-blur contrast — restore sharp edges (stronger for image mode)
    contrastMask(mask, isImageMode ? 8 : 5);

    // Step 5: Temporal smoothing — blend with previous frame (30/70) for smooth edges without motion lag
    if (!this.previousMask || this.previousMask.length !== mask.length) {
      this.previousMask = new Float32Array(mask.length);
      this.previousMask.set(mask);
    } else {
      for (let i = 0; i < mask.length; i++) {
        mask[i] = this.previousMask[i] * 0.30 + mask[i] * 0.70;
        this.previousMask[i] = mask[i];
      }
    }
  }

  /**
   * Morphological erode (1px) then dilate (1px) on the mask.
   * Erode removes thin halo artifacts at person edges.
   * Dilate restores the silhouette size after erosion.
   */
  private erodeDilateMask(mask: Float32Array, width: number, height: number) {
    const len = mask.length;
    // Reuse a temporary buffer
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

  /** Extra erode-only pass for image mode — shrinks person mask slightly to cut edge bleed */
  private erodeMaskOnly(mask: Float32Array, width: number, height: number) {
    const len = mask.length;
    if (!this._erodeBuffer || this._erodeBuffer.length !== len) {
      this._erodeBuffer = new Float32Array(len);
    }
    const tmp = this._erodeBuffer;
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
    this.blurredCtx.filter = 'none';
    this.blurredCtx.drawImage(this.backgroundImage, sx, sy, sw, sh, 0, 0, width, height);
    if (!this.cachedBgData || this.cachedBgData.width !== width || this.cachedBgData.height !== height) {
      this.cachedBgData = this.blurredCtx.getImageData(0, 0, width, height);
    } else {
      const src = this.blurredCtx.getImageData(0, 0, width, height);
      this.cachedBgData.data.set(src.data);
    }
    const bgData = this.cachedBgData;

    for (let i = 0; i < mask.length; i++) {
      const personConf = mask[i];

      if (personConf >= profile.personThresholdHigh) {
        continue;
      } else if (personConf <= profile.personThresholdLow) {
        const idx = i * 4;
        frame.data[idx] = bgData.data[idx];
        frame.data[idx + 1] = bgData.data[idx + 1];
        frame.data[idx + 2] = bgData.data[idx + 2];
      } else {
        const range = profile.personThresholdHigh - profile.personThresholdLow;
        const bgAlpha = 1 - (personConf - profile.personThresholdLow) / range;
        const idx = i * 4;
        frame.data[idx] = frame.data[idx] * (1 - bgAlpha) + bgData.data[idx] * bgAlpha;
        frame.data[idx + 1] = frame.data[idx + 1] * (1 - bgAlpha) + bgData.data[idx + 1] * bgAlpha;
        frame.data[idx + 2] = frame.data[idx + 2] * (1 - bgAlpha) + bgData.data[idx + 2] * bgAlpha;
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
      this.profile.maxProcessWidth = count >= 2 ? 320 : 480;
      this.profile.segmentationIntervalMs = count >= 2 ? 150 : 100;
    } else {
      if (count >= 4) {
        this.profile.maxProcessWidth = 320;
        this.profile.segmentationIntervalMs = 120;
      } else if (count >= 2) {
        this.profile.maxProcessWidth = 480;
        this.profile.segmentationIntervalMs = 100;
      } else {
        this.profile.maxProcessWidth = 640;
        this.profile.segmentationIntervalMs = 80;
      }
    }
    console.log(`[BackgroundProcessor] Participant count: ${count}, maxProcessWidth: ${this.profile.maxProcessWidth}, segInterval: ${this.profile.segmentationIntervalMs}ms`);
  }

  isReady(): boolean {
    return this.segmenter !== null && this.isRunning;
  }

  getMode(): BackgroundMode {
    return this.mode;
  }
}
