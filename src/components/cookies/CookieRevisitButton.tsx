import { Cookie } from 'lucide-react';
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

  const positionClasses = position === 'bottom-left' 
    ? 'fixed bottom-4 left-4' 
    : 'fixed bottom-4 right-4';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            positionClasses,
            'z-[9998] p-3 rounded-full shadow-lg transition-transform hover:scale-110'
          )}
          style={{
            backgroundColor: colors.buttonPrimaryBg,
            color: colors.buttonPrimaryText,
          }}
          aria-label={bannerSettings.revisit_button_text}
        >
          <Cookie className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={position === 'bottom-left' ? 'right' : 'left'}>
        {bannerSettings.revisit_button_text}
      </TooltipContent>
    </Tooltip>
  );
}
