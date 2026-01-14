// Roboto font in Base64 format for jsPDF
// This font supports Polish diacritical characters (ąćęłńóśżź)

// Using TTF fonts - jsPDF only supports TTF, not WOFF2
// DejaVu Sans supports full Latin Extended (Polish, Czech, etc.)
const DEJAVU_TTF_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf';
const DEJAVU_BOLD_TTF_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf';

// Fallback: Roboto from Google Fonts CDN (TTF format)
const ROBOTO_FALLBACK_URL = 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf';
const ROBOTO_BOLD_FALLBACK_URL = 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf';

// Cache for loaded fonts
let regularBase64Cache: string | null = null;
let boldBase64Cache: string | null = null;

/**
 * Loads and converts a font URL to Base64 format for jsPDF
 */
async function loadFontAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { 
      mode: 'cors',
      cache: 'force-cache'
    });
    if (!response.ok) {
      console.warn(`[loadFontAsBase64] Failed to load font from ${url}: ${response.status}`);
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
    console.error('[loadFontAsBase64] Error loading font:', error);
    return null;
  }
}

/**
 * Gets Regular font as Base64 (tries DejaVu first, then Roboto)
 */
export async function getRobotoBase64(): Promise<string | null> {
  if (regularBase64Cache) return regularBase64Cache;
  
  // Try DejaVu first (better Polish support)
  regularBase64Cache = await loadFontAsBase64(DEJAVU_TTF_URL);
  
  // Fallback to Roboto
  if (!regularBase64Cache) {
    console.log('[getRobotoBase64] DejaVu failed, trying Roboto fallback...');
    regularBase64Cache = await loadFontAsBase64(ROBOTO_FALLBACK_URL);
  }
  
  return regularBase64Cache;
}

/**
 * Gets Bold font as Base64 (tries DejaVu first, then Roboto)
 */
export async function getRobotoBoldBase64(): Promise<string | null> {
  if (boldBase64Cache) return boldBase64Cache;
  
  boldBase64Cache = await loadFontAsBase64(DEJAVU_BOLD_TTF_URL);
  
  if (!boldBase64Cache) {
    console.log('[getRobotoBoldBase64] DejaVu Bold failed, trying Roboto fallback...');
    boldBase64Cache = await loadFontAsBase64(ROBOTO_BOLD_FALLBACK_URL);
  }
  
  return boldBase64Cache;
}

/**
 * Registers Unicode fonts in a jsPDF document instance
 * This enables proper rendering of Polish diacritical characters
 * @returns true if font was successfully registered
 */
export async function registerRobotoFont(doc: any): Promise<boolean> {
  try {
    console.log('[registerRobotoFont] Starting font registration...');
    
    const regularBase64 = await getRobotoBase64();
    const boldBase64 = await getRobotoBoldBase64();
    
    if (regularBase64) {
      doc.addFileToVFS('Unicode-Regular.ttf', regularBase64);
      doc.addFont('Unicode-Regular.ttf', 'Unicode', 'normal');
      console.log('[registerRobotoFont] ✅ Regular font registered');
    }
    
    if (boldBase64) {
      doc.addFileToVFS('Unicode-Bold.ttf', boldBase64);
      doc.addFont('Unicode-Bold.ttf', 'Unicode', 'bold');
      console.log('[registerRobotoFont] ✅ Bold font registered');
    }
    
    if (regularBase64) {
      // Set as default font
      doc.setFont('Unicode', 'normal');
      console.log('[registerRobotoFont] ✅ Unicode font set as default');
      return true;
    }
    
    console.warn('[registerRobotoFont] ⚠️ Could not load any Unicode font');
    return false;
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
