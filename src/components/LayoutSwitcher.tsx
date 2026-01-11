import React from 'react';
import { LayoutDashboard, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLayoutPreference } from '@/hooks/useLayoutPreference';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LayoutSwitcherProps {
  showLabel?: boolean;
  className?: string;
}

export const LayoutSwitcher: React.FC<LayoutSwitcherProps> = ({ 
  showLabel = false,
  className = ''
}) => {
  const { layout, toggleLayout } = useLayoutPreference();
  
  const isModern = layout === 'modern';
  const label = isModern ? 'Widok klasyczny' : 'Nowy widok';
  const Icon = isModern ? LayoutList : LayoutDashboard;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleLayout}
            className={`h-8 sm:h-9 px-2 sm:px-3 hover:bg-muted ${className}`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {showLabel && (
              <span className="ml-2 text-xs sm:text-sm hidden md:inline">
                {label}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
