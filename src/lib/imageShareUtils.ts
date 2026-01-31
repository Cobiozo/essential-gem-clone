/**
 * Mobile Image Share Utilities
 * Uses Web Share API to allow saving images directly to Photos on mobile devices
 */

export const isIOSDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
};

export const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0);
};

export const canUseWebShare = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return 'share' in navigator && 'canShare' in navigator;
};

/**
 * Share or download an image.
 * On mobile devices with Web Share API, shows native share sheet with "Save Image" option.
 * On other platforms, falls back to standard download.
 */
export const shareOrDownloadImage = async (
  imageUrl: string,
  fileName: string = 'image.jpg'
): Promise<boolean> => {
  try {
    // On mobile, use Web Share API to enable "Save to Photos/Gallery"
    if (canUseWebShare()) {
      console.log('[imageShareUtils] Using Web Share API for mobile');
      
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Zapisz obraz'
        });
        console.log('[imageShareUtils] Share completed successfully');
        return true;
      } else {
        console.log('[imageShareUtils] canShare returned false, falling back to download');
      }
    }
    
    // Fallback - standard download
    console.log('[imageShareUtils] Using standard download');
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    // User cancelled share is not an error
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[imageShareUtils] User cancelled share');
      return false;
    }
    
    console.error('[imageShareUtils] Share/download failed:', error);
    
    // Try fallback on error
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (fallbackError) {
      console.error('[imageShareUtils] Fallback download also failed:', fallbackError);
      return false;
    }
  }
};
