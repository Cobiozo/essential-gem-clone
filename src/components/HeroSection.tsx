import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';

type ImageSize = 'small' | 'medium' | 'large' | 'xlarge' | 'custom';

interface HeroSectionProps {
  headerImage: string;
  headerImageDark?: string;
  headerText: string;
  authorText: string;
  showLoginButton?: boolean;
  imageSize?: ImageSize;
  customImageWidth?: number;
  customImageHeight?: number;
}

// Helper function to check if HTML content has actual visible text
const hasVisibleText = (html: string): boolean => {
  if (!html) return false;
  
  // Remove HTML tags and check if any text remains
  const textOnly = html
    .replace(/<[^>]*>/g, '')      // remove HTML tags
    .replace(/&nbsp;/g, ' ')       // replace &nbsp; with space
    .replace(/&amp;/g, '&')        // decode common entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim();
  
  return textOnly.length > 0;
};

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
  headerImageDark,
  headerText,
  authorText,
  showLoginButton = false,
  imageSize = 'medium',
  customImageWidth,
  customImageHeight,
}) => {
  const { theme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkDarkMode();
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Choose appropriate image based on theme
  const activeImage = isDarkMode && headerImageDark ? headerImageDark : headerImage;
  
  const hasTextContent = hasVisibleText(headerText) || hasVisibleText(authorText);

  return (
    <section className={cn(
      "relative bg-background",
      "mt-14 sm:mt-16",
      hasTextContent 
        ? "py-16 sm:py-20 md:py-24" 
        : "py-2 sm:py-3 md:py-4"
    )}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className={cn(
          "max-w-4xl mx-auto",
          hasTextContent ? "space-y-4 sm:space-y-6" : "space-y-0"
        )}>
          {/* Logo - switches between light/dark mode images */}
          <div className={cn(
            "flex flex-col items-center justify-center",
            hasTextContent ? "mb-4 sm:mb-6" : "mb-0"
          )}>
            <img 
              src={activeImage} 
              alt="Pure Life" 
              className={`object-contain ${imageSize !== 'custom' ? sizeClasses[imageSize] : ''}`}
              style={imageSize === 'custom' ? { 
                width: customImageWidth || 128, 
                height: customImageHeight || 128 
              } : undefined}
            />
          </div>

          {/* Description - tylko gdy jest rzeczywista treść */}
          {hasVisibleText(headerText) && (
            <div 
              className="text-xs sm:text-sm md:text-base text-foreground max-w-3xl mx-auto leading-relaxed px-4"
              dangerouslySetInnerHTML={{ __html: cleanInlineColors(headerText) }}
            />
          )}

          {/* Author */}
          {hasVisibleText(authorText) && (
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
