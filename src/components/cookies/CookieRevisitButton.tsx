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

  const positionClasses: Record<string, string> = {
    'bottom-left': 'fixed bottom-2 left-2 sm:bottom-4 sm:left-4',
    'bottom-center': 'fixed bottom-2 left-1/2 -translate-x-1/2 sm:bottom-4',
    'bottom-right': 'fixed bottom-2 right-2 sm:bottom-4 sm:right-4',
  };

  const tooltipSide = position === 'bottom-left' ? 'right' : position === 'bottom-right' ? 'left' : 'top';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            positionClasses[position] || positionClasses['bottom-left'],
            'z-[9998] p-2 sm:p-3 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95'
          )}
          style={{
            backgroundColor: colors.buttonPrimaryBg,
            color: colors.buttonPrimaryText,
          }}
          aria-label={bannerSettings.revisit_button_text}
        >
          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>
        {bannerSettings.revisit_button_text}
      </TooltipContent>
    </Tooltip>
  );
}
