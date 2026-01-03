/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Parse RGB string to RGB object
 */
function parseRgb(rgb: string): { r: number; g: number; b: number } | null {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return match
    ? {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
      }
    : null;
}

/**
 * Parse HSL string to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Parse HSL string to RGB object
 */
function parseHsl(hsl: string): { r: number; g: number; b: number } | null {
  const match = hsl.match(/hsla?\((\d+),\s*(\d+)%?,\s*(\d+)%?/);
  if (!match) return null;
  
  return hslToRgb(
    parseInt(match[1]),
    parseInt(match[2]),
    parseInt(match[3])
  );
}

/**
 * Calculate relative luminance of a color (0-1 scale)
 * Using WCAG formula: https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function getColorLuminance(color: string): number {
  let rgb: { r: number; g: number; b: number } | null = null;

  // Try to parse different color formats
  if (color.startsWith('#')) {
    rgb = hexToRgb(color);
  } else if (color.startsWith('rgb')) {
    rgb = parseRgb(color);
  } else if (color.startsWith('hsl')) {
    rgb = parseHsl(color);
  }

  if (!rgb) return 0.5; // Default to middle luminance if parsing fails

  // Convert to relative luminance
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Check if a color is dark (luminance < 0.5)
 */
export function isDarkColor(color: string): boolean {
  return getColorLuminance(color) < 0.5;
}

/**
 * Check if a color is light (luminance > 0.5)
 */
export function isLightColor(color: string): boolean {
  return getColorLuminance(color) > 0.5;
}

/**
 * Check if a color would be problematic in the current theme
 * @param color The color to check
 * @param isDarkMode Whether the current theme is dark mode
 * @param type Whether checking 'text' or 'background' color
 */
export function isProblematicColor(
  color: string,
  isDarkMode: boolean,
  type: 'text' | 'background'
): boolean {
  const isLight = isLightColor(color);
  const isDark = isDarkColor(color);

  if (type === 'text') {
    // Dark text on dark mode background is problematic
    if (isDarkMode && isDark) return true;
    // Light text on light mode background is problematic
    if (!isDarkMode && isLight) return true;
  } else if (type === 'background') {
    // Light background in dark mode might be problematic
    if (isDarkMode && isLight) return true;
    // Dark background in light mode might be problematic
    if (!isDarkMode && isDark) return true;
  }

  return false;
}

/**
 * Sanitize HTML content by removing problematic dark colors in dark mode
 * This fixes hardcoded black text that becomes invisible in dark mode
 */
export function sanitizeHtmlForDarkMode(html: string, isDarkMode: boolean): string {
  if (!isDarkMode || !html) return html;
  
  return html
    // Remove inline color styles with black/dark colors
    .replace(/color:\s*rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/gi, '')
    .replace(/color:\s*rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*[\d.]+\)/gi, '')
    .replace(/color:\s*#0{3,6}/gi, '')
    .replace(/color:\s*black/gi, '')
    // Remove font color attributes
    .replace(/(<font[^>]*)\scolor=["'][^"']*["']/gi, '$1')
    // Clean up empty style attributes
    .replace(/style=["']\s*;?\s*["']/gi, '')
    .replace(/style=["'];+["']/gi, '');
}
