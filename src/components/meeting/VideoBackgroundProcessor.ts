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

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
  }

  async initialize(): Promise<void> {
    if (this.segmenter) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        this.segmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        });
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

    this.videoElement.srcObject = new MediaStream([videoTrack]);
    await new Promise<void>((resolve) => {
      this.videoElement.onloadeddata = () => resolve();
    });

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

    const now = performance.now();

    try {
      const result = this.segmenter.segmentForVideo(this.videoElement, now);
      const mask = result.categoryMask;

      if (mask) {
        const { width, height } = this.canvas;

        // Draw original video frame
        this.ctx.drawImage(this.videoElement, 0, 0, width, height);
        const frame = this.ctx.getImageData(0, 0, width, height);

        // Get mask data
        const maskData = mask.getAsUint8Array();

        if (this.mode === 'blur-light' || this.mode === 'blur-heavy') {
          this.applyBlur(frame, maskData, width, height);
        } else if (this.mode === 'image' && this.backgroundImage) {
          this.applyImageBackground(frame, maskData, width, height);
        }

        this.ctx.putImageData(frame, 0, 0);
        mask.close();
      }
    } catch (e) {
      // On error, just draw the raw frame
      this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
    }

    this.animationFrameId = requestAnimationFrame(this.processFrame);
  };

  private applyBlur(frame: ImageData, mask: Uint8Array, width: number, height: number) {
    const blurRadius = this.mode === 'blur-light' ? 10 : 20;

    // Create a blurred version using a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.filter = `blur(${blurRadius}px)`;
    tempCtx.drawImage(this.videoElement, 0, 0, width, height);
    const blurred = tempCtx.getImageData(0, 0, width, height);

    // Composite: person pixels from original, background from blurred
    for (let i = 0; i < mask.length; i++) {
      // mask value: 0 = background, 1+ = person
      if (mask[i] === 0) {
        const idx = i * 4;
        frame.data[idx] = blurred.data[idx];
        frame.data[idx + 1] = blurred.data[idx + 1];
        frame.data[idx + 2] = blurred.data[idx + 2];
      }
    }
  }

  private applyImageBackground(frame: ImageData, mask: Uint8Array, width: number, height: number) {
    if (!this.backgroundImage) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Draw background image scaled to fill
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
    tempCtx.drawImage(this.backgroundImage, sx, sy, sw, sh, 0, 0, width, height);
    const bgData = tempCtx.getImageData(0, 0, width, height);

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 0) {
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
