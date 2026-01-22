import React, { useState, useRef, useEffect } from 'react';
import { ParsedElement, getElementType } from './types';
import { cn } from '@/lib/utils';

interface HtmlElementRendererProps {
  element: ParsedElement;
  selectedId: string | null;
  hoveredId: string | null;
  editingId?: string | null;
  onSelect: (element: ParsedElement) => void;
  onHover: (id: string | null) => void;
  onStartEdit?: (id: string) => void;
  onEndEdit?: (id: string, newContent: string) => void;
  depth?: number;
  showOutlines?: boolean;
}

// Editable text tags
const EDITABLE_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'li', 'td', 'th', 'label', 'strong', 'em', 'b', 'i', 'u'];

export const HtmlElementRenderer: React.FC<HtmlElementRendererProps> = ({
  element,
  selectedId,
  hoveredId,
  editingId,
  onSelect,
  onHover,
  onStartEdit,
  onEndEdit,
  depth = 0,
  showOutlines
}) => {
  const isSelected = selectedId === element.id;
  const isHovered = hoveredId === element.id && !isSelected;
  const isEditing = editingId === element.id;
  const elementType = getElementType(element.tagName);
  const editableRef = useRef<HTMLElement>(null);
  const [localContent, setLocalContent] = useState(element.textContent);
  
  const isTextEditable = EDITABLE_TAGS.includes(element.tagName.toLowerCase());
  
  // Reset local content when element changes
  useEffect(() => {
    setLocalContent(element.textContent);
  }, [element.textContent]);
  
  // Focus when entering edit mode
  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      onSelect(element);
    }
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTextEditable && onStartEdit) {
      onStartEdit(element.id);
    }
  };
  
  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      onHover(element.id);
    }
  };
  
  const handleMouseLeave = () => {
    if (!isEditing) {
      onHover(null);
    }
  };
  
  const handleBlur = () => {
    if (isEditing && onEndEdit && editableRef.current) {
      const newContent = editableRef.current.innerText;
      onEndEdit(element.id, newContent);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Reset to original
        if (editableRef.current) {
          editableRef.current.innerText = element.textContent;
        }
        onEndEdit?.(element.id, element.textContent);
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        // For headings and single-line elements, save on Enter
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'label'].includes(element.tagName.toLowerCase())) {
          e.preventDefault();
          handleBlur();
        }
      }
    }
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
      return (
        <div className="inline-flex items-center justify-center w-6 h-6 bg-muted rounded">
          <span className="text-xs text-muted-foreground">
            {element.attributes['data-lucide']}
          </span>
        </div>
      );
    }
    
    // For editing mode - render just the text
    if (isEditing) {
      return null; // Content handled by contentEditable
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
            editingId={editingId}
            onSelect={onSelect}
            onHover={onHover}
            onStartEdit={onStartEdit}
            onEndEdit={onEndEdit}
            depth={depth + 1}
            showOutlines={showOutlines}
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
    'relative transition-all duration-150',
    !isEditing && 'cursor-pointer',
    isSelected && !isEditing && 'ring-2 ring-blue-500 ring-offset-1',
    isEditing && 'ring-2 ring-green-500 ring-offset-1',
    isHovered && !isEditing && 'ring-2 ring-primary/30 ring-offset-1',
    !isInline && 'block'
  );
  
  // Get element type badge
  const getTypeBadge = () => {
    if (!isSelected && !isHovered && !isEditing) return null;
    
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
          isEditing ? "bg-green-500 text-white" : 
          isSelected ? "bg-blue-500 text-white" : 
          "bg-primary/20 text-primary"
        )}
      >
        {isEditing ? '✎ Edycja' : badges[elementType]} ({element.tagName})
      </span>
    );
  };
  
  // Common props for the tag
  const tagProps: any = {
    ref: editableRef as any,
    className: element.attributes.class,
    style: inlineStyles,
    'data-element-id': element.id,
    ...(element.tagName === 'a' ? { href: '#' } : {}),
  };
  
  // Add contentEditable props when editing
  if (isEditing && isTextEditable) {
    tagProps.contentEditable = true;
    tagProps.suppressContentEditableWarning = true;
    tagProps.onBlur = handleBlur;
    tagProps.onKeyDown = handleKeyDown;
  }
  
  return (
    <div
      className={wrapperClasses}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {getTypeBadge()}
      {isEditing && isTextEditable ? (
        <Tag {...tagProps}>
          {localContent}
        </Tag>
      ) : (
        <Tag {...tagProps}>
          {renderContent()}
        </Tag>
      )}
      {isTextEditable && isSelected && !isEditing && (
        <div className="absolute -bottom-5 left-0 text-[9px] text-muted-foreground">
          Kliknij dwukrotnie, aby edytować tekst
        </div>
      )}
    </div>
  );
};
