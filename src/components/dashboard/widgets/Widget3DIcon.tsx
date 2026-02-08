import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Widget3DIconProps {
  icon: LucideIcon;
  variant: 'gold' | 'blue' | 'gold-bronze' | 'violet' | 'emerald' | 'amber' | 'indigo' | 'cyan' | 'pink';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const variantStyles = {
  gold: {
    gradient: 'from-[#D4AF37] via-[#F5E050] to-[#B8860B]',
    shadow: 'rgba(212, 175, 55, 0.4)',
  },
  blue: {
    gradient: 'from-[#0EA5E9] via-[#38BDF8] to-[#0284C7]',
    shadow: 'rgba(14, 165, 233, 0.4)',
  },
  'gold-bronze': {
    gradient: 'from-[#D4AF37] via-[#C5A059] to-[#92400E]',
    shadow: 'rgba(197, 160, 89, 0.4)',
  },
  violet: {
    gradient: 'from-[#8B5CF6] via-[#A78BFA] to-[#6D28D9]',
    shadow: 'rgba(139, 92, 246, 0.4)',
  },
  emerald: {
    gradient: 'from-[#10B981] via-[#34D399] to-[#059669]',
    shadow: 'rgba(16, 185, 129, 0.4)',
  },
  amber: {
    gradient: 'from-[#F59E0B] via-[#FBBF24] to-[#D97706]',
    shadow: 'rgba(245, 158, 11, 0.4)',
  },
  indigo: {
    gradient: 'from-[#6366F1] via-[#818CF8] to-[#4F46E5]',
    shadow: 'rgba(99, 102, 241, 0.4)',
  },
  cyan: {
    gradient: 'from-[#06B6D4] via-[#22D3EE] to-[#0891B2]',
    shadow: 'rgba(6, 182, 212, 0.4)',
  },
  pink: {
    gradient: 'from-[#EC4899] via-[#F472B6] to-[#DB2777]',
    shadow: 'rgba(236, 72, 153, 0.4)',
  },
};

const sizeStyles = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-11 h-11 rounded-xl',
  lg: 'w-14 h-14 rounded-2xl',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export const Widget3DIcon: React.FC<Widget3DIconProps> = ({
  icon: Icon,
  variant,
  size = 'md',
  pulse = false,
  className,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        sizeStyles[size],
        `bg-gradient-to-br ${styles.gradient}`,
        'transition-all duration-300',
        // Hover effect
        'hover:scale-105',
        // Pulse animation for notifications
        pulse && 'animate-glow-pulse',
        className
      )}
      style={{
        boxShadow: `0 4px 16px ${styles.shadow}, 0 8px 24px -8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.15)`,
      }}
    >
      {/* Inner highlight for 3D depth */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/25 to-transparent" />
      
      {/* Icon */}
      <Icon className={cn(iconSizes[size], 'text-white drop-shadow-sm relative z-10')} />
      
      {/* Subtle inner shadow at bottom for 3D effect */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  );
};

export default Widget3DIcon;
