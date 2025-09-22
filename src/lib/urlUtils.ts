/**
 * Determines if a URL is external (different domain) or internal
 * @param url - The URL to check
 * @returns true if the URL is external, false if internal
 */
export const isExternalUrl = (url: string): boolean => {
  if (!url) return false;
  
  try {
    // If URL starts with http:// or https://, check if it's a different domain
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      const currentDomain = window.location.hostname;
      return urlObj.hostname !== currentDomain;
    }
    
    // URLs starting with // are protocol-relative external links
    if (url.startsWith('//')) {
      return true;
    }
    
    // URLs starting with / are internal paths
    if (url.startsWith('/')) {
      return false;
    }
    
    // URLs without protocol that contain a dot are likely external
    if (url.includes('.') && !url.startsWith('.')) {
      return true;
    }
    
    // Everything else is considered internal (relative paths, anchors, etc.)
    return false;
  } catch (error) {
    // If URL parsing fails, assume it's internal
    return false;
  }
};

/**
 * Opens a URL respecting internal/external link behavior
 * @param url - The URL to open
 */
export const openUrl = (url: string): void => {
  if (!url) return;
  
  if (isExternalUrl(url)) {
    // External links open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    // Internal links open in same tab
    if (url.startsWith('/')) {
      // Use router navigation for internal paths
      window.location.href = url;
    } else {
      // For relative paths or anchors
      window.location.href = url;
    }
  }
};