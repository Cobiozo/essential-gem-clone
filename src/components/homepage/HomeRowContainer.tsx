import React from 'react';
import { CMSSection, CMSItem } from '@/types/cms';
import { CMSContent } from '@/components/CMSContent';
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
  // Jeśli brak dzieci, nie renderuj niczego
  if (!children || children.length === 0) {
    return null;
  }

  // Use row_column_count as the number of columns
  const columnCount = row.row_column_count || 1;
  
  // Create empty columns array
  const columns: CMSSection[][] = [];
  for (let i = 0; i < columnCount; i++) {
    columns[i] = [];
  }
  
  // Assign each child to its column using position as direct column index
  children.forEach((child) => {
    const colIndex = child.position || 0;
    // Only assign if the column index is valid
    if (colIndex >= 0 && colIndex < columnCount) {
      columns[colIndex].push(child);
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

  // Grid styles dla kolumn - używaj columnCount
  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
    gap: row.gap ? `${row.gap}px` : '24px',
    maxWidth: row.max_width ? `${row.max_width}px` : '1200px',
    margin: '0 auto',
  };

  return (
    <div style={rowStyles} className="w-full">
      <div style={gridStyles}>
        {columns.map((columnSections, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-4">
            {columnSections.map(section => {
              const sectionItems = items.filter(item => item.section_id === section.id);
              
              return (
                <CollapsibleSection
                  key={section.id}
                  title={section.title || ''}
                  description={section.description || undefined}
                  sectionStyle={{
                    background_color: section.background_color,
                    text_color: section.text_color,
                    font_size: section.font_size,
                    alignment: section.alignment,
                    padding: section.padding,
                    margin: section.margin,
                    border_radius: section.border_radius,
                    style_class: section.style_class,
                    background_gradient: section.background_gradient,
                    border_width: section.border_width,
                    border_color: section.border_color,
                    border_style: section.border_style,
                    box_shadow: section.box_shadow,
                    opacity: section.opacity,
                    width_type: section.width_type,
                    custom_width: section.custom_width,
                    height_type: section.height_type,
                    custom_height: section.custom_height,
                    max_width: section.max_width,
                    font_weight: section.font_weight,
                    line_height: section.line_height,
                    letter_spacing: section.letter_spacing,
                    text_transform: section.text_transform,
                    display_type: section.display_type,
                    justify_content: section.justify_content,
                    align_items: section.align_items,
                    gap: section.gap,
                    section_margin_top: section.section_margin_top,
                    section_margin_bottom: section.section_margin_bottom,
                    background_image: section.background_image,
                    background_image_opacity: section.background_image_opacity,
                    background_image_position: section.background_image_position,
                    background_image_size: section.background_image_size,
                    icon_name: section.icon_name,
                    icon_position: section.icon_position,
                    icon_size: section.icon_size,
                    icon_color: section.icon_color,
                    show_icon: section.show_icon,
                    min_height: section.min_height,
                    hover_opacity: section.hover_opacity,
                    hover_scale: section.hover_scale,
                    hover_transition_duration: section.hover_transition_duration,
                    hover_background_color: section.hover_background_color,
                    hover_background_gradient: section.hover_background_gradient,
                    hover_text_color: section.hover_text_color,
                    hover_border_color: section.hover_border_color,
                    hover_box_shadow: section.hover_box_shadow,
                    content_direction: section.content_direction,
                    content_wrap: section.content_wrap,
                    overflow_behavior: section.overflow_behavior,
                  }}
                  defaultOpen={section.default_expanded || false}
                >
                  <div className="space-y-4">
                    {sectionItems.map(item => (
                      <CMSContent key={item.id} item={item} />
                    ))}
                  </div>
                </CollapsibleSection>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
