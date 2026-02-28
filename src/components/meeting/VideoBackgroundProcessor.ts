/**
 * VideoBackgroundProcessor - ML-powered background segmentation pipeline
 * Uses MediaPipe ImageSegmenter for real-time person/background separation.
 * Pipeline: Camera -> Segmentation -> Canvas (blur/image) -> MediaStream
 */

import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

export type BackgroundMode = 'none' | 'blur-light' | 'blur-heavy' | 'image';

interface ProcessorOptions {
  mode: BackgroundMode;
  backgroundImage?: HTMLImageElement | null;
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

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    // @ts-ignore webkit
    this.videoElement.setAttribute('webkit-playsinline', '');
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
        console.log('[BackgroundProcessor] Model loaded successfully');
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
   * The output stream can be used as a replacement for the original camera stream.
   */
  async start(inputStream: MediaStream): Promise<MediaStream> {
    if (this.mode === 'none') {
      return inputStream;
    }

    await this.initialize();

    const videoTrack = inputStream.getVideoTracks()[0];
    if (!videoTrack) return inputStream;

    const settings = videoTrack.getSettings();
    const width = settings.width || 640;
    const height = settings.height || 480;

    this.canvas.width = width;
    this.canvas.height = height;

    // Pre-create reusable blur canvas
    this.blurredCanvas = document.createElement('canvas');
    this.blurredCanvas.width = width;
    this.blurredCanvas.height = height;
    this.blurredCtx = this.blurredCanvas.getContext('2d')!;

    // Reset state
    this.lastTimestamp = 0;
    this.frameErrorCount = 0;

    this.videoElement.srcObject = new MediaStream([videoTrack]);

    // Wait for video to be ready — handle both fresh and reused elements
    if (this.videoElement.readyState >= 2) {
      // Already has data, just ensure it's playing
      try { await this.videoElement.play(); } catch {}
    } else {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('[BackgroundProcessor] onloadeddata timeout, forcing start');
          resolve();
        }, 3000);
        this.videoElement.onloadeddata = () => {
          clearTimeout(timeout);
          resolve();
        };
        this.videoElement.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Video element error'));
        };
      });
      try { await this.videoElement.play(); } catch {}
    }

    this.outputStream = this.canvas.captureStream(30);

    // Carry over audio tracks from the original stream
    inputStream.getAudioTracks().forEach(track => {
      this.outputStream!.addTrack(track);
    });

    this.isRunning = true;
    this.processFrame();

    return this.outputStream;
  }

  private processFrame = () => {
    if (!this.isRunning || !this.segmenter) return;

    // Ensure monotonically increasing timestamps for MediaPipe
    const now = performance.now();
    const timestamp = now > this.lastTimestamp ? now : this.lastTimestamp + 1;
    this.lastTimestamp = timestamp;

    try {
      // Ensure video is playing and has dimensions
      if (this.videoElement.videoWidth === 0 || this.videoElement.videoHeight === 0) {
        this.animationFrameId = requestAnimationFrame(this.processFrame);
        return;
      }

      const result = this.segmenter.segmentForVideo(this.videoElement, timestamp);
      const masks = result.confidenceMasks;

      if (masks && masks.length > 0) {
        const personMask = masks[0]; // selfie segmenter: index 0 = person confidence
        const { width, height } = this.canvas;

        // Draw original video frame
        this.ctx.drawImage(this.videoElement, 0, 0, width, height);
        const frame = this.ctx.getImageData(0, 0, width, height);

        // Get confidence mask data (float32: 0.0=background, 1.0=person)
        const maskData = personMask.getAsFloat32Array();

        if (this.mode === 'blur-light' || this.mode === 'blur-heavy') {
          this.applyBlur(frame, maskData, width, height);
        } else if (this.mode === 'image' && this.backgroundImage) {
          this.applyImageBackground(frame, maskData, width, height);
        }

        this.ctx.putImageData(frame, 0, 0);
        personMask.close();
      } else {
        // No mask — draw raw frame
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
      }

      this.frameErrorCount = 0;
    } catch (e) {
      this.frameErrorCount++;
      // On error, just draw the raw frame to keep video visible
      try {
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
      } catch {}

      if (this.frameErrorCount > 30) {
        console.error('[BackgroundProcessor] Too many frame errors, stopping:', e);
        // Keep running but just pass through raw frames
        this.frameErrorCount = 0;
      }
    }

    this.animationFrameId = requestAnimationFrame(this.processFrame);
  };

  private applyBlur(frame: ImageData, mask: Float32Array, width: number, height: number) {
    const blurRadius = this.mode === 'blur-light' ? 10 : 20;
    const THRESHOLD = 0.5;

    // Reuse pre-created blur canvas
    if (this.blurredCtx && this.blurredCanvas) {
      this.blurredCtx.filter = `blur(${blurRadius}px)`;
      this.blurredCtx.drawImage(this.videoElement, 0, 0, width, height);
      const blurred = this.blurredCtx.getImageData(0, 0, width, height);

      // Composite: person pixels from original, background from blurred
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] < THRESHOLD) {
          const idx = i * 4;
          frame.data[idx] = blurred.data[idx];
          frame.data[idx + 1] = blurred.data[idx + 1];
          frame.data[idx + 2] = blurred.data[idx + 2];
        }
      }
    }
  }

  private applyImageBackground(frame: ImageData, mask: Float32Array, width: number, height: number) {
    if (!this.backgroundImage) return;

    // Reuse blur canvas for background image rendering
    if (!this.blurredCtx || !this.blurredCanvas) return;

    const THRESHOLD = 0.5;
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

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] < THRESHOLD) {
        const idx = i * 4;
        frame.data[idx] = bgData.data[idx];
        frame.data[idx + 1] = bgData.data[idx + 1];
        frame.data[idx + 2] = bgData.data[idx + 2];
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
