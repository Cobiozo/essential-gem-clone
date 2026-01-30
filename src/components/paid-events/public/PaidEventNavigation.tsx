import React from 'react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  id: string;
  label: string;
}

interface PaidEventNavigationProps {
  items: NavigationItem[];
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const PaidEventNavigation: React.FC<PaidEventNavigationProps> = ({
  items,
  activeSection,
  onNavigate,
}) => {
  if (items.length === 0) return null;

  return (
    <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex overflow-x-auto scrollbar-hide -mx-4 px-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeSection === item.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
