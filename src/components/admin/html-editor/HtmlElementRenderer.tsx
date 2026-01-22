import React from 'react';
import { ParsedElement, getElementType } from './types';
import { cn } from '@/lib/utils';

interface HtmlElementRendererProps {
  element: ParsedElement;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (element: ParsedElement) => void;
  onHover: (id: string | null) => void;
  depth?: number;
  showOutlines?: boolean;
}

export const HtmlElementRenderer: React.FC<HtmlElementRendererProps> = ({
  element,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  depth = 0
}) => {
  const isSelected = selectedId === element.id;
  const isHovered = hoveredId === element.id && !isSelected;
  const elementType = getElementType(element.tagName);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(element);
  };
  
  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHover(element.id);
  };
  
  const handleMouseLeave = () => {
    onHover(null);
  };
  
  // Build inline styles from parsed styles
  const inlineStyles: React.CSSProperties = {};
  Object.entries(element.styles).forEach(([key, value]) => {
    (inlineStyles as any)[key] = value;
  });
  
  // Render content
  const renderContent = () => {
    if (element.tagName === 'img') {
      return (
        <img 
          src={element.attributes.src || '/placeholder.svg'} 
          alt={element.attributes.alt || ''} 
          className={element.attributes.class}
          style={inlineStyles}
        />
      );
    }
    
    if (element.tagName === 'i' && element.attributes['data-lucide']) {
      // Lucide icon placeholder
      return (
        <div className="inline-flex items-center justify-center w-6 h-6 bg-muted rounded">
          <span className="text-xs text-muted-foreground">
            {element.attributes['data-lucide']}
          </span>
        </div>
      );
    }
    
    return (
      <>
        {element.textContent}
        {element.children.map((child) => (
          <HtmlElementRenderer
            key={child.id}
            element={child}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={onSelect}
            onHover={onHover}
            depth={depth + 1}
          />
        ))}
      </>
    );
  };
  
  // Create the appropriate HTML element
  const Tag = element.tagName as keyof JSX.IntrinsicElements;
  
  // Don't wrap certain elements
  const isInline = ['span', 'strong', 'em', 'b', 'i', 'u', 'a'].includes(element.tagName);
  
  const wrapperClasses = cn(
    'relative transition-all duration-150 cursor-pointer',
    isSelected && 'ring-2 ring-blue-500 ring-offset-1',
    isHovered && 'ring-2 ring-primary/30 ring-offset-1',
    !isInline && 'block'
  );
  
  // Get element type badge
  const getTypeBadge = () => {
    if (!isSelected && !isHovered) return null;
    
    const badges: Record<string, string> = {
      heading: 'Nagłówek',
      text: 'Tekst',
      link: 'Link',
      image: 'Obrazek',
      button: 'Przycisk',
      container: 'Kontener',
      icon: 'Ikona',
      list: 'Lista',
      unknown: element.tagName.toUpperCase()
    };
    
    return (
      <span 
        className={cn(
          "absolute -top-5 left-0 text-[10px] px-1.5 py-0.5 rounded font-medium z-10",
          isSelected ? "bg-blue-500 text-white" : "bg-primary/20 text-primary"
        )}
      >
        {badges[elementType]} ({element.tagName})
      </span>
    );
  };
  
  return (
    <div
      className={wrapperClasses}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {getTypeBadge()}
      <Tag 
        className={element.attributes.class} 
        style={inlineStyles}
        {...(element.tagName === 'a' ? { href: '#' } : {})}
      >
        {renderContent()}
      </Tag>
    </div>
  );
};
