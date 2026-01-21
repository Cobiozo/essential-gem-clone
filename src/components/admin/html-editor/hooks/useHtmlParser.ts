import { useMemo } from 'react';
import { ParsedElement } from '../types';

const generateId = (): string => {
  return `el-${Math.random().toString(36).substr(2, 9)}`;
};

const parseStyles = (styleString: string): Record<string, string> => {
  if (!styleString) return {};
  
  const styles: Record<string, string> = {};
  styleString.split(';').forEach(style => {
    const [property, value] = style.split(':').map(s => s.trim());
    if (property && value) {
      // Convert kebab-case to camelCase
      const camelProperty = property.replace(/-([a-z])/g, g => g[1].toUpperCase());
      styles[camelProperty] = value;
    }
  });
  return styles;
};

const parseElement = (node: Element, path: number[] = []): ParsedElement | null => {
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  
  const tagName = node.tagName.toLowerCase();
  
  // Skip script and style tags
  if (['script', 'style', 'link', 'meta'].includes(tagName)) return null;
  
  const attributes: Record<string, string> = {};
  Array.from(node.attributes).forEach(attr => {
    attributes[attr.name] = attr.value;
  });
  
  const styles = parseStyles(attributes.style || '');
  delete attributes.style;
  
  const children: ParsedElement[] = [];
  let textContent = '';
  
  Array.from(node.childNodes).forEach((child, index) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim() || '';
      if (text) {
        textContent += (textContent ? ' ' : '') + text;
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const parsedChild = parseElement(child as Element, [...path, index]);
      if (parsedChild) {
        children.push(parsedChild);
      }
    }
  });
  
  return {
    id: generateId(),
    tagName,
    textContent,
    attributes,
    styles,
    children,
    path
  };
};

export const useHtmlParser = (htmlContent: string) => {
  return useMemo(() => {
    if (!htmlContent) return [];
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      const elements: ParsedElement[] = [];
      Array.from(doc.body.children).forEach((child, index) => {
        const parsed = parseElement(child, [index]);
        if (parsed) {
          elements.push(parsed);
        }
      });
      
      return elements;
    } catch (error) {
      console.error('Error parsing HTML:', error);
      return [];
    }
  }, [htmlContent]);
};

export const parseHtmlToElements = (htmlContent: string): ParsedElement[] => {
  if (!htmlContent) return [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    const elements: ParsedElement[] = [];
    Array.from(doc.body.children).forEach((child, index) => {
      const parsed = parseElement(child, [index]);
      if (parsed) {
        elements.push(parsed);
      }
    });
    
    return elements;
  } catch (error) {
    console.error('Error parsing HTML:', error);
    return [];
  }
};
