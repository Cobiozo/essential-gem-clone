import React from 'react';
import { CMSSection, CMSItem } from '@/types/cms';
import { CMSContent } from '@/components/CMSContent';
import { cn } from '@/lib/utils';

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
  // Grupuj dzieci po position (używamy position jako column_index)
  const columnCount = row.row_column_count || 1;
  const columns: { [key: number]: CMSSection[] } = {};
  
  for (let i = 0; i < columnCount; i++) {
    columns[i] = [];
  }
  
  children.forEach(child => {
    const colIndex = Math.min(columnCount - 1, Math.max(0, child.position || 0));
    columns[colIndex].push(child);
  });

  // Sortuj sekcje w każdej kolumnie po position
  Object.keys(columns).forEach(key => {
    columns[parseInt(key)].sort((a, b) => (a.position || 0) - (b.position || 0));
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

  // Grid styles dla kolumn
  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: row.row_layout_type === 'custom'
      ? children.map(child => {
          const width = child.custom_width || 100 / columnCount;
          return `${width}%`;
        }).join(' ')
      : `repeat(${columnCount}, 1fr)`,
    gap: row.gap ? `${row.gap}px` : '24px',
    maxWidth: row.max_width ? `${row.max_width}px` : '1200px',
    margin: '0 auto',
  };

  return (
    <div style={rowStyles} className="w-full">
      <div style={gridStyles}>
        {Object.keys(columns).map(colIndex => (
          <div key={colIndex} className="flex flex-col gap-4">
            {columns[parseInt(colIndex)].map(section => {
              const sectionItems = items.filter(item => item.section_id === section.id);
              
              return (
                <div 
                  key={section.id}
                  className={cn(
                    "rounded-lg",
                    section.style_class
                  )}
                  style={{
                    backgroundColor: section.background_color || 'transparent',
                    padding: section.padding ? `${section.padding}px` : '20px',
                    borderRadius: section.border_radius ? `${section.border_radius}px` : '8px',
                  }}
                >
                  {section.title && (
                    <h3 
                      className="text-xl font-semibold mb-4"
                      style={{
                        color: section.text_color || 'inherit',
                        textAlign: section.alignment as any || 'left',
                      }}
                    >
                      {section.title}
                    </h3>
                  )}
                  {section.description && (
                    <p 
                      className="mb-4"
                      style={{ color: section.text_color || 'inherit' }}
                    >
                      {section.description}
                    </p>
                  )}
                  <div className="space-y-4">
                    {sectionItems.map(item => (
                      <CMSContent key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
