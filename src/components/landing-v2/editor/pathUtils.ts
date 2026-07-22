import type { HomepageV2Content } from '@/types/homepageV2';

/** Parse "a.b[2].c" → ["a","b","2","c"] */
function parts(path: string): string[] {
  return path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
}

export function getByPath(obj: any, path: string): any {
  const p = parts(path);
  let cur = obj;
  for (const k of p) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return cur;
}

export function setByPath<T = any>(obj: T, path: string, value: any): T {
  const p = parts(path);
  const clone = JSON.parse(JSON.stringify(obj));
  let cur: any = clone;
  for (let i = 0; i < p.length - 1; i++) {
    const k = p[i];
    if (cur[k] == null) cur[k] = /^\d+$/.test(p[i + 1]) ? [] : {};
    cur = cur[k];
  }
  cur[p[p.length - 1]] = value;
  return clone;
}

export function getStyle(content: HomepageV2Content, path: string) {
  return content.styles?.[path] || {};
}

export function updateStyle(
  content: HomepageV2Content,
  path: string,
  patch: Record<string, any>,
): HomepageV2Content {
  const clone = JSON.parse(JSON.stringify(content));
  clone.styles = clone.styles || {};
  const cur = clone.styles[path] || {};
  const next = { ...cur, ...patch };
  // strip empties
  Object.keys(next).forEach((k) => {
    if (next[k] === '' || next[k] == null) delete next[k];
  });
  clone.styles[path] = next;
  return clone;
}

/** Return the parent list path and index if path ends with [i]. */
export function parseListItemPath(
  path: string,
): { listPath: string; index: number } | null {
  const m = path.match(/^(.+)\[(\d+)\]$/);
  if (!m) return null;
  return { listPath: m[1], index: parseInt(m[2], 10) };
}

export const uid = () => Math.random().toString(36).slice(2, 10);
