import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CMSItem } from '@/types/cms';

interface LearnMoreItemProps {
  item: CMSItem;
  itemIndex: number;
}

export const LearnMoreItem: React.FC<LearnMoreItemProps> = ({ item, itemIndex }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[hsl(45,100%,51%)] flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-110 transition-transform duration-300">
            {itemIndex + 1}
          </div>
          <span className="text-left text-black font-semibold text-lg">{item.title}</span>
        </div>
        <ChevronDown 
          className={`w-6 h-6 text-gray-400 group-hover:text-[hsl(45,100%,51%)] transition-all duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`} 
        />
      </button>
      <div 
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 text-gray-600 leading-relaxed">
          {item.description}
        </div>
      </div>
    </div>
  );
};
