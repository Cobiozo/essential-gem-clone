import React from 'react';
import * as LucideIcons from 'lucide-react';
import { CMSItem } from '@/types/cms';

interface InfoTextItemProps {
  item: CMSItem;
}

export const InfoTextItem: React.FC<InfoTextItemProps> = ({ item }) => {
  const IconComponent = item.icon ? (LucideIcons as any)[item.icon] : null;

  // Apply custom styles from item
  const containerStyle: React.CSSProperties = {};
  if (item.background_color) containerStyle.backgroundColor = item.background_color;
  if (item.padding) containerStyle.padding = `${item.padding}px`;
  if (item.border_radius) containerStyle.borderRadius = `${item.border_radius}px`;
  if (item.margin_top) containerStyle.marginTop = `${item.margin_top}px`;
  if (item.margin_bottom) containerStyle.marginBottom = `${item.margin_bottom}px`;
  if ((item as any).opacity) containerStyle.opacity = (item as any).opacity / 100;

  const titleStyle: React.CSSProperties = {};
  if (item.text_color) titleStyle.color = item.text_color;
  if (item.font_size) titleStyle.fontSize = `${item.font_size}px`;
  if (item.font_weight) titleStyle.fontWeight = item.font_weight;

  const iconBgColor = item.background_color || 'hsl(45,100%,51%)';
  const iconColor = item.icon_color || '#ffffff';

  return (
    <div 
      className="text-center group hover:transform hover:scale-105 transition-all duration-300"
      style={containerStyle}
    >
      {IconComponent && (
        <div className="flex justify-center mb-6">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300"
            style={{ backgroundColor: iconBgColor }}
          >
            <IconComponent className="w-10 h-10" style={{ color: iconColor }} />
          </div>
        </div>
      )}
      <h3 
        className="text-xl font-bold mb-3"
        style={titleStyle}
        dangerouslySetInnerHTML={{ __html: item.title || '' }}
      />
      {item.url ? (
        <a 
          href={item.url} 
          className="hover:opacity-80 transition-colors font-medium"
          style={{ color: item.text_color || '#6b7280' }}
          dangerouslySetInnerHTML={{ __html: item.description || '' }}
        />
      ) : (
        <p 
          className="leading-relaxed"
          style={{ color: item.text_color || '#6b7280' }}
          dangerouslySetInnerHTML={{ __html: item.description || '' }}
        />
      )}
    </div>
  );
};
