import React, { useState, useRef, useEffect } from 'react';
import { ParsedElement, getElementType } from './types';
import { cn } from '@/lib/utils';
import { ResizableImageWrapper } from './ResizableImageWrapper';
import { MarginHandle } from './MarginHandle';
import { Video } from 'lucide-react';

interface HtmlElementRendererProps {
  element: ParsedElement;
  selectedId: string | null;
  hoveredId: string | null;
  editingId?: string | null;
  onSelect: (element: ParsedElement) => void;
  onHover: (id: string | null) => void;
  onStartEdit?: (id: string) => void;
  onEndEdit?: (id: string, newContent: string) => void;
  onUpdate?: (updates: Partial<ParsedElement>) => void;
  isEditMode?: boolean;
  depth?: number;
  showOutlines?: boolean;
  renderChildren?: () => React.ReactNode;
}

// Editable text tags
const EDITABLE_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'li', 'td', 'th', 'label', 'strong', 'em', 'b', 'i', 'u'];

// Void elements - cannot have children in React
const VOID_ELEMENTS = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];

const HtmlElementRendererInner: React.FC<HtmlElementRendererProps> = ({
  element,
  selectedId,
  hoveredId,
  editingId,
  onSelect,
  onHover,
  onStartEdit,
  onEndEdit,
  onUpdate,
  isEditMode = true,
  depth = 0,
  showOutlines,
  renderChildren
}) => {
  const isSelected = selectedId === element.id;
  const isHovered = hoveredId === element.id && !isSelected;
  const isEditing = editingId === element.id;
  const elementType = getElementType(element.tagName);
  const editableRef = useRef<HTMLElement>(null);
  const [localContent, setLocalContent] = useState(element.textContent);
  
  const isTextEditable = EDITABLE_TAGS.includes(element.tagName.toLowerCase());
  const isVoidElement = VOID_ELEMENTS.includes(element.tagName.toLowerCase());
  
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
  
  // Handle resize for images
  const handleImageResize = (width: string, height: string) => {
    if (onUpdate) {
      onUpdate({
        styles: {
          ...element.styles,
          width,
          height
        }
      });
    }
  };
  
  // Render content
  const renderContent = () => {
    if (element.tagName === 'img') {
      const imgElement = (
        <img 
          src={element.attributes.src || '/placeholder.svg'} 
          alt={element.attributes.alt || ''} 
          className={element.attributes.class}
          style={{ ...inlineStyles, width: '100%', height: '100%', objectFit: inlineStyles.objectFit as any || 'cover' }}
        />
      );
      
      // Wrap in resizable wrapper when in edit mode
      if (isEditMode && onUpdate) {
        return (
          <ResizableImageWrapper
            isSelected={isSelected}
            isEditMode={isEditMode}
            currentWidth={element.styles.width}
            currentHeight={element.styles.height}
            onResize={handleImageResize}
          >
            {imgElement}
          </ResizableImageWrapper>
        );
      }
      
      return imgElement;
    }
    
    // Dedicated video rendering
    if (element.tagName === 'video') {
      const videoSrc = element.attributes.src;
      
      // Show placeholder if no src
      if (!videoSrc) {
        return (
          <div className="flex items-center justify-center bg-muted/50 border-2 border-dashed rounded-lg p-8">
            <div className="text-center text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Wybierz wideo w panelu Media</p>
            </div>
          </div>
        );
      }
      
      return (
        <video 
          src={videoSrc}
          controls
          className={element.attributes.class}
          style={{ ...inlineStyles, maxWidth: '100%' }}
        >
          Twoja przeglądarka nie obsługuje wideo.
        </video>
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
    
    // If custom renderChildren is provided (for nested drag-drop), use it
    if (renderChildren) {
      return (
        <>
          {element.textContent}
          {renderChildren()}
        </>
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
      {/* Margin handle for selected elements */}
      {isEditMode && isSelected && onUpdate && (
        <MarginHandle
          currentMargin={element.styles.marginTop || '0px'}
          onMarginChange={(newMargin) => {
            onUpdate({
              styles: { ...element.styles, marginTop: newMargin }
            });
          }}
          isVisible={isSelected}
        />
      )}
      {getTypeBadge()}
      {isVoidElement ? (
        // Void elements (img, br, hr, etc.) - render without children wrapper
        renderContent()
      ) : isEditing && isTextEditable ? (
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

// React.memo with custom comparator to prevent unnecessary re-renders
export const HtmlElementRenderer = React.memo(HtmlElementRendererInner, (prevProps, nextProps) => {
  // Re-render only when these specific things change
  return (
    prevProps.element.id === nextProps.element.id &&
    prevProps.selectedId === nextProps.selectedId &&
    prevProps.hoveredId === nextProps.hoveredId &&
    prevProps.editingId === nextProps.editingId &&
    prevProps.isEditMode === nextProps.isEditMode &&
    prevProps.showOutlines === nextProps.showOutlines &&
    prevProps.depth === nextProps.depth &&
    // Deep compare styles and attributes for actual content changes
    JSON.stringify(prevProps.element.styles) === JSON.stringify(nextProps.element.styles) &&
    JSON.stringify(prevProps.element.attributes) === JSON.stringify(nextProps.element.attributes) &&
    prevProps.element.textContent === nextProps.element.textContent &&
    prevProps.element.children.length === nextProps.element.children.length
  );
});
