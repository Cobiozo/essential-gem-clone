import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useNewsTickerData } from './useNewsTickerData';
import { TickerItemComponent } from './TickerItem';
import { TickerItem } from './types';
import { Loader2 } from 'lucide-react';

interface NewsTickerProps {
  className?: string;
}

// Marquee (scroll) animation content
const MarqueeContent: React.FC<{ items: TickerItem[]; speed: number }> = ({ items, speed }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [animationDuration, setAnimationDuration] = useState(30);

  useEffect(() => {
    if (contentRef.current) {
      const contentWidth = contentRef.current.scrollWidth / 2; // Half because content is duplicated
      // Calculate duration based on speed (px/s) and content width
      const duration = contentWidth / speed;
      setAnimationDuration(Math.max(10, duration));
    }
  }, [items, speed]);

  return (
    <div 
      className="flex overflow-hidden"
      style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
    >
      <div
        ref={contentRef}
        className="flex animate-marquee"
        style={{
          animationDuration: `${animationDuration}s`,
        }}
      >
        {/* Duplicate content for seamless loop */}
        {[...items, ...items].map((item, i) => (
          <TickerItemComponent key={`${item.id}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
};

// Rotating content (change every X seconds)
const RotatingContent: React.FC<{ items: TickerItem[]; interval: number }> = ({ items, interval }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (items.length <= 1) return;

    const timer = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setIsVisible(true);
      }, 200);
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [items.length, interval]);

  if (items.length === 0) return null;

  return (
    <div className="flex items-center justify-center min-h-[24px]">
      <div
        className={cn(
          "transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <TickerItemComponent item={items[currentIndex]} />
      </div>
    </div>
  );
};

// Static content (show all at once, centered)
const StaticContent: React.FC<{ items: TickerItem[] }> = ({ items }) => {
  return (
    <div className="flex items-center justify-center flex-wrap gap-2">
      {items.slice(0, 3).map((item) => (
        <TickerItemComponent key={item.id} item={item} />
      ))}
      {items.length > 3 && (
        <span className="text-xs text-muted-foreground ml-2">
          +{items.length - 3} więcej
        </span>
      )}
    </div>
  );
};

export const NewsTicker: React.FC<NewsTickerProps> = ({ className }) => {
  const { items, settings, loading } = useNewsTickerData();

  // Don't render if disabled or no items
  if (!settings?.isEnabled || (items.length === 0 && !loading)) {
    return null;
  }

  // Custom styling from settings
  const customStyles: React.CSSProperties = {};
  if (settings.backgroundColor) {
    customStyles.backgroundColor = settings.backgroundColor;
  }
  if (settings.textColor) {
    customStyles.color = settings.textColor;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        "bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60",
        "border border-border/40",
        "py-2 px-3",
        className
      )}
      style={customStyles}
    >
      {loading ? (
        <div className="flex items-center justify-center py-1">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : settings.animationMode === 'scroll' ? (
        <MarqueeContent items={items} speed={settings.scrollSpeed} />
      ) : settings.animationMode === 'rotate' ? (
        <RotatingContent items={items} interval={settings.rotateInterval} />
      ) : (
        <StaticContent items={items} />
      )}
    </div>
  );
};
