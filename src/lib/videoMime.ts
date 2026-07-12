/**
 * Wnioskuje MIME wideo z URL / nazwy pliku.
 * Ma jawnie zaznaczać `<source type>` przy `<video>`, żeby iOS Safari
 * nie odrzucał strumienia z serwera, który zwraca `application/octet-stream`.
 */
export function videoMime(url: string): string {
  const ext = (url.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
  if (ext === 'webm') return 'video/webm';
  if (ext === 'ogv' || ext === 'ogg') return 'video/ogg';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'm4v') return 'video/mp4';
  return 'video/mp4';
}

/**
 * Rozszerzenia wideo, o których wiadomo, że iOS Safari ich nie odtworzy.
 */
export const IOS_UNSUPPORTED_VIDEO_EXTS = ['webm', 'mkv', 'avi', 'wmv', 'flv', 'ogv'];

export function isLikelyIosIncompatible(fileName: string): boolean {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return IOS_UNSUPPORTED_VIDEO_EXTS.includes(ext);
}
