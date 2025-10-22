import React from 'react';
import { ChevronDown } from 'lucide-react';
import { CMSItem } from '@/types/cms';

interface LearnMoreItemProps {
  item: CMSItem;
  itemIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export const LearnMoreItem: React.FC<LearnMoreItemProps> = ({ item, itemIndex, isExpanded, onToggle }) => {
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

  return (
    <div 
      className="rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
      style={containerStyle}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group"
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
            dangerouslySetInnerHTML={{ __html: item.title || '' }}
          />
        </div>
        <ChevronDown 
          className={`w-6 h-6 text-gray-400 transition-all duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`} 
        />
      </button>
      <div 
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div 
            className="px-6 pb-6 leading-relaxed"
            style={{ color: item.text_color || '#6b7280' }}
            dangerouslySetInnerHTML={{ __html: item.description || '' }}
          />
        </div>
      </div>
    </div>
  );
};
