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
  // Jeśli brak dzieci, nie renderuj niczego
  if (!children || children.length === 0) {
    return null;
  }

  // Oblicz rzeczywistą liczbę kolumn na podstawie unikalnych position dzieci
  const uniquePositions = Array.from(new Set(children.map(c => c.position || 0)));
  const actualColumnCount = Math.max(1, uniquePositions.length);
  
  // Grupuj dzieci po position (position = column index w starym systemie)
  const columns: { [key: number]: CMSSection[] } = {};
  
  // Inicjalizuj kolumny
  uniquePositions.forEach(pos => {
    columns[pos] = [];
  });
  
  // Przypisz dzieci do kolumn
  children.forEach(child => {
    const colIndex = child.position || 0;
    if (columns[colIndex]) {
      columns[colIndex].push(child);
    }
  });

  // Sortuj pozycje kolumn
  const sortedPositions = uniquePositions.sort((a, b) => a - b);

  // Style dla row container
  const rowStyles: React.CSSProperties = {
    backgroundColor: row.background_color || 'transparent',
    color: row.text_color || 'inherit',
    padding: row.padding ? `${row.padding}px 20px` : '40px 20px',
    marginTop: row.section_margin_top ? `${row.section_margin_top}px` : undefined,
    marginBottom: row.section_margin_bottom ? `${row.section_margin_bottom}px` : undefined,
    borderRadius: row.border_radius ? `${row.border_radius}px` : undefined,
  };

  // Grid styles dla kolumn - używaj actualColumnCount
  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${actualColumnCount}, 1fr)`,
    gap: row.gap ? `${row.gap}px` : '24px',
    maxWidth: row.max_width ? `${row.max_width}px` : '1200px',
    margin: '0 auto',
  };

  return (
    <div style={rowStyles} className="w-full">
      <div style={gridStyles}>
        {sortedPositions.map(pos => (
          <div key={pos} className="flex flex-col gap-4">
            {columns[pos].map(section => {
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
