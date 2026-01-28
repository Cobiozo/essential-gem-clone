import React from 'react';
import { Info } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';

interface WidgetInfoButtonProps {
  description: string;
}

export const WidgetInfoButton: React.FC<WidgetInfoButtonProps> = ({ description }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="absolute top-2 right-2 z-10 h-5 w-5 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors"
          aria-label="Informacja o widżecie"
        >
          <Info className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side="bottom" 
        align="end" 
        className="max-w-[200px] text-xs p-3"
      >
        {description}
      </PopoverContent>
    </Popover>
  );
};

export default WidgetInfoButton;
