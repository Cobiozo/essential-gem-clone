import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface GreenButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline';
}

export const GreenButton: React.FC<GreenButtonProps> = ({
  children,
  onClick,
  icon,
  className,
  variant = 'default'
}) => {
  return (
    <Button
      onClick={onClick}
      variant={variant === 'outline' ? 'outline' : 'default'}
      className={cn(
        "w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2 transition-colors",
        variant === 'outline' && "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="text-sm font-medium">{children}</span>
    </Button>
  );
};