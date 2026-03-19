/**
 * Utility to parse image shape from URL hash and return CSS classes.
 * Shape is encoded as #shape=<id> in the image URL.
 */

const SHAPE_CSS: Record<string, string> = {
  circle: 'rounded-full aspect-square object-cover',
  oval_h: 'rounded-full aspect-video object-cover',
  oval_v: 'rounded-full aspect-[9/16] object-cover',
  square: 'aspect-square object-cover',
  h16_9: 'object-contain',
  h4_3: 'object-cover aspect-[4/3]',
  v9_16: 'object-cover aspect-[9/16]',
  v3_4: 'object-cover aspect-[3/4]',
  free: 'object-contain',
};

export function parseShapeFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/#shape=(\w+)/);
  return match ? match[1] : null;
}

export function stripShapeHash(url: string): string {
  if (!url) return url;
  return url.replace(/#shape=\w+/, '');
}

export function getImageShapeClasses(url: string): string {
  const shape = parseShapeFromUrl(url);
  if (!shape) return 'object-contain';
  return SHAPE_CSS[shape] || 'object-contain';
}
