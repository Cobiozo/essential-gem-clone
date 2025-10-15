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

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[hsl(45,100%,51%)] flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-110 transition-transform duration-300">
            {itemIndex + 1}
          </div>
          <span 
            className="text-left text-black font-semibold text-lg"
            dangerouslySetInnerHTML={{ __html: item.title || '' }}
          />
        </div>
        <ChevronDown 
          className={`w-6 h-6 text-gray-400 group-hover:text-[hsl(45,100%,51%)] transition-all duration-300 ${
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
            className="px-6 pb-6 text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: item.description || '' }}
          />
        </div>
      </div>
    </div>
  );
};
