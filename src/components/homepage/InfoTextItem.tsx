import React from 'react';
import * as LucideIcons from 'lucide-react';
import { CMSItem } from '@/types/cms';
import { useTheme } from '@/components/ThemeProvider';
import { isProblematicColor, sanitizeHtmlForDarkMode } from '@/lib/colorUtils';

interface InfoTextItemProps {
  item: CMSItem;
}

export const InfoTextItem: React.FC<InfoTextItemProps> = ({ item }) => {
  const IconComponent = item.icon ? (LucideIcons as any)[item.icon] : null;
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Apply custom styles from item
  const containerStyle: React.CSSProperties = {};
  if (item.background_color && !isProblematicColor(item.background_color, isDarkMode, 'background')) {
    containerStyle.backgroundColor = item.background_color;
  }
  if (item.padding) containerStyle.padding = `${item.padding}px`;
  if (item.border_radius) containerStyle.borderRadius = `${item.border_radius}px`;
  if (item.margin_top) containerStyle.marginTop = `${item.margin_top}px`;
  if (item.margin_bottom) containerStyle.marginBottom = `${item.margin_bottom}px`;
  if ((item as any).opacity) containerStyle.opacity = (item as any).opacity / 100;

  const titleStyle: React.CSSProperties = {};
  if (item.text_color && !isProblematicColor(item.text_color, isDarkMode, 'text')) {
    titleStyle.color = item.text_color;
  }
  if (item.font_size) titleStyle.fontSize = `${item.font_size}px`;
  if (item.font_weight) titleStyle.fontWeight = item.font_weight;

  return (
    <div 
      className="text-center group hover:transform hover:scale-105 transition-all duration-300"
      style={containerStyle}
    >
      {IconComponent && (
        <div className="flex justify-center mb-6">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 bg-primary"
            style={item.background_color && !isProblematicColor(item.background_color, isDarkMode, 'background') ? { backgroundColor: item.background_color } : undefined}
          >
            <IconComponent 
              className="w-10 h-10 text-primary-foreground" 
              style={item.icon_color && !isProblematicColor(item.icon_color, isDarkMode, 'text') ? { color: item.icon_color } : undefined}
            />
          </div>
        </div>
      )}
      <h3 
        className="text-xl font-bold mb-3 text-foreground"
        style={titleStyle}
        dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(item.title || '', isDarkMode) }}
      />
      {item.url ? (
        <a 
          href={item.url} 
          className="hover:opacity-80 transition-colors font-medium text-muted-foreground"
          style={item.text_color && !isProblematicColor(item.text_color, isDarkMode, 'text') ? { color: item.text_color } : undefined}
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(item.description || '', isDarkMode) }}
        />
      ) : (
        <p 
          className="leading-relaxed text-muted-foreground"
          style={item.text_color && !isProblematicColor(item.text_color, isDarkMode, 'text') ? { color: item.text_color } : undefined}
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(item.description || '', isDarkMode) }}
        />
      )}
    </div>
  );
};
