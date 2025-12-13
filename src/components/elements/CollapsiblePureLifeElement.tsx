import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CMSItem } from '@/types/cms';
import { CMSContent } from '@/components/CMSContent';
import { cn } from '@/lib/utils';

interface CollapsiblePureLifeElementProps {
  item: CMSItem;
  isEditMode?: boolean;
  nestedItems?: CMSItem[];
  onClick?: (title: string, url?: string) => void;
}

export const CollapsiblePureLifeElement: React.FC<CollapsiblePureLifeElementProps> = ({ 
  item, 
  isEditMode = false,
  nestedItems = [],
  onClick 
}) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Sprawdź czy sekcja ma być domyślnie rozwinięta
    const cells = item.cells as any[];
    return cells?.[0]?.defaultExpanded ?? false;
  });

  // Styl kontenera
  const containerStyle: React.CSSProperties = {
    width: '100%',
  };
  if (item.background_color) containerStyle.backgroundColor = item.background_color;
  if (item.border_radius) containerStyle.borderRadius = `${item.border_radius}px`;
  if (item.margin_top) containerStyle.marginTop = `${item.margin_top}px`;
  if (item.margin_bottom) containerStyle.marginBottom = `${item.margin_bottom}px`;
  if (item.padding) containerStyle.padding = `${item.padding}px`;
  if (item.border_width) {
    containerStyle.borderWidth = `${item.border_width}px`;
    containerStyle.borderStyle = (item.border_style || 'solid') as React.CSSProperties['borderStyle'];
    containerStyle.borderColor = item.border_color || 'hsl(var(--border))';
  }
  if (item.box_shadow) containerStyle.boxShadow = item.box_shadow;
  if (item.opacity !== undefined && item.opacity !== 100) {
    containerStyle.opacity = item.opacity / 100;
  }

  // Styl nagłówka
  const headerStyle: React.CSSProperties = {};
  if (item.text_color) headerStyle.color = item.text_color;
  if (item.font_size) headerStyle.fontSize = `${item.font_size}px`;
  if (item.font_weight) headerStyle.fontWeight = item.font_weight;

  const cells = item.cells as any[];
  const cell = cells?.[0];
  const title = cell?.content || item.title || 'Sekcja zwijana';
  const description = cell?.description || item.description;

  // Pobierz zagnieżdżone elementy z cells jeśli są
  const contentItems = cell?.items || nestedItems;

  return (
    <div 
      className={cn(
        "w-full rounded-lg border border-border bg-card overflow-hidden transition-all duration-300",
        item.style_class
      )}
      style={containerStyle}
    >
      {/* Nagłówek - klikalny */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-muted/30 transition-colors text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex-1 min-w-0">
          <h3 
            className="font-semibold text-base sm:text-lg"
            style={headerStyle}
            dangerouslySetInnerHTML={{ __html: title }}
          />
          {description && !isExpanded && (
            <p 
              className="text-sm text-muted-foreground mt-1 line-clamp-1"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}
        </div>
        <ChevronDown 
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 ml-4",
            isExpanded && "rotate-180"
          )} 
        />
      </button>

      {/* Zawartość - zwijana z animacją */}
      <div 
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
            {/* Opis jeśli istnieje */}
            {description && (
              <p 
                className="text-sm text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            )}
            
            {/* Zagnieżdżone elementy */}
            {contentItems && contentItems.length > 0 ? (
              <div className="space-y-4">
                {contentItems.map((nestedItem: CMSItem) => (
                  <CMSContent 
                    key={nestedItem.id} 
                    item={nestedItem} 
                    onClick={onClick}
                    isEditMode={isEditMode}
                  />
                ))}
              </div>
            ) : isEditMode ? (
              <div className="border border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Dodaj elementy do sekcji zwijanej
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
