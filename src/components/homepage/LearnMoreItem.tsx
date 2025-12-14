import React, { lazy, Suspense } from 'react';
import { ChevronDown, icons } from 'lucide-react';
import { CMSItem, ContentCell } from '@/types/cms';
import { Button } from '@/components/ui/button';

interface LearnMoreItemProps {
  item: CMSItem;
  itemIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  isEditMode?: boolean;
}

// Dynamic icon component
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = icons[name as keyof typeof icons];
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
};

// Helper to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

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
  if (item.background_color && item.number_type !== 'auto') {
    // Only apply background to container if not using it for number
  }
  if (item.border_radius) containerStyle.borderRadius = `${item.border_radius}px`;
  if (item.margin_top) containerStyle.marginTop = `${item.margin_top}px`;
  if (item.margin_bottom) containerStyle.marginBottom = `${item.margin_bottom}px`;
  if ((item as any).opacity) containerStyle.opacity = (item as any).opacity / 100;

  const titleStyle: React.CSSProperties = {};
  if (item.text_color) titleStyle.color = item.text_color;
  if (item.font_size) titleStyle.fontSize = `${item.font_size}px`;
  if (item.font_weight) titleStyle.fontWeight = item.font_weight;

  // Number styling
  const showNumber = item.show_number !== false;
  const numberType = item.number_type || 'auto';
  const numberBgColor = item.background_color || 'hsl(45,100%,51%)';
  const numberTextColor = item.icon_color || '#ffffff';

  // Render number/icon based on type
  const renderNumber = () => {
    if (!showNumber) return null;

    const baseClasses = "w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-md group-hover:scale-110 transition-transform duration-300";

    switch (numberType) {
      case 'image':
        if (item.custom_number_image) {
          return (
            <img 
              src={item.custom_number_image} 
              alt="" 
              className="w-14 h-14 rounded-full object-cover shadow-md group-hover:scale-110 transition-transform duration-300"
            />
          );
        }
        break;
      case 'icon':
        if (item.icon) {
          return (
            <div 
              className={baseClasses}
              style={{ backgroundColor: numberBgColor, color: numberTextColor }}
            >
              <DynamicIcon name={item.icon} className="w-7 h-7" />
            </div>
          );
        }
        break;
      case 'text':
        return (
          <div 
            className={baseClasses}
            style={{ backgroundColor: numberBgColor, color: numberTextColor }}
          >
            {item.custom_number || (itemIndex + 1)}
          </div>
        );
      default: // 'auto'
        return (
          <div 
            className={baseClasses}
            style={{ backgroundColor: numberBgColor, color: numberTextColor }}
          >
            {itemIndex + 1}
          </div>
        );
    }

    // Fallback to auto if specific type has no value
    return (
      <div 
        className={baseClasses}
        style={{ backgroundColor: numberBgColor, color: numberTextColor }}
      >
        {itemIndex + 1}
      </div>
    );
  };

  // Get alignment wrapper classes
  const getAlignmentClasses = (alignment?: string) => {
    switch (alignment) {
      case 'center': return 'flex justify-center';
      case 'right': return 'flex justify-end';
      case 'full': return 'w-full';
      default: return 'flex justify-start';
    }
  };

  // Render a single cell based on its type
  const renderCell = (cell: ContentCell, index: number) => {
    const alignmentClass = getAlignmentClasses(cell.alignment);
    const isFullWidth = cell.alignment === 'full';
    const textAlign = cell.alignment === 'full' ? 'justify' : cell.alignment || 'left';

    const renderContent = () => {
      switch (cell.type) {
        case 'description':
        case 'text':
          return (
            <div 
              className={`leading-relaxed text-muted-foreground ${isFullWidth ? 'w-full' : ''}`}
              style={{ textAlign }}
              dangerouslySetInnerHTML={{ __html: cell.content || '' }}
            />
          );
        
        case 'list_item':
          return (
            <div className={`flex items-start gap-2 ${isFullWidth ? 'w-full' : ''}`}>
              <span className="text-primary mt-1">•</span>
              <span 
                className={isFullWidth ? 'flex-1' : ''}
                style={{ textAlign }}
                dangerouslySetInnerHTML={{ __html: cell.content || '' }} 
              />
            </div>
          );
        
        case 'button_anchor':
        case 'button_external':
        case 'button_functional':
          return (
            <Button
              variant={cell.type === 'button_external' ? 'default' : cell.type === 'button_anchor' ? 'secondary' : 'outline'}
              onClick={() => cell.url && window.open(cell.url, cell.type === 'button_external' ? '_blank' : '_self')}
              className={isFullWidth ? 'w-full' : ''}
            >
              {cell.content || 'Przycisk'}
            </Button>
          );
        
        case 'image':
          return cell.media_url ? (
            <img 
              src={cell.media_url} 
              alt={cell.media_alt || ''} 
              className={`rounded-lg h-auto ${isFullWidth ? 'w-full' : 'max-w-full'}`}
            />
          ) : null;
        
        case 'video':
          if (!cell.media_url) return null;
          const youtubeId = getYouTubeVideoId(cell.media_url);
          if (youtubeId) {
            return (
              <div className={`aspect-video rounded-lg overflow-hidden ${isFullWidth ? 'w-full' : 'max-w-full'}`}>
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title={cell.media_alt || 'Video'}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            );
          }
          return (
            <video 
              src={cell.media_url} 
              controls 
              className={`rounded-lg ${isFullWidth ? 'w-full' : 'max-w-full'}`}
            >
              {cell.media_alt}
            </video>
          );
        
        case 'gallery':
          return cell.items && cell.items.length > 0 ? (
            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${isFullWidth ? 'w-full' : ''}`}>
              {cell.items.map((img, imgIdx) => (
                <div key={imgIdx} className="relative group">
                  <img 
                    src={img.url} 
                    alt={img.alt || ''} 
                    className="rounded-lg w-full h-auto object-cover aspect-square"
                  />
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg">
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null;
        
        case 'carousel':
          return cell.items && cell.items.length > 0 ? (
            <div className={`flex gap-2 overflow-x-auto pb-2 ${isFullWidth ? 'w-full' : ''}`}>
              {cell.items.map((img, imgIdx) => (
                <div key={imgIdx} className="shrink-0 w-48">
                  <img 
                    src={img.url} 
                    alt={img.alt || ''} 
                    className="rounded-lg w-full h-32 object-cover"
                  />
                  {img.caption && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{img.caption}</p>
                  )}
                </div>
              ))}
            </div>
          ) : null;
        
        case 'icon':
          return (
            <DynamicIcon name={cell.content || 'Star'} className="w-12 h-12 text-primary" />
          );
        
        case 'spacer':
          return (
            <div style={{ height: `${cell.height || 24}px`, width: '100%' }} />
          );
        
        case 'divider':
          return (
            <hr className="border-border my-2 w-full" />
          );
        
        case 'section':
          return (
            <div className={`bg-muted/30 rounded-lg p-4 space-y-2 ${isFullWidth ? 'w-full' : ''}`}>
              {cell.section_title && (
                <h4 className="font-semibold">{cell.section_title}</h4>
              )}
              {cell.section_description && (
                <p className="text-sm text-muted-foreground">{cell.section_description}</p>
              )}
            </div>
          );
        
        default:
          return cell.content ? (
            <div 
              className={`leading-relaxed ${isFullWidth ? 'w-full' : ''}`}
              style={{ textAlign }}
              dangerouslySetInnerHTML={{ __html: cell.content || '' }}
            />
          ) : null;
      }
    };

    const content = renderContent();
    if (!content) return null;

    // Spacer and divider don't need alignment wrapper
    if (cell.type === 'spacer' || cell.type === 'divider') {
      return <div key={cell.id || index}>{content}</div>;
    }

    return (
      <div key={cell.id || index} className={alignmentClass}>
        {content}
      </div>
    );
  };

  // Fallback content if no cells - use item.description
  const hasContent = contentCells.length > 0 || item.description;

  return (
    <div 
      className="relative z-0 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-border bg-card"
      style={containerStyle}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-full flex items-center justify-between p-6 transition-colors cursor-pointer hover:bg-muted/30 group"
      >
        <div className="flex items-center gap-5">
          {renderNumber()}
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
      </div>
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
