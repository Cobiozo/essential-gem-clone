export interface ParsedElement {
  id: string;
  tagName: string;
  textContent: string;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  children: ParsedElement[];
  path: number[];
}

export interface ElementSelection {
  element: ParsedElement | null;
  path: number[];
}

export type ElementType = 
  | 'heading' 
  | 'text' 
  | 'link' 
  | 'image' 
  | 'button' 
  | 'container' 
  | 'icon'
  | 'list'
  | 'unknown';

export const getElementType = (tagName: string): ElementType => {
  const tag = tagName.toLowerCase();
  
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return 'heading';
  if (['p', 'span', 'strong', 'em', 'b', 'i', 'u'].includes(tag)) return 'text';
  if (tag === 'a') return 'link';
  if (tag === 'img') return 'image';
  if (tag === 'button') return 'button';
  if (['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside'].includes(tag)) return 'container';
  if (['ul', 'ol', 'li'].includes(tag)) return 'list';
  if (tag === 'i' || tag === 'svg') return 'icon';
  
  return 'unknown';
};
