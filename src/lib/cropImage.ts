export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropOptions {
  rotation?: number; // degrees, -180..180
  flipH?: boolean;
  flipV?: boolean;
}

/**
 * Crops a source image to the given pixel area, optionally applying rotation
 * (degrees) and horizontal/vertical flips. The pixelCrop coordinates are
 * expressed in the same coordinate space as react-easy-crop's
 * `croppedAreaPixels` output, i.e. they refer to the ROTATED + FLIPPED image
 * (which is exactly what the user sees in the cropper). This means we must
 * draw the source image with the same rotation/flip transform applied around
 * the source center, then translate so that pixelCrop's top-left aligns with
 * the canvas origin.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  shape: 'rect' | 'round' = 'rect',
  options: CropOptions = {}
): Promise<Blob> {
  const { rotation = 0, flipH = false, flipV = false } = options;
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  if (shape === 'round') {
    ctx.beginPath();
    ctx.ellipse(
      pixelCrop.width / 2,
      pixelCrop.height / 2,
      pixelCrop.width / 2,
      pixelCrop.height / 2,
      0,
      0,
      2 * Math.PI
    );
    ctx.closePath();
    ctx.clip();
  }

  const fastPath = rotation === 0 && !flipH && !flipV;
  if (fastPath) {
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );
  } else {
    // Compute bounding box of the rotated image and draw the whole rotated
    // image into a temporary canvas, then crop from it.
    const rad = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const bBoxW = image.width * cos + image.height * sin;
    const bBoxH = image.width * sin + image.height * cos;

    const tmp = document.createElement('canvas');
    tmp.width = bBoxW;
    tmp.height = bBoxH;
    const tctx = tmp.getContext('2d')!;
    tctx.translate(bBoxW / 2, bBoxH / 2);
    tctx.rotate(rad);
    tctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    tctx.drawImage(image, -image.width / 2, -image.height / 2);

    ctx.drawImage(
      tmp,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );
  }

  const format = shape === 'round' ? 'image/png' : 'image/jpeg';
  const quality = shape === 'round' ? undefined : 0.92;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, format, quality);
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = url;
  });
}
