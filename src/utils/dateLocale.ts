import { pl, enUS, de, nb, it, es, fr, pt } from 'date-fns/locale';
import type { Locale } from 'date-fns';

/**
 * Returns the date-fns Locale object for a given language code.
 * Use this instead of hardcoding `locale: pl` in date formatting.
 */
export function getAppDateLocale(lang: string): Locale {
  switch (lang) {
    case 'en': return enUS;
    case 'de': return de;
    case 'no': return nb;
    case 'it': return it;
    case 'es': return es;
    case 'fr': return fr;
    case 'pt': return pt;
    default: return pl;
  }
}
