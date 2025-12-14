import React from 'react';
import { ChevronDown } from 'lucide-react';
import { CMSItem, ContentCell } from '@/types/cms';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LearnMoreItemProps {
  item: CMSItem;
  itemIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  isEditMode?: boolean;
}

export const LearnMoreItem: React.FC<LearnMoreItemProps> = ({ item, itemIndex, isExpanded, onToggle, isEditMode = false }) => {
  // Parse cells from item
  const cells = (item.cells || []) as ContentCell[];
  const activeCells = cells
    .filter(cell => cell.is_active !== false)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  // Get header cell for title, fallback to item.title
  const headerCell = activeCells.find(c => c.type === 'header');
  const headerContent = headerCell?.content || item.title || '';

  // Get content cells (everything except header)
  const contentCells = activeCells.filter(c => c.type !== 'header');

  // Apply custom styles from item
  const containerStyle: React.CSSProperties = {};
  if (item.background_color) containerStyle.backgroundColor = item.background_color;
  if (item.border_radius) containerStyle.borderRadius = `${item.border_radius}px`;
  if (item.margin_top) containerStyle.marginTop = `${item.margin_top}px`;
  if (item.margin_bottom) containerStyle.marginBottom = `${item.margin_bottom}px`;
  if ((item as any).opacity) containerStyle.opacity = (item as any).opacity / 100;

  const titleStyle: React.CSSProperties = {};
  if (item.text_color) titleStyle.color = item.text_color;
  if (item.font_size) titleStyle.fontSize = `${item.font_size}px`;
  if (item.font_weight) titleStyle.fontWeight = item.font_weight;

  const numberBgColor = item.background_color || 'hsl(45,100%,51%)';
  const numberTextColor = item.icon_color || '#ffffff';

  // Render a single cell based on its type
  const renderCell = (cell: ContentCell, index: number) => {
    switch (cell.type) {
      case 'description':
      case 'text':
        return (
          <div 
            key={cell.id || index}
            className="leading-relaxed text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: cell.content || '' }}
          />
        );
      case 'list_item':
        return (
          <div key={cell.id || index} className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span dangerouslySetInnerHTML={{ __html: cell.content || '' }} />
          </div>
        );
      case 'button_anchor':
      case 'button_external':
      case 'button_functional':
        return (
          <Button
            key={cell.id || index}
            variant={cell.type === 'button_external' ? 'default' : cell.type === 'button_anchor' ? 'secondary' : 'outline'}
            onClick={() => cell.url && window.open(cell.url, cell.type === 'button_external' ? '_blank' : '_self')}
            className="mt-2"
          >
            {cell.content || 'Przycisk'}
          </Button>
        );
      default:
        return cell.content ? (
          <div 
            key={cell.id || index}
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: cell.content || '' }}
          />
        ) : null;
    }
  };

  // Fallback content if no cells - use item.description
  const hasContent = contentCells.length > 0 || item.description;

  return (
    <div 
      className="rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-border bg-card"
      style={containerStyle}
    >
      <button
        onClick={(e) => {
          if (isEditMode) {
            e.stopPropagation();
            return;
          }
          onToggle();
        }}
        className={cn(
          "w-full flex items-center justify-between p-6 hover:bg-muted/30 transition-colors group",
          isEditMode && "pointer-events-none"
        )}
      >
        <div className="flex items-center gap-5">
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-md group-hover:scale-110 transition-transform duration-300"
            style={{ backgroundColor: numberBgColor, color: numberTextColor }}
          >
            {itemIndex + 1}
          </div>
          <span 
            className="text-left font-semibold text-lg"
            style={titleStyle}
            dangerouslySetInnerHTML={{ __html: headerContent }}
          />
        </div>
        <ChevronDown 
          className={`w-6 h-6 text-muted-foreground transition-all duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`} 
        />
      </button>
      {hasContent && (
        <div 
          className={`grid transition-all duration-300 ease-in-out ${
            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div 
              className="px-6 pb-6 space-y-3"
              style={{ color: item.text_color || undefined }}
            >
              {contentCells.length > 0 ? (
                contentCells.map((cell, index) => renderCell(cell, index))
              ) : (
                <div 
                  className="leading-relaxed text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: item.description || '' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
