import React, { useState, useCallback } from 'react';
import { CMSItem } from '@/types/cms';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { icons } from 'lucide-react';
import { ChevronDown } from 'lucide-react';

interface ToggleContainerElementProps {
  item: CMSItem;
  childItems: CMSItem[];
  defaultExpanded: boolean;
  buttonIcon: string;
  buttonText: string;
  buttonPosition: 'left' | 'center' | 'right';
  isEditMode?: boolean;
  onClick?: (title: string, url?: string) => void;
}

export const ToggleContainerElement: React.FC<ToggleContainerElementProps> = ({
  item,
  childItems,
  defaultExpanded,
  buttonIcon,
  buttonText,
  buttonPosition,
  isEditMode = false,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

  // Get icon component
  const IconComponent = (icons as any)[buttonIcon] || ChevronDown;

  const positionClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const containerStyles: React.CSSProperties = {
    backgroundColor: item.background_color || undefined,
    borderRadius: item.border_radius ? `${item.border_radius}px` : undefined,
    marginTop: item.margin_top ? `${item.margin_top}px` : undefined,
    marginBottom: item.margin_bottom ? `${item.margin_bottom}px` : undefined,
    padding: item.padding ? `${item.padding}px` : undefined,
    borderWidth: item.border_width ? `${item.border_width}px` : undefined,
    borderColor: item.border_color || undefined,
    borderStyle: item.border_style || undefined,
    boxShadow: item.box_shadow || undefined,
    opacity: item.opacity ? item.opacity / 100 : undefined,
  };

  const handleContainerClick = useCallback(() => {
    if (onClick) {
      onClick(buttonText || 'Toggle', undefined);
    }
  }, [onClick, buttonText]);

  return (
    <div 
      className={cn(
        "toggle-container w-full",
        isEditMode && "outline-dashed outline-2 outline-muted-foreground/30"
      )}
      style={containerStyles}
      onClick={handleContainerClick}
    >
      {/* Toggle Button */}
      <div className={cn("flex w-full mb-2", positionClasses[buttonPosition])}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className={cn(
            "flex items-center gap-2 transition-all",
            !buttonText && "p-2"
          )}
        >
          <IconComponent 
            className={cn(
              "w-5 h-5 transition-transform duration-200",
              isExpanded && "rotate-180"
            )} 
          />
          {buttonText && <span>{buttonText}</span>}
        </Button>
      </div>

      {/* Collapsible Content Area */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="pt-2">
          {isEditMode ? (
            <div className={cn(
              "min-h-[60px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center",
              childItems.length === 0 && "p-4"
            )}>
              {childItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                  Przeciągnij tutaj elementy
                </p>
              ) : (
                <div className="w-full p-2 space-y-2">
                  {childItems.map((child, index) => (
                    <div key={child.id || index} className="p-2 bg-muted/50 rounded text-sm">
                      {child.type}: {child.title || 'Bez tytułu'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {childItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Brak zawartości</p>
              ) : (
                childItems.map((child, index) => (
                  <div key={child.id || index}>
                    {/* Tu będzie renderowanie elementów potomnych */}
                    <div className="p-2 bg-muted/30 rounded">
                      {child.title || child.description || child.type}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Always visible hint in edit mode when collapsed */}
      {isEditMode && !isExpanded && (
        <div className="text-xs text-muted-foreground text-center mt-1">
          Kliknij przycisk aby pokazać/ukryć zawartość
        </div>
      )}
    </div>
  );
};