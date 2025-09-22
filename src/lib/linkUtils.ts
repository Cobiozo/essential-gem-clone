/**
 * Determines if a URL is external (different domain) or internal (same domain/relative)
 * @param url - The URL to check
 * @returns true if external, false if internal
 */
export const isExternalUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Special protocols that should always open in new tab
  if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('sms:')) {
    return true;
  }
  
  // Relative URLs (starting with / or not starting with http)
  if (url.startsWith('/') || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    const currentHost = window.location.hostname;
    
    // Different domain = external
    return urlObj.hostname !== currentHost;
  } catch (error) {
    // Invalid URL format, treat as internal
    return false;
  }
};

/**
 * Handles navigation based on whether URL is internal or external
 * @param url - The URL to navigate to
 * @param onClick - Optional custom click handler
 */
export const handleNavigation = (url: string, onClick?: () => void) => {
  if (onClick) {
    onClick();
    return;
  }
  
  if (!url) return;
  
  if (isExternalUrl(url)) {
    // External link - open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    // Internal link - navigate in same tab
    if (url.startsWith('/')) {
      // Use React Router for internal routes
      window.location.href = url;
    } else {
      // Relative URL
      window.location.href = url;
    }
  }
};