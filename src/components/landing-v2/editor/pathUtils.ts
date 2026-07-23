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

/** Widget helpers — operate on content.widgets (top-level list). */
import type { Widget } from '@/types/homepageV2';

export function addWidget(content: HomepageV2Content, widget: Widget): HomepageV2Content {
  const clone = JSON.parse(JSON.stringify(content));
  clone.widgets = Array.isArray(clone.widgets) ? [...clone.widgets, widget] : [widget];
  return clone;
}

export function removeWidgetAt(content: HomepageV2Content, index: number): HomepageV2Content {
  const clone = JSON.parse(JSON.stringify(content));
  const list = Array.isArray(clone.widgets) ? clone.widgets : [];
  clone.widgets = list.filter((_: any, i: number) => i !== index);
  return clone;
}

export function moveWidget(content: HomepageV2Content, index: number, dir: -1 | 1): HomepageV2Content {
  const clone = JSON.parse(JSON.stringify(content));
  const list: Widget[] = Array.isArray(clone.widgets) ? clone.widgets : [];
  const j = index + dir;
  if (j < 0 || j >= list.length) return content;
  [list[index], list[j]] = [list[j], list[index]];
  clone.widgets = list;
  return clone;
}

export function duplicateWidget(content: HomepageV2Content, index: number): HomepageV2Content {
  const clone = JSON.parse(JSON.stringify(content));
  const list: Widget[] = Array.isArray(clone.widgets) ? clone.widgets : [];
  const copy: Widget = JSON.parse(JSON.stringify(list[index]));
  copy.id = uid();
  if (copy.children) copy.children = copy.children.map((c) => ({ ...c, id: uid() }));
  list.splice(index + 1, 0, copy);
  clone.widgets = list;
  return clone;
}

/** Return index of top-level widget if the path is `widgets.<i>` or nested `widgets.<i>...`. */
export function parseWidgetIndex(path: string): number | null {
  const m = path.match(/^widgets\.(\d+)$/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

