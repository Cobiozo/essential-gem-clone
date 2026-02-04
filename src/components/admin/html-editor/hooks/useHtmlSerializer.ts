import { useCallback } from 'react';
import { ParsedElement } from '../types';

const stylesToString = (styles: Record<string, string>): string => {
  return Object.entries(styles)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${kebabKey}: ${value}`;
    })
    .join('; ');
};

const serializeElement = (element: ParsedElement): string => {
  const { tagName, textContent, attributes, styles, children } = element;
  
  // Build attributes string
  const attrParts: string[] = [];
  
  Object.entries(attributes).forEach(([key, value]) => {
    // Skip empty src for video (don't render src="")
    if (tagName === 'video' && key === 'src' && !value) {
      return;
    }
    if (value) {
      attrParts.push(`${key}="${value}"`);
    }
  });
  
  // Special handling for video - always add controls and controlslist
  if (tagName === 'video') {
    if (!attrParts.some(a => a.startsWith('controls'))) {
      attrParts.push('controls');
    }
    if (!attrParts.some(a => a.includes('controlslist'))) {
      attrParts.push('controlslist="nodownload"');
    }
  }
  
  const styleString = stylesToString(styles);
  if (styleString) {
    attrParts.push(`style="${styleString}"`);
  }
  
  const attrsStr = attrParts.length > 0 ? ' ' + attrParts.join(' ') : '';
  
  // Self-closing tags
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagName);
  
  if (selfClosing) {
    return `<${tagName}${attrsStr} />`;
  }
  
  // Build content
  let content = '';
  
  if (textContent) {
    content += textContent;
  }
  
  if (children.length > 0) {
    content += children.map(child => serializeElement(child)).join('\n');
  }
  
  return `<${tagName}${attrsStr}>${content}</${tagName}>`;
};

export const useHtmlSerializer = () => {
  const serialize = useCallback((elements: ParsedElement[]): string => {
    return elements.map(el => serializeElement(el)).join('\n');
  }, []);
  
  return { serialize };
};

export const serializeElementsToHtml = (elements: ParsedElement[]): string => {
  return elements.map(el => serializeElement(el)).join('\n');
};
