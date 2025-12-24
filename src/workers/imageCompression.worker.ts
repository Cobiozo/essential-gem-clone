// Web Worker for image compression using OffscreenCanvas
// This runs in a separate thread to avoid blocking the UI

interface CompressionMessage {
  type: 'compress';
  imageData: ArrayBuffer;
  fileName: string;
  fileType: string;
  fileSizeMB: number;
}

interface CompressionResult {
  type: 'success' | 'error' | 'progress';
  blob?: ArrayBuffer;
  originalSize?: number;
  compressedSize?: number;
  message?: string;
  error?: string;
}

self.onmessage = async (e: MessageEvent<CompressionMessage>) => {
  const { imageData, fileName, fileType, fileSizeMB } = e.data;

  try {
    // Report progress
    self.postMessage({ 
      type: 'progress', 
      message: 'Rozpoczynanie kompresji obrazu...' 
    } as CompressionResult);

    // Create ImageBitmap from ArrayBuffer
    const blob = new Blob([imageData], { type: fileType });
    const imageBitmap = await createImageBitmap(blob);

    // Calculate compression parameters
    let scaleFactor = 0.8;
    let quality = 0.8;

    if (fileSizeMB > 100) {
      scaleFactor = 0.5;
      quality = 0.6;
    } else if (fileSizeMB > 75) {
      scaleFactor = 0.6;
      quality = 0.7;
    } else if (fileSizeMB > 50) {
      scaleFactor = 0.7;
      quality = 0.75;
    }

    const newWidth = Math.round(imageBitmap.width * scaleFactor);
    const newHeight = Math.round(imageBitmap.height * scaleFactor);

    // Create OffscreenCanvas and draw
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get 2d context');
    }

    ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);
    imageBitmap.close(); // Free memory

    // Convert to blob
    const compressedBlob = await canvas.convertToBlob({ 
      type: fileType === 'image/png' ? 'image/png' : 'image/jpeg', 
      quality 
    });

    // Convert blob to ArrayBuffer for transfer
    const arrayBuffer = await compressedBlob.arrayBuffer();
    const compressedSizeMB = arrayBuffer.byteLength / (1024 * 1024);

    self.postMessage(
      {
        type: 'success',
        blob: arrayBuffer,
        originalSize: fileSizeMB,
        compressedSize: compressedSizeMB,
        message: `Kompresja zakończona: ${Math.round(fileSizeMB)}MB → ${Math.round(compressedSizeMB)}MB`
      } as CompressionResult,
      { transfer: [arrayBuffer] } // Transfer ownership for better performance
    );

  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as CompressionResult);
  }
};

export {}; // Make this a module
