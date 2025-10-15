import React from 'react';
import { cn } from '@/lib/utils';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  className,
}) => {
  return (
    <div className={cn("text-center mb-8 sm:mb-12", className)}>
      <h2 className="text-2xl sm:text-3xl font-bold text-black mb-3 uppercase tracking-wide">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
};
