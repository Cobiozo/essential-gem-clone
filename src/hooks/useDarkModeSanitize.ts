import { useTheme } from '@/components/ThemeProvider';
import { sanitizeHtmlForDarkMode } from '@/lib/colorUtils';

/**
 * Hook that provides HTML sanitization for dark mode
 * Removes problematic inline color styles that become invisible in dark mode
 */
export function useDarkModeSanitize() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  /**
   * Sanitize HTML content for dark mode visibility
   */
  const sanitize = (html: string | undefined | null): string => {
    if (!html) return '';
    return sanitizeHtmlForDarkMode(html, isDarkMode);
  };

  /**
   * Check if a color should be blocked in dark mode
   */
  const shouldBlockColor = (color: string | undefined | null, type: 'text' | 'background'): boolean => {
    if (!color || !isDarkMode) return false;
    
    const lowerColor = color.toLowerCase().trim();
    
    if (type === 'text') {
      // Block black/very dark text colors in dark mode
      return (
        lowerColor === 'black' ||
        lowerColor === '#000' ||
        lowerColor === '#000000' ||
        lowerColor.match(/^rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)$/) !== null ||
        lowerColor.match(/^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,/) !== null
      );
    }
    
    return false;
  };

  return { sanitize, isDarkMode, shouldBlockColor };
}
