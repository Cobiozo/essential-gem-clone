import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Share2, icons } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  showShareButton?: boolean;
  className?: string;
  // Styling props from CMS Section
  sectionStyle?: {
    background_color?: string | null;
    text_color?: string | null;
    font_size?: number | null;
    alignment?: string | null;
    padding?: number | null;
    margin?: number | null;
    border_radius?: number | null;
    style_class?: string | null;
    background_gradient?: string | null;
    border_width?: number | null;
    border_color?: string | null;
    border_style?: string | null;
    box_shadow?: string | null;
    opacity?: number | null;
    width_type?: string | null;
    custom_width?: number | null;
    height_type?: string | null;
    custom_height?: number | null;
    max_width?: number | null;
    font_weight?: number | null;
    line_height?: number | null;
    letter_spacing?: number | null;
    text_transform?: string | null;
    display_type?: string | null;
    justify_content?: string | null;
    align_items?: string | null;
    gap?: number | null;
    // New enhanced options
    section_margin_top?: number | null;
    section_margin_bottom?: number | null;
    background_image?: string | null;
    background_image_opacity?: number | null;
    background_image_position?: string | null;
    background_image_size?: string | null;
    icon_name?: string | null;
    icon_position?: string | null;
    icon_size?: number | null;
    icon_color?: string | null;
    show_icon?: boolean | null;
    content_direction?: string | null;
    content_wrap?: string | null;
    min_height?: number | null;
    overflow_behavior?: string | null;
  };
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  showShareButton = false,
  className,
  sectionStyle
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (navigator.share) {
      navigator.share({
        title: `${title} - Pure Life`,
        text: `Sprawdź sekcję: ${title}`,
        url: window.location.href,
      }).catch(() => {
        fallbackShare();
      });
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast({
        title: t('share.copied'),
      });
    });
  };

  // Build custom styles from section properties
  const customContainerStyle = sectionStyle ? {
    backgroundColor: sectionStyle.background_gradient ? 'transparent' : sectionStyle.background_color || 'white',
    backgroundImage: sectionStyle.background_gradient ? sectionStyle.background_gradient : 
                      sectionStyle.background_image ? `url(${sectionStyle.background_image})` : 'none',
    backgroundPosition: sectionStyle.background_image_position || 'center',
    backgroundSize: sectionStyle.background_image_size || 'cover',
    backgroundRepeat: 'no-repeat',
    borderWidth: `${sectionStyle.border_width || 1}px`,
    borderStyle: sectionStyle.border_style || 'solid',
    borderColor: sectionStyle.border_color || '#e5e7eb',
    borderRadius: `${sectionStyle.border_radius || 8}px`,
    boxShadow: sectionStyle.box_shadow || '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    opacity: (sectionStyle.opacity || 100) / 100,
    width: sectionStyle.width_type === 'custom' ? `${sectionStyle.custom_width}px` : '100%',
    maxWidth: `${sectionStyle.max_width || 1200}px`,
    marginTop: `${sectionStyle.section_margin_top || 24}px`,
    marginBottom: `${sectionStyle.section_margin_bottom || 24}px`,
    marginLeft: 'auto',
    marginRight: 'auto',
    overflow: sectionStyle.overflow_behavior as any || 'visible',
    position: 'relative' as const,
  } : {};

  // Header styles - height settings apply here when collapsed
  const customHeaderStyle = sectionStyle ? {
    backgroundColor: sectionStyle.background_gradient ? 'transparent' : sectionStyle.background_color || 'white',
    backgroundImage: sectionStyle.background_gradient ? sectionStyle.background_gradient : 
                      sectionStyle.background_image ? `url(${sectionStyle.background_image})` : 'none',
    backgroundPosition: sectionStyle.background_image_position || 'center',
    backgroundSize: sectionStyle.background_image_size || 'cover',
    backgroundRepeat: 'no-repeat',
    height: !isOpen && sectionStyle.height_type === 'custom' ? `${sectionStyle.custom_height}px` : 'auto',
    minHeight: !isOpen ? `${sectionStyle.min_height || 0}px` : 'auto',
    padding: `${sectionStyle.padding || 16}px`,
    display: sectionStyle.display_type || 'flex',
    flexDirection: sectionStyle.content_direction as any || 'row',
    flexWrap: sectionStyle.content_wrap as any || 'nowrap',
    justifyContent: sectionStyle.justify_content || 'space-between',
    alignItems: sectionStyle.align_items || 'center',
    gap: `${sectionStyle.gap || 16}px`,
    color: sectionStyle.text_color || '#374151',
    fontSize: `${sectionStyle.font_size || 18}px`,
    fontWeight: sectionStyle.font_weight || 600,
    lineHeight: sectionStyle.line_height || 1.5,
    letterSpacing: `${sectionStyle.letter_spacing || 0}px`,
    textTransform: (sectionStyle.text_transform || 'none') as React.CSSProperties['textTransform'],
    textAlign: (sectionStyle.alignment || 'left') as React.CSSProperties['textAlign'],
  } : {};

  // Background image overlay for opacity
  const backgroundImageOverlay = sectionStyle?.background_image && sectionStyle?.background_image_opacity !== 100 ? {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: sectionStyle.background_color || 'transparent',
    opacity: (100 - (sectionStyle.background_image_opacity || 100)) / 100,
    pointerEvents: 'none' as const,
  } : undefined;

  const customContentStyle = sectionStyle ? {
    padding: `${sectionStyle.padding || 24}px`,
  } : {};

  // Get Lucide icon component
  const IconComponent = sectionStyle?.show_icon && sectionStyle?.icon_name ? 
    (icons as any)[sectionStyle.icon_name] : null;

  return (
    <div 
      className={cn("border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm", className, sectionStyle?.style_class)}
      style={customContainerStyle}
    >
      {backgroundImageOverlay && <div style={backgroundImageOverlay} />}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left hover:bg-gray-100 transition-colors flex justify-between items-center relative z-10"
        style={customHeaderStyle}
      >
        <div className="flex items-center space-x-2 pr-2">
          {IconComponent && sectionStyle?.icon_position === 'left' && (
            <IconComponent 
              className="flex-shrink-0"
              size={sectionStyle.icon_size || 24}
              color={sectionStyle.icon_color || 'currentColor'}
            />
          )}
          <h3 
            className="text-base sm:text-lg font-semibold text-gray-800"
          >
            {title}
          </h3>
          {IconComponent && sectionStyle?.icon_position === 'right' && (
            <IconComponent 
              className="flex-shrink-0"
              size={sectionStyle.icon_size || 24}
              color={sectionStyle.icon_color || 'currentColor'}
            />
          )}
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          {showShareButton && (
            <div 
              onClick={handleShare}
              aria-label={t('share.section')}
              className="p-1 sm:p-2 h-6 w-6 sm:h-8 sm:w-8 text-gray-600 hover:text-gray-800 cursor-pointer rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          )}
        </div>
      </button>
      {isOpen && (
        <div 
          className="px-4 sm:px-6 py-4 border-t border-gray-200 relative z-10"
          style={customContentStyle}
        >
          {IconComponent && sectionStyle?.icon_position === 'top' && (
            <div className="flex justify-center mb-4">
              <IconComponent 
                size={sectionStyle.icon_size || 24}
                color={sectionStyle.icon_color || 'currentColor'}
              />
            </div>
          )}
          {children}
          {IconComponent && sectionStyle?.icon_position === 'bottom' && (
            <div className="flex justify-center mt-4">
              <IconComponent 
                size={sectionStyle.icon_size || 24}
                color={sectionStyle.icon_color || 'currentColor'}
              />
            </div>
          )}
          {showShareButton && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="text-gray-600 border-gray-300 text-xs sm:text-sm"
              >
                <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                {t('common.share')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};