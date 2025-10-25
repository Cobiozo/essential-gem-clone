import React, { useState } from 'react';
import { CMSSection, CMSItem } from '@/types/cms';
import { CMSContent } from '@/components/CMSContent';
import { LearnMoreItem } from '@/components/homepage/LearnMoreItem';
import { InfoTextItem } from '@/components/homepage/InfoTextItem';
import { cn } from '@/lib/utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';

interface HomeRowContainerProps {
  row: CMSSection;
  children: CMSSection[];
  items: CMSItem[];
}

export const HomeRowContainer: React.FC<HomeRowContainerProps> = ({ 
  row, 
  children, 
  items 
}) => {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  
  const columnCount = row.row_column_count || 1;
  
  // ✅ Pobierz elementy przypisane BEZPOŚREDNIO do wiersza
  const rowItems = items.filter(it => it.section_id === row.id);
  
  // Grupuj elementy według column_index
  const itemsByColumn: CMSItem[][] = Array.from({ length: columnCount }, () => []);
  rowItems.forEach(item => {
    const colIdx = (item as any).column_index || 0;
    if (colIdx < columnCount) {
      itemsByColumn[colIdx].push(item);
    }
  });
  
  // Sort children by position
  const sortedChildren = [...children].sort((a, b) => (a.position || 0) - (b.position || 0));
  
  // Assign each child to the next available column slot sequentially
  const slotSections: (CMSSection | undefined)[] = Array.from({ length: columnCount }, () => undefined);
  sortedChildren.forEach((child, index) => {
    if (index < columnCount) {
      slotSections[index] = child;
    }
  });

  // Style dla row container
  const rowStyles: React.CSSProperties = {
    backgroundColor: row.background_color || 'transparent',
    color: row.text_color || 'inherit',
    padding: row.padding ? `${row.padding}px 20px` : '40px 20px',
    marginTop: row.section_margin_top ? `${row.section_margin_top}px` : undefined,
    marginBottom: row.section_margin_bottom ? `${row.section_margin_bottom}px` : undefined,
    borderRadius: row.border_radius ? `${row.border_radius}px` : undefined,
  };

  // Responsive grid class based on column count
  const getGridClass = () => {
    if (columnCount === 1) return 'grid-cols-1';
    if (columnCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (columnCount === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (columnCount >= 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    return 'grid-cols-1';
  };

  // Grid styles dla kolumn
  const gridGap = row.gap ? `${row.gap}px` : '24px';

  return (
    <div style={rowStyles} className="w-full">
      {/* Row Title */}
      {row.title && (
        <div className="max-w-6xl mx-auto mb-4 md:mb-6 px-4">
          <h2 
            className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4"
            style={{ 
              color: row.text_color || 'inherit',
              textAlign: row.alignment as any || 'left'
            }}
            dangerouslySetInnerHTML={{ __html: row.title }}
          />
          {row.description && (
            <div 
              className="text-base md:text-lg"
              style={{ 
                color: row.text_color || 'inherit',
                textAlign: row.alignment as any || 'left'
              }}
              dangerouslySetInnerHTML={{ __html: row.description }}
            />
          )}
        </div>
      )}
      
      <div 
        className={cn('grid w-full px-4', getGridClass())}
        style={{ 
          gap: gridGap,
          maxWidth: row.max_width ? `${row.max_width}px` : '1200px',
          margin: '0 auto'
        }}
      >
        {slotSections.map((slotSection, colIndex) => {
          const columnItems = itemsByColumn[colIndex] || [];
          
          return (
            <div key={colIndex} className="flex flex-col gap-4">
              {/* ✅ Najpierw renderuj elementy bezpośrednio w kolumnie wiersza */}
              {columnItems.length > 0 && (
                <div className="space-y-2">
                  {columnItems.map((item, itemIdx) => {
                    if (item.type === 'info_text' && row.display_type === 'grid') {
                      return <InfoTextItem key={item.id} item={item} />;
                    } else if (item.type === 'multi_cell') {
                      return (
                        <LearnMoreItem 
                          key={item.id}
                          item={item} 
                          itemIndex={itemIdx}
                          isExpanded={false}
                          onToggle={() => {}}
                        />
                      );
                    } else {
                      return <CMSContent key={item.id} item={item} />;
                    }
                  })}
                </div>
              )}
              
              {/* Następnie renderuj sekcję w slocie jeśli istnieje */}
              {slotSection && (() => {
                const sectionItems = items.filter(item => item.section_id === slotSection.id);
                
                // Check if section has column layout
                const columnMatch = slotSection.style_class?.match(/columns-(\d+)/);
                const sectionColumnCount = columnMatch ? parseInt(columnMatch[1], 10) : 0;
                
                // Group items by column_index if columns are defined
                let sectionItemsByColumn: CMSItem[][] = [];
                if (sectionColumnCount > 0) {
                  sectionItemsByColumn = Array.from({ length: sectionColumnCount }, () => []);
                  sectionItems.forEach(item => {
                    const colIdx = Math.min(sectionColumnCount - 1, Math.max(0, (item as any).column_index || 0));
                    sectionItemsByColumn[colIdx].push(item);
                  });
                }
                
                // Render helper function for items
                const renderItem = (item: CMSItem, index: number) => {
                  // Special rendering for multi_cell items (Learn More section)
                  if (item.type === 'multi_cell') {
                    return (
                      <LearnMoreItem 
                        key={item.id} 
                        item={item} 
                        itemIndex={index}
                        isExpanded={expandedItemId === item.id}
                        onToggle={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                      />
                    );
                  }
                  // Default rendering
                  return <CMSContent key={item.id} item={item} />;
                };
                
                // Check if section contains only multi_cell items (Learn More type)
                const hasOnlyMultiCell = sectionItems.length > 0 && sectionItems.every(item => item.type === 'multi_cell');
                
                // For multi_cell sections, render directly without CollapsibleSection wrapper
                if (hasOnlyMultiCell) {
                  return (
                    <div key={slotSection.id} className="space-y-4 py-6">
                      {slotSection.title && (
                        <h2 className="text-3xl font-bold text-center mb-8" style={{ color: slotSection.text_color || 'inherit' }}>
                          {slotSection.title}
                        </h2>
                      )}
                      {slotSection.description && (
                        <div 
                          className="text-center text-gray-600 mb-6 max-w-3xl mx-auto"
                          dangerouslySetInnerHTML={{ __html: slotSection.description }}
                        />
                      )}
                      <div className="space-y-4">
                        {sectionItems.map((item, idx) => renderItem(item, idx))}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <CollapsibleSection
                    key={slotSection.id}
                    title={slotSection.title || ''}
                    description={slotSection.description || undefined}
                    sectionStyle={{
                      background_color: slotSection.background_color,
                      text_color: slotSection.text_color,
                      font_size: slotSection.font_size,
                      alignment: slotSection.alignment,
                      padding: slotSection.padding,
                      margin: slotSection.margin,
                      border_radius: slotSection.border_radius,
                      style_class: slotSection.style_class,
                      background_gradient: slotSection.background_gradient,
                      border_width: slotSection.border_width,
                      border_color: slotSection.border_color,
                      border_style: slotSection.border_style,
                      box_shadow: slotSection.box_shadow,
                      opacity: slotSection.opacity,
                      width_type: slotSection.width_type,
                      custom_width: slotSection.custom_width,
                      height_type: slotSection.height_type,
                      custom_height: slotSection.custom_height,
                      max_width: slotSection.max_width,
                      font_weight: slotSection.font_weight,
                      line_height: slotSection.line_height,
                      letter_spacing: slotSection.letter_spacing,
                      text_transform: slotSection.text_transform,
                      display_type: slotSection.display_type,
                      justify_content: slotSection.justify_content,
                      align_items: slotSection.align_items,
                      gap: slotSection.gap,
                      section_margin_top: slotSection.section_margin_top,
                      section_margin_bottom: slotSection.section_margin_bottom,
                      background_image: slotSection.background_image,
                      background_image_opacity: slotSection.background_image_opacity,
                      background_image_position: slotSection.background_image_position,
                      background_image_size: slotSection.background_image_size,
                      icon_name: slotSection.icon_name,
                      icon_position: slotSection.icon_position,
                      icon_size: slotSection.icon_size,
                      icon_color: slotSection.icon_color,
                      show_icon: slotSection.show_icon,
                      min_height: slotSection.min_height,
                      hover_opacity: slotSection.hover_opacity,
                      hover_scale: slotSection.hover_scale,
                      hover_transition_duration: slotSection.hover_transition_duration,
                      hover_background_color: slotSection.hover_background_color,
                      hover_background_gradient: slotSection.hover_background_gradient,
                      hover_text_color: slotSection.hover_text_color,
                      hover_border_color: slotSection.hover_border_color,
                      hover_box_shadow: slotSection.hover_box_shadow,
                      content_direction: slotSection.content_direction,
                      content_wrap: slotSection.content_wrap,
                      overflow_behavior: slotSection.overflow_behavior,
                    }}
                    defaultOpen={slotSection.default_expanded || false}
                  >
                    {sectionColumnCount > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${sectionColumnCount}, 1fr)`,
                        gap: '24px'
                      }}>
                        {sectionItemsByColumn.map((columnItems, colIdx) => (
                          <div key={colIdx} className="space-y-4">
                            {columnItems.map((item, idx) => renderItem(item, idx))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sectionItems.map((item, idx) => renderItem(item, idx))}
                      </div>
                    )}
                  </CollapsibleSection>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
};