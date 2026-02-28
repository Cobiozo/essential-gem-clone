/**
 * VideoBackgroundProcessor - ML-powered background segmentation pipeline
 * Uses MediaPipe ImageSegmenter for real-time person/background separation.
 * Pipeline: Camera -> Segmentation -> Canvas (blur/image) -> MediaStream
 * 
 * Adaptive performance: mobile gets lower resolution + throttled segmentation.
 * Foreground lock: person pixels are protected from blur bleeding.
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
  segmentationIntervalMs: 100, // ~10 seg/s
  outputFps: 15,
  overloadThresholdMs: 120,
};

const DESKTOP_PROFILE: PerformanceProfile = {
  maxProcessWidth: 960,
  segmentationIntervalMs: 50, // ~20 seg/s
  outputFps: 24,
  overloadThresholdMs: 60,
};

// --- Blur profiles (foreground-safe thresholds) ---
// selfie_segmenter confidenceMasks[0]: 1.0 = person, 0.0 = background
// So LOW person confidence = background, HIGH person confidence = person
interface BlurProfile {
  blurRadius: number;
  personThresholdHigh: number;  // above this = definitely person, keep original
  personThresholdLow: number;   // below this = definitely background, apply effect
  // Between low and high = soft blend zone
}

const BLUR_PROFILES: Record<string, BlurProfile> = {
  'blur-light': {
    blurRadius: 6,
    personThresholdHigh: 0.55,
    personThresholdLow: 0.15,
  },
  'blur-heavy': {
    blurRadius: 20,
    personThresholdHigh: 0.55,
    personThresholdLow: 0.10,
  },
  'image': {
    blurRadius: 0,
    personThresholdHigh: 0.55,
    personThresholdLow: 0.10,
  },
};

function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 1024);
}

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
  private blurredCanvas: HTMLCanvasElement | null = null;
  private blurredCtx: CanvasRenderingContext2D | null = null;
  private maskCanvas: HTMLCanvasElement | null = null;
  private maskCtx: CanvasRenderingContext2D | null = null;

  // Adaptive performance
  private profile: PerformanceProfile;
  private lastSegmentationTime = 0;
  private cachedMask: Float32Array | null = null;
  private cachedMaskWidth = 0;
  private cachedMaskHeight = 0;
  private overloadCounter = 0;
  private isPassThrough = false;
  private processWidth = 0;
  private processHeight = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
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
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const modelOptions = {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
            delegate: 'GPU' as const,
          },
          runningMode: 'VIDEO' as const,
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        };
        try {
          this.segmenter = await ImageSegmenter.createFromOptions(vision, modelOptions);
          console.log('[BackgroundProcessor] Model loaded with GPU delegate');
        } catch (gpuErr) {
          console.warn('[BackgroundProcessor] GPU delegate failed, falling back to CPU:', gpuErr);
          this.segmenter = await ImageSegmenter.createFromOptions(vision, {
            ...modelOptions,
            baseOptions: { ...modelOptions.baseOptions, delegate: 'CPU' as const },
          });
          console.log('[BackgroundProcessor] Model loaded with CPU delegate');
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

  /**
   * Start processing an input stream and return a processed output stream.
   */
  async start(inputStream: MediaStream): Promise<MediaStream> {
    if (this.mode === 'none') {
      return inputStream;
    }

    await this.initialize();

    const videoTrack = inputStream.getVideoTracks()[0];
    if (!videoTrack) return inputStream;

    const settings = videoTrack.getSettings();
    const srcWidth = settings.width || 640;
    const srcHeight = settings.height || 480;

    // Calculate processing resolution (downscaled for performance)
    const scale = Math.min(1, this.profile.maxProcessWidth / srcWidth);
    this.processWidth = Math.round(srcWidth * scale) & ~1; // even numbers
    this.processHeight = Math.round(srcHeight * scale) & ~1;

    this.canvas.width = this.processWidth;
    this.canvas.height = this.processHeight;

    // Pre-create reusable blur canvas
    this.blurredCanvas = document.createElement('canvas');
    this.blurredCanvas.width = this.processWidth;
    this.blurredCanvas.height = this.processHeight;
    this.blurredCtx = this.blurredCanvas.getContext('2d')!;

    // Pre-create mask smoothing canvas
    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = this.processWidth;
    this.maskCanvas.height = this.processHeight;
    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true })!;

    // Reset state
    this.lastTimestamp = 0;
    this.frameErrorCount = 0;
    this.lastSegmentationTime = 0;
    this.cachedMask = null;
    this.overloadCounter = 0;
    this.isPassThrough = false;

    this.videoElement.srcObject = new MediaStream([videoTrack]);

    // Wait for video to be ready
    if (this.videoElement.readyState >= 2) {
      try { await this.videoElement.play(); } catch {}
    } else {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('[BackgroundProcessor] onloadeddata timeout, forcing start');
          resolve();
        }, 3000);
        this.videoElement.onloadeddata = () => { clearTimeout(timeout); resolve(); };
        this.videoElement.onerror = () => { clearTimeout(timeout); reject(new Error('Video element error')); };
      });
      try { await this.videoElement.play(); } catch {}
    }

    this.outputStream = this.canvas.captureStream(this.profile.outputFps);

    // Carry over audio tracks
    inputStream.getAudioTracks().forEach(track => {
      this.outputStream!.addTrack(track);
    });

    this.isRunning = true;
    console.log(`[BackgroundProcessor] Started: ${this.processWidth}x${this.processHeight} @ ${this.profile.outputFps}fps, mobile=${detectMobile()}`);
    this.processFrame();

    return this.outputStream;
  }

  private processFrame = () => {
    if (!this.isRunning || !this.segmenter) return;

    const frameStart = performance.now();

    // Ensure monotonically increasing timestamps
    const now = performance.now();
    const timestamp = now > this.lastTimestamp ? now : this.lastTimestamp + 1;
    this.lastTimestamp = timestamp;

    try {
      if (this.videoElement.videoWidth === 0 || this.videoElement.videoHeight === 0) {
        this.animationFrameId = requestAnimationFrame(this.processFrame);
        return;
      }

      const { processWidth: width, processHeight: height } = this;

      // Overload pass-through: just draw raw frame
      if (this.isPassThrough) {
        this.ctx.drawImage(this.videoElement, 0, 0, width, height);
        // Try to recover every 2 seconds
        if (frameStart - this.lastSegmentationTime > 2000) {
          this.isPassThrough = false;
          this.overloadCounter = 0;
          console.log('[BackgroundProcessor] Attempting to exit pass-through mode');
        }
        this.animationFrameId = requestAnimationFrame(this.processFrame);
        return;
      }

      // Throttled segmentation: only run model if enough time elapsed
      const timeSinceLastSeg = frameStart - this.lastSegmentationTime;
      let maskData = this.cachedMask;

      if (timeSinceLastSeg >= this.profile.segmentationIntervalMs) {
        const result = this.segmenter.segmentForVideo(this.videoElement, timestamp);
        const masks = result.confidenceMasks;

        if (masks && masks.length > 0) {
          const personMask = masks[0];
          const rawMask = personMask.getAsFloat32Array();
          // Cache a copy of the mask
          if (!this.cachedMask || this.cachedMask.length !== rawMask.length) {
            this.cachedMask = new Float32Array(rawMask.length);
          }
          this.cachedMask.set(rawMask);
          this.smoothMask(this.cachedMask, width, height);
          this.cachedMaskWidth = width;
          this.cachedMaskHeight = height;
          maskData = this.cachedMask;
          personMask.close();
        }
        this.lastSegmentationTime = frameStart;
      }

      // Draw current video frame (at processing resolution)
      this.ctx.drawImage(this.videoElement, 0, 0, width, height);

      if (maskData && maskData.length === width * height) {
        const frame = this.ctx.getImageData(0, 0, width, height);

        if (this.mode === 'blur-light' || this.mode === 'blur-heavy') {
          this.applyBlur(frame, maskData, width, height);
        } else if (this.mode === 'image' && this.backgroundImage) {
          this.applyImageBackground(frame, maskData, width, height);
        }

        this.ctx.putImageData(frame, 0, 0);
      }
      // else: no mask yet, raw frame is already drawn

      this.frameErrorCount = 0;

      // Overload detection
      const frameDuration = performance.now() - frameStart;
      if (frameDuration > this.profile.overloadThresholdMs) {
        this.overloadCounter++;
        if (this.overloadCounter > 15) {
          console.warn(`[BackgroundProcessor] Overload detected (${frameDuration.toFixed(0)}ms avg), switching to pass-through`);
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

    this.animationFrameId = requestAnimationFrame(this.processFrame);
  };

  private smoothMask(mask: Float32Array, width: number, height: number) {
    if (!this.maskCtx || !this.maskCanvas) return;

    // Write mask as grayscale image
    const imgData = this.maskCtx.createImageData(width, height);
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

    // Apply Gaussian blur via CSS filter
    this.maskCtx.filter = 'blur(4px)';
    this.maskCtx.drawImage(this.maskCanvas, 0, 0);
    this.maskCtx.filter = 'none';

    // Read back smoothed mask
    const smoothed = this.maskCtx.getImageData(0, 0, width, height);
    for (let i = 0; i < mask.length; i++) {
      mask[i] = smoothed.data[i * 4] / 255;
    }
  }

  private applyBlur(frame: ImageData, mask: Float32Array, width: number, height: number) {
    const profile = BLUR_PROFILES[this.mode] || BLUR_PROFILES['blur-light'];

    if (!this.blurredCtx || !this.blurredCanvas) return;

    this.blurredCtx.filter = `blur(${profile.blurRadius}px)`;
    this.blurredCtx.drawImage(this.videoElement, 0, 0, width, height);
    const blurred = this.blurredCtx.getImageData(0, 0, width, height);

    // selfie_segmenter confidenceMasks[0]: HIGH = person, LOW = background
    for (let i = 0; i < mask.length; i++) {
      const personConf = mask[i];

      if (personConf >= profile.personThresholdHigh) {
        // Definitely person → keep original (foreground lock)
        continue;
      } else if (personConf <= profile.personThresholdLow) {
        // Definitely background → full blur
        const idx = i * 4;
        frame.data[idx] = blurred.data[idx];
        frame.data[idx + 1] = blurred.data[idx + 1];
        frame.data[idx + 2] = blurred.data[idx + 2];
      } else {
        // Edge zone → soft blend (weighted toward keeping person sharp)
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
    const bgData = this.blurredCtx.getImageData(0, 0, width, height);

    // selfie_segmenter: HIGH = person, LOW = background
    for (let i = 0; i < mask.length; i++) {
      const personConf = mask[i];

      if (personConf >= profile.personThresholdHigh) {
        continue; // person → keep original
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

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.videoElement.srcObject = null;
    this.outputStream = null;
    this.blurredCanvas = null;
    this.blurredCtx = null;
    this.maskCanvas = null;
    this.maskCtx = null;
    this.cachedMask = null;
    this.isPassThrough = false;
    this.overloadCounter = 0;
  }

  destroy() {
    this.stop();
    if (this.segmenter) {
      this.segmenter.close();
      this.segmenter = null;
    }
    this.initPromise = null;
  }

  getMode(): BackgroundMode {
    return this.mode;
  }
}
