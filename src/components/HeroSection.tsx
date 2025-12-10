import React from 'react';
import { cn } from '@/lib/utils';

type ImageSize = 'small' | 'medium' | 'large' | 'xlarge' | 'custom';

interface HeroSectionProps {
  headerImage: string;
  headerText: string;
  authorText: string;
  showLoginButton?: boolean;
  imageSize?: ImageSize;
  customImageWidth?: number;
  customImageHeight?: number;
}

// Helper function to remove problematic inline color styles
const cleanInlineColors = (html: string): string => {
  if (!html) return html;
  // Remove color styles from inline styles
  return html.replace(/color:\s*rgb\([^)]+\);?/gi, '')
             .replace(/color:\s*#[0-9a-f]{3,6};?/gi, '')
             .replace(/color:\s*[a-z]+;?/gi, '')
             .replace(/style=""/gi, '')
             .replace(/style=''/gi, '');
};

const sizeClasses: Record<ImageSize, string> = {
  small: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
  medium: 'w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32',
  large: 'w-28 h-28 sm:w-36 sm:h-36 md:w-48 md:h-48',
  xlarge: 'w-36 h-36 sm:w-48 sm:h-48 md:w-64 md:h-64',
  custom: '',
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  headerImage,
  headerText,
  authorText,
  showLoginButton = false,
  imageSize = 'medium',
  customImageWidth,
  customImageHeight,
}) => {
  const hasTextContent = headerText || authorText;

  return (
    <section className={cn(
      "relative bg-background",
      hasTextContent 
        ? "py-16 sm:py-20 md:py-24" 
        : "py-6 sm:py-8 md:py-10"
    )}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className={cn(
          "max-w-4xl mx-auto",
          hasTextContent ? "space-y-4 sm:space-y-6" : "space-y-0"
        )}>
          {/* Logo */}
          <div className={cn(
            "flex justify-center",
            hasTextContent ? "mb-4 sm:mb-6" : "mb-0"
          )}>
            <img 
              src={headerImage} 
              alt="Pure Life" 
              className={`object-contain ${imageSize !== 'custom' ? sizeClasses[imageSize] : ''}`}
              style={imageSize === 'custom' ? { 
                width: customImageWidth || 128, 
                height: customImageHeight || 128 
              } : undefined}
            />
          </div>

          {/* Description - tylko gdy jest treść */}
          {headerText && (
            <div 
              className="text-xs sm:text-sm md:text-base text-foreground max-w-3xl mx-auto leading-relaxed px-4"
              dangerouslySetInnerHTML={{ __html: cleanInlineColors(headerText) }}
            />
          )}

          {/* Author */}
          {authorText && (
            <div 
              className="text-xs sm:text-sm text-foreground/90 px-4"
              dangerouslySetInnerHTML={{ __html: cleanInlineColors(authorText) }}
            />
          )}
        </div>
      </div>
    </section>
  );
};
