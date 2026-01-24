import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CookieBannerSettings } from '@/types/cookies';
import { cn } from '@/lib/utils';

interface CookieRevisitButtonProps {
  bannerSettings: CookieBannerSettings;
  onClick: () => void;
}

export function CookieRevisitButton({ bannerSettings, onClick }: CookieRevisitButtonProps) {
  const colors = bannerSettings.colors;
  const position = bannerSettings.revisit_button_position;
  
  const [isMinimized, setIsMinimized] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-minimize after 3 seconds when not hovered
  useEffect(() => {
    if (!isMinimized && !isHovered) {
      const timer = setTimeout(() => setIsMinimized(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isMinimized, isHovered]);

  const positionClasses: Record<string, string> = {
    'bottom-left': 'fixed bottom-16 left-2 sm:bottom-20 sm:left-4',
    'bottom-center': 'fixed bottom-2 left-1/2 -translate-x-1/2 sm:bottom-4',
    'bottom-right': 'fixed bottom-2 right-2 sm:bottom-4 sm:right-4',
  };

  const tooltipSide = position === 'bottom-left' ? 'right' : position === 'bottom-right' ? 'left' : 'top';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          onMouseEnter={() => { setIsMinimized(false); setIsHovered(true); }}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            positionClasses[position] || positionClasses['bottom-left'],
            'z-[9998] rounded-full shadow-lg transition-all duration-300',
            isMinimized 
              ? 'p-1.5 opacity-40 hover:opacity-100 hover:p-2 sm:hover:p-3 scale-75 hover:scale-100'
              : 'p-2 sm:p-3 opacity-100 scale-100'
          )}
          style={{
            backgroundColor: colors.buttonPrimaryBg,
            color: colors.buttonPrimaryText,
          }}
          aria-label={bannerSettings.revisit_button_text}
        >
          <ShieldCheck className={cn(
            'transition-all duration-300',
            isMinimized ? 'h-3 w-3' : 'h-4 w-4 sm:h-5 sm:w-5'
          )} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>
        {bannerSettings.revisit_button_text}
      </TooltipContent>
    </Tooltip>
  );
}
