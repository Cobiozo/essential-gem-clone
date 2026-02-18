import React from 'react';
import { cn } from '@/lib/utils';
import { TickerItem as TickerItemType } from './types';
import * as LucideIcons from 'lucide-react';
import { Info } from 'lucide-react';

interface TickerItemProps {
  item: TickerItemType;
  className?: string;
  allowWrap?: boolean;
}

export const TickerItemComponent: React.FC<TickerItemProps> = ({ item, className, allowWrap = false }) => {
  // Dynamically get icon component
  const IconComponent = (LucideIcons as any)[item.icon] || Info;

  // Font size classes
  const fontSizeClass = {
    normal: 'text-sm',
    large: 'text-base font-semibold',
    xlarge: 'text-lg font-bold',
  }[item.fontSize || 'normal'];

  // Effect classes
  const effectClass = {
    none: '',
    blink: 'animate-blink',
    pulse: 'animate-pulse',
    glow: 'animate-glow drop-shadow-lg',
  }[item.effect || 'none'];

  // Icon animation classes
  const iconAnimationClass = {
    none: '',
    bounce: 'animate-bounce',
    spin: 'animate-spin',
    shake: 'animate-shake',
  }[item.iconAnimation || 'none'];

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        allowWrap ? "whitespace-normal mx-2 text-center flex-wrap" : "whitespace-nowrap mx-3",
        fontSizeClass,
        effectClass,
        item.isImportant && !item.customColor && "text-amber-600 dark:text-amber-400 font-medium",
        className
      )}
      style={item.customColor ? { color: item.customColor } : undefined}
    >
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt=""
          className="h-5 w-5 rounded object-cover flex-shrink-0"
        />
      ) : (
        <IconComponent className={cn("h-4 w-4 flex-shrink-0", iconAnimationClass)} />
      )}
      <span>{item.content}</span>
      {item.isImportant && (
        <span className="inline-flex items-center justify-center h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
      )}
    </span>
  );

  if (item.linkUrl) {
    return (
      <a
        href={item.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline hover:opacity-80 transition-opacity"
      >
        {content}
      </a>
    );
  }

  return <>{content}</>;
};
