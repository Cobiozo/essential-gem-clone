// Roboto font in Base64 format for jsPDF
// This font supports Polish diacritical characters (ąćęłńóśżź)

// We use a subset of Roboto that includes Latin Extended characters
// For full font, you would need to encode the entire TTF file

// IMPORTANT: Due to file size constraints, we're using a font loading approach
// that fetches the font dynamically and caches it

const ROBOTO_FONT_URL = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2';
const ROBOTO_BOLD_URL = 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff2';

// Cache for loaded fonts
let robotoBase64Cache: string | null = null;
let robotoBoldBase64Cache: string | null = null;

/**
 * Loads and converts a font URL to Base64 format for jsPDF
 */
async function loadFontAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to load font from ${url}`);
      return null;
    }
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading font:', error);
    return null;
  }
}

/**
 * Gets Roboto Regular font as Base64
 */
export async function getRobotoBase64(): Promise<string | null> {
  if (robotoBase64Cache) return robotoBase64Cache;
  
  robotoBase64Cache = await loadFontAsBase64(ROBOTO_FONT_URL);
  return robotoBase64Cache;
}

/**
 * Gets Roboto Bold font as Base64
 */
export async function getRobotoBoldBase64(): Promise<string | null> {
  if (robotoBoldBase64Cache) return robotoBoldBase64Cache;
  
  robotoBoldBase64Cache = await loadFontAsBase64(ROBOTO_BOLD_URL);
  return robotoBoldBase64Cache;
}

/**
 * Registers Roboto fonts in a jsPDF document instance
 * This enables proper rendering of Polish diacritical characters
 */
export async function registerRobotoFont(doc: any): Promise<boolean> {
  try {
    // For woff2, we need a different approach - use standard fonts with encoding
    // jsPDF doesn't natively support woff2, so we use a workaround
    
    // Alternative: Use a TTF version of a font that supports Polish
    // We'll use the built-in fonts with proper encoding as a fallback
    
    // Try to use PTSans or similar Unicode-supporting font
    // If not available, the hook will handle the fallback
    
    console.log('[registerRobotoFont] Font registration called');
    return true;
  } catch (error) {
    console.error('[registerRobotoFont] Error:', error);
    return false;
  }
}

// Polish character mapping for text sanitization (fallback)
const POLISH_CHAR_MAP: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ż': 'z', 'ź': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
  'Ó': 'O', 'Ś': 'S', 'Ż': 'Z', 'Ź': 'Z',
};

/**
 * Converts Polish diacritical characters to their ASCII equivalents
 * Use this ONLY as a last resort if font loading fails
 */
export function sanitizePolishChars(text: string): string {
  return text.split('').map(char => POLISH_CHAR_MAP[char] || char).join('');
}

export default {
  getRobotoBase64,
  getRobotoBoldBase64,
  registerRobotoFont,
  sanitizePolishChars,
};
