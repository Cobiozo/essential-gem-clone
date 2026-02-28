/**
 * VideoBackgroundProcessor - ML-powered background segmentation pipeline
 * Uses MediaPipe ImageSegmenter for real-time person/background separation.
 * Pipeline: Camera -> InputCanvas (downscale) -> Segmentation -> Canvas (blur/image) -> MediaStream
 * 
 * Key fix: segmentation runs on a downscaled inputCanvas (not raw videoElement),
 * so the mask always matches processWidth×processHeight — no dimension mismatch.
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
  segmentationIntervalMs: 66,
  outputFps: 24,
  overloadThresholdMs: 250,
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
        const modelOptions = {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',
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

    // Use videoElement.videoWidth/Height as source of truth (after metadata loaded)
    const srcWidth = this.videoElement.videoWidth || videoTrack.getSettings().width || 640;
    const srcHeight = this.videoElement.videoHeight || videoTrack.getSettings().height || 480;

    // Calculate processing resolution (downscaled for performance)
    const scale = Math.min(1, this.profile.maxProcessWidth / srcWidth);
    this.processWidth = Math.round(srcWidth * scale) & ~1;
    this.processHeight = Math.round(srcHeight * scale) & ~1;

    console.log(`[BackgroundProcessor] Source: ${srcWidth}x${srcHeight}, Process: ${this.processWidth}x${this.processHeight}`);

    // Set all canvases to processing resolution
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
    this.overloadCounter = 0;
    this.isPassThrough = false;
    this.noMaskFrameCount = 0;

    // Invalidate cached ImageData (dimensions changed)
    this.cachedFrameData = null;
    this.cachedBlurredData = null;
    this.cachedBgData = null;
    this.cachedMaskImgData = null;

    this.outputStream = this.canvas.captureStream(this.profile.outputFps);

    // Carry over audio tracks
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

    // Ensure monotonically increasing timestamps
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

      // Overload pass-through: just draw raw frame
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

      // Draw video to inputCanvas at processing resolution FIRST
      this.inputCtx.drawImage(this.videoElement, 0, 0, width, height);

      // Throttled segmentation
      const timeSinceLastSeg = frameStart - this.lastSegmentationTime;
      let maskData = this.cachedMask;

      if (timeSinceLastSeg >= this.profile.segmentationIntervalMs) {
        // Run segmentation on inputCanvas (same size as processWidth×processHeight)
        const result = this.segmenter.segmentForVideo(this.inputCanvas, timestamp);
        const masks = result.confidenceMasks;

        if (masks && masks.length > 0) {
          const personMask = masks[0];
          const rawMask = personMask.getAsFloat32Array();

          if (rawMask.length === width * height) {
            if (!this.cachedMask || this.cachedMask.length !== rawMask.length) {
              this.cachedMask = new Float32Array(rawMask.length);
            }
            this.cachedMask.set(rawMask);
            this.smoothMask(this.cachedMask, width, height);
            maskData = this.cachedMask;
            this.noMaskFrameCount = 0;
          } else {
            // Dimension mismatch — log once, increment counter
            this.noMaskFrameCount++;
            if (this.noMaskFrameCount === 1 || this.noMaskFrameCount % 30 === 0) {
              console.warn(`[BackgroundProcessor] Mask dimension mismatch: mask=${rawMask.length}, expected=${width * height} (frame #${this.noMaskFrameCount})`);
            }
          }
          personMask.close();
        }
        this.lastSegmentationTime = frameStart;
      }

      // Draw current frame to output canvas
      this.ctx.drawImage(this.inputCanvas, 0, 0);

      if (maskData && maskData.length === width * height) {
        // Get frame pixels from output canvas
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
        // No valid mask — track consecutive failures
        this.noMaskFrameCount++;
        if (this.noMaskFrameCount === VideoBackgroundProcessor.NO_MASK_WARN_THRESHOLD) {
          console.warn(`[BackgroundProcessor] ${this.noMaskFrameCount} frames without valid mask, effect may not be visible`);
        }
      }

      this.frameErrorCount = 0;

      // Overload detection
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

  private smoothMask(mask: Float32Array, width: number, height: number) {
    if (!this.maskCtx || !this.maskCanvas) return;

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

    this.maskCtx.filter = 'blur(4px)';
    this.maskCtx.drawImage(this.maskCanvas, 0, 0);
    this.maskCtx.filter = 'none';

    const smoothed = this.maskCtx.getImageData(0, 0, width, height);
    for (let i = 0; i < mask.length; i++) {
      mask[i] = smoothed.data[i * 4] / 255;
    }
  }

  private applyBlur(frame: ImageData, mask: Float32Array, width: number, height: number) {
    const profile = BLUR_PROFILES[this.mode] || BLUR_PROFILES['blur-light'];

    if (!this.blurredCtx || !this.blurredCanvas) return;

    // Draw from inputCanvas (same resolution) instead of videoElement
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
        this.profile.segmentationIntervalMs = 66;
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
