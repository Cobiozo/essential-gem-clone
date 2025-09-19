import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CMSButtonProps {
  title: string;
  description?: string | null;
  url?: string | null;
  type: 'simple' | 'detailed';
  onClick?: () => void;
  className?: string;
}

export const CMSButton: React.FC<CMSButtonProps> = ({
  title,
  description,
  url,
  type,
  onClick,
  className
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (url) {
      if (url.startsWith('http') || url.startsWith('tel:') || url.startsWith('mailto:')) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    }
  };

  if (type === 'detailed' && description) {
    return (
      <div className="w-full">
        <Button
          onClick={handleClick}
          className={cn(
            "w-full min-h-[70px] sm:min-h-[60px] lg:min-h-[70px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-left p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border-0",
            "flex flex-col items-start justify-center space-y-1 sm:space-y-2",
            className
          )}
        >
          <span className="font-semibold text-sm sm:text-base leading-tight">{title}</span>
          <span className="text-xs sm:text-sm text-primary-foreground/80 font-normal leading-tight">{description}</span>
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "w-full min-h-[45px] sm:min-h-[40px] lg:min-h-[45px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-sm border-0 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base",
        className
      )}
    >
      {title}
    </Button>
  );
};