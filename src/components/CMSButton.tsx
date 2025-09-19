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
            "w-full min-h-[80px] sm:min-h-[70px] lg:min-h-[80px] bg-green-600 hover:bg-green-700 text-white font-medium text-left p-4 sm:p-6 rounded-lg shadow-sm border-0",
            "flex flex-col items-start justify-center space-y-1 sm:space-y-2",
            className
          )}
        >
          <span className="font-semibold text-sm sm:text-base leading-tight">{title}</span>
          <span className="text-xs sm:text-sm text-green-100 font-normal leading-tight">{description}</span>
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "w-full min-h-[50px] sm:min-h-[45px] lg:min-h-[50px] bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm border-0 px-3 sm:px-4 py-3 text-sm sm:text-base",
        className
      )}
    >
      {title}
    </Button>
  );
};