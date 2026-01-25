import React from 'react';
import { Info } from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface WidgetInfoButtonProps {
  description: string;
}

export const WidgetInfoButton: React.FC<WidgetInfoButtonProps> = ({ description }) => {
  return (
    <Tooltip delayDuration={3000}>
      <TooltipTrigger asChild>
        <button
          className="absolute top-2 right-2 z-10 h-5 w-5 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors"
          aria-label="Informacja o widżecie"
        >
          <Info className="h-3 w-3 text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent 
        side="bottom" 
        align="end" 
        className="max-w-[200px] text-xs"
      >
        {description}
      </TooltipContent>
    </Tooltip>
  );
};

export default WidgetInfoButton;
