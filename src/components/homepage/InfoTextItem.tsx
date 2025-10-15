import React from 'react';
import * as LucideIcons from 'lucide-react';
import { CMSItem } from '@/types/cms';

interface InfoTextItemProps {
  item: CMSItem;
}

export const InfoTextItem: React.FC<InfoTextItemProps> = ({ item }) => {
  const IconComponent = item.icon ? (LucideIcons as any)[item.icon] : null;

  return (
    <div className="text-center group hover:transform hover:scale-105 transition-all duration-300">
      {IconComponent && (
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[hsl(45,100%,51%)] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
            <IconComponent className="w-10 h-10 text-white" />
          </div>
        </div>
      )}
      <h3 className="text-xl font-bold mb-3 text-black">{item.title}</h3>
      {item.url ? (
        <a 
          href={item.url} 
          className="text-gray-600 hover:text-[hsl(45,100%,51%)] transition-colors font-medium"
        >
          {item.description}
        </a>
      ) : (
        <p className="text-gray-600 leading-relaxed">{item.description}</p>
      )}
    </div>
  );
};
