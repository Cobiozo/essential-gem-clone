/**
 * Normalizacja adresów plików multimedialnych (wideo, obrazy) serwowanych przez
 * serwer plików Express (`/uploads/...`).
 *
 * Dwa realne problemy, które ta funkcja rozwiązuje:
 * 1. Stara domena `purelife.info.pl` nie istnieje już w DNS (NXDOMAIN), a część
 *    rekordów w bazie wciąż wskazuje na nią — pliki fizycznie leżą na
 *    `purelifecenter.pl` pod tą samą ścieżką.
 * 2. Adresy względne `/uploads/...` działają wyłącznie na hoście, który serwuje
 *    pliki. Na podglądzie/innej domenie zwracają HTML aplikacji zamiast wideo,
 *    co w Safari kończy się komunikatem o niemożności odtworzenia pliku.
 */

export const MEDIA_ORIGIN = 'https://purelifecenter.pl';
const MEDIA_HOST = 'purelifecenter.pl';
const LEGACY_MEDIA_HOSTS = ['purelife.info.pl', 'www.purelife.info.pl'];

function servesUploadsLocally(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === MEDIA_HOST || h.endsWith(`.${MEDIA_HOST}`);
}

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  const value = url.trim();
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;

  // Ścieżka względna z serwera plików
  if (value.startsWith('/uploads/')) {
    return servesUploadsLocally() ? value : `${MEDIA_ORIGIN}${value}`;
  }

  if (!/^https?:\/\//i.test(value)) return value;

  try {
    const parsed = new URL(value);
    if (LEGACY_MEDIA_HOSTS.includes(parsed.hostname.toLowerCase())) {
      parsed.protocol = 'https:';
      parsed.hostname = MEDIA_HOST;
      return parsed.toString();
    }
    return value;
  } catch {
    return value;
  }
}

/**
 * Wersja używana przy ZAPISIE adresu do bazy: zawsze zwraca pełny, kanoniczny
 * URL (nigdy względnego `/uploads/...` ani martwej domeny), więc rekord nie
 * zależy od domeny przeglądarki, na której wykonano upload.
 */
export function toCanonicalMediaUrl(url?: string | null): string {
  if (!url) return '';
  const value = url.trim();
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;

  if (value.startsWith('/uploads/')) return `${MEDIA_ORIGIN}${value}`;

  if (!/^https?:\/\//i.test(value)) return value;

  try {
    const parsed = new URL(value);
    if (LEGACY_MEDIA_HOSTS.includes(parsed.hostname.toLowerCase())) {
      parsed.protocol = 'https:';
      parsed.hostname = MEDIA_HOST;
      return parsed.toString();
    }
    return value;
  } catch {
    return value;
  }
}
