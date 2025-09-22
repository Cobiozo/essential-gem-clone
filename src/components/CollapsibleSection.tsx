import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Share2, icons } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface CollapsibleSectionProps {
  title: string;
  description?: string;
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
    // Hover states
    hover_background_color?: string | null;
    hover_background_gradient?: string | null;
    hover_text_color?: string | null;
    hover_border_color?: string | null;
    hover_box_shadow?: string | null;
    hover_opacity?: number | null;
    hover_scale?: number | null;
    hover_transition_duration?: number | null;
  };
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  description,
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

  // Build custom styles from section properties - Modern card design
  const customContainerStyle = sectionStyle ? {
    backgroundColor: sectionStyle.background_gradient ? 'transparent' : sectionStyle.background_color || 'white',
    backgroundImage: sectionStyle.background_gradient ? sectionStyle.background_gradient : 
                      sectionStyle.background_image ? `url(${sectionStyle.background_image})` : 'none',
    backgroundPosition: sectionStyle.background_image_position || 'center',
    backgroundSize: sectionStyle.background_image_size || 'cover',
    backgroundRepeat: 'no-repeat',
    borderWidth: `${sectionStyle.border_width || 0}px`,
    borderStyle: sectionStyle.border_style || 'solid',
    borderColor: sectionStyle.border_color || 'transparent',
    borderRadius: `${sectionStyle.border_radius || 16}px`, // More rounded for modern card look
    boxShadow: sectionStyle.box_shadow || '0 4px 20px rgba(0, 0, 0, 0.08)', // Modern card shadow
    opacity: (sectionStyle.opacity || 100) / 100,
    width: sectionStyle.width_type === 'custom' ? `${sectionStyle.custom_width}px` : '100%',
    maxWidth: `${sectionStyle.max_width || 1200}px`,
    marginTop: `${sectionStyle.section_margin_top || 16}px`,
    marginBottom: `${sectionStyle.section_margin_bottom || 16}px`,
    marginLeft: 'auto',
    marginRight: 'auto',
    overflow: 'hidden', // Ensure rounded corners clip backgrounds and overlays
    position: 'relative' as const,
    cursor: 'pointer',
    transition: `all ${sectionStyle.hover_transition_duration || 300}ms ease-in-out`,
    // Base card styles
    display: 'flex',
    flexDirection: 'column' as const,
  } : {
    // Default modern card styles when no custom styles
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 300ms ease-in-out',
    display: 'flex',
    flexDirection: 'column' as const,
  };

  // Header styles - modern card header design
  const customHeaderStyle = sectionStyle ? {
    flex: 1,
    backgroundColor: sectionStyle.background_gradient ? 'transparent' : sectionStyle.background_color || 'white',
    backgroundImage: sectionStyle.background_gradient ? sectionStyle.background_gradient : 
                      sectionStyle.background_image ? `url(${sectionStyle.background_image})` : 'none',
    backgroundPosition: sectionStyle.background_image_position || 'center',
    backgroundSize: sectionStyle.background_image_size || 'cover',
    backgroundRepeat: 'no-repeat',
    height: !isOpen && sectionStyle.height_type === 'custom' ? `${sectionStyle.custom_height}px` : (!isOpen ? 'auto' : 'auto'),
    minHeight: !isOpen ? `${Math.max(sectionStyle.min_height || 200, 200)}px` : 'auto', // Minimum card height
    padding: `${sectionStyle.padding || 32}px`,
    display: 'flex',
    flexDirection: sectionStyle.content_direction as any || 'column',
    flexWrap: sectionStyle.content_wrap as any || 'nowrap',
    justifyContent: sectionStyle.justify_content || 'center',
    alignItems: sectionStyle.align_items || 'center',
    gap: `${sectionStyle.gap || 16}px`,
    color: sectionStyle.text_color || 'white',
    fontSize: `${sectionStyle.font_size || 20}px`,
    fontWeight: sectionStyle.font_weight || 600,
    lineHeight: sectionStyle.line_height || 1.5,
    letterSpacing: `${sectionStyle.letter_spacing || 0}px`,
    textTransform: (sectionStyle.text_transform || 'none') as React.CSSProperties['textTransform'],
    textAlign: (sectionStyle.alignment || 'center') as React.CSSProperties['textAlign'],
    transition: `all ${sectionStyle.hover_transition_duration || 300}ms ease-in-out`,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    position: 'relative' as const,
  } : {
    // Default modern card header
    flex: 1,
    minHeight: '200px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    color: 'white',
    fontSize: '20px',
    fontWeight: 600,
    textAlign: 'center' as const,
    transition: 'all 300ms ease-in-out',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Default gradient
  };

  // Background image overlay for opacity
  const backgroundImageOverlay = sectionStyle?.background_image && sectionStyle?.background_image_opacity !== 100 ? {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: sectionStyle.background_color || 'transparent',
    opacity: (100 - (sectionStyle.background_image_opacity || 100)) / 100,
    borderRadius: `${sectionStyle?.border_radius || 16}px`,
    pointerEvents: 'none' as const,
  } : undefined;

  const customContentStyle = sectionStyle ? {
    padding: `${sectionStyle.padding || 24}px`,
  } : {};

  // Get Lucide icon component
  const IconComponent = sectionStyle?.show_icon && sectionStyle?.icon_name ? 
    (icons as any)[sectionStyle.icon_name] : null;

  // Build hover styles
  const hoverStyles = sectionStyle ? {
    '--hover-bg': sectionStyle.hover_background_gradient || sectionStyle.hover_background_color || 'inherit',
    '--hover-text': sectionStyle.hover_text_color || 'inherit',
    '--hover-border': sectionStyle.hover_border_color || 'inherit',
    '--hover-shadow': sectionStyle.hover_box_shadow || 'inherit',
    '--hover-opacity': (sectionStyle.hover_opacity || 100) / 100,
    '--hover-scale': sectionStyle.hover_scale || 1,
  } : {};

  return (
    <div 
      className={cn(
        "group transition-all duration-300 ease-in-out hover:shadow-lg",
        className, 
        sectionStyle?.style_class
      )}
      style={{
        ...customContainerStyle,
        ...hoverStyles,
      }}
      onMouseEnter={(e) => {
        if (sectionStyle?.hover_scale && sectionStyle.hover_scale !== 1) {
          e.currentTarget.style.transform = `scale(${sectionStyle.hover_scale})`;
        }
        if (sectionStyle?.hover_box_shadow) {
          e.currentTarget.style.boxShadow = sectionStyle.hover_box_shadow;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = sectionStyle?.box_shadow || '0 4px 20px rgba(0, 0, 0, 0.08)';
      }}
    >
      {backgroundImageOverlay && <div style={backgroundImageOverlay} />}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-10 group-hover:scale-[1.02] transition-all duration-300"
        style={{
          ...customHeaderStyle,
          background: !isOpen && sectionStyle?.background_gradient ? sectionStyle.background_gradient : customHeaderStyle.backgroundColor,
        }}
        onMouseEnter={(e) => {
          if (sectionStyle?.hover_background_gradient) {
            e.currentTarget.style.backgroundImage = sectionStyle.hover_background_gradient;
          } else if (sectionStyle?.hover_background_color) {
            e.currentTarget.style.backgroundColor = sectionStyle.hover_background_color;
          }
          if (sectionStyle?.hover_text_color) {
            e.currentTarget.style.color = sectionStyle.hover_text_color;
          }
        }}
        onMouseLeave={(e) => {
          if (sectionStyle?.background_gradient) {
            e.currentTarget.style.backgroundImage = sectionStyle.background_gradient;
          } else {
            e.currentTarget.style.backgroundColor = sectionStyle?.background_color || 'white';
          }
          e.currentTarget.style.color = sectionStyle?.text_color || 'white';
        }}
      >
        {/* Icon at top */}
        {IconComponent && sectionStyle?.icon_position === 'top' && (
          <div className="flex justify-center mb-4">
            <IconComponent 
              size={sectionStyle.icon_size || 48}
              color={sectionStyle.icon_color || 'currentColor'}
              className="drop-shadow-sm"
            />
          </div>
        )}
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-2">
          <div className="flex items-center space-x-2">
            {IconComponent && sectionStyle?.icon_position === 'left' && (
              <IconComponent 
                size={sectionStyle.icon_size || 24}
                color={sectionStyle.icon_color || 'currentColor'}
                className="drop-shadow-sm"
              />
            )}
            <h3 className="font-semibold leading-tight" dangerouslySetInnerHTML={{ __html: title }} />
            {IconComponent && sectionStyle?.icon_position === 'right' && (
              <IconComponent 
                size={sectionStyle.icon_size || 24}
                color={sectionStyle.icon_color || 'currentColor'}
                className="drop-shadow-sm"
              />
            )}
          </div>
          {description && (
            <p className="text-sm opacity-90 mt-2 leading-relaxed max-w-md">
              {description}
            </p>
          )}
        </div>

        {/* Controls at bottom right */}
        <div className="absolute top-4 right-4 flex items-center space-x-1 opacity-70 hover:opacity-100 transition-opacity">
          {showShareButton && (
            <div 
              onClick={handleShare}
              aria-label={t('share.section')}
              className="p-2 rounded-full hover:bg-white/20 cursor-pointer transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </div>
          )}
          <div className="p-2 rounded-full hover:bg-white/20 transition-colors">
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Icon at bottom */}
        {IconComponent && sectionStyle?.icon_position === 'bottom' && (
          <div className="flex justify-center mt-4">
            <IconComponent 
              size={sectionStyle.icon_size || 24}
              color={sectionStyle.icon_color || 'currentColor'}
              className="drop-shadow-sm"
            />
          </div>
        )}
      </button>
      {isOpen && (
        <div 
          className="px-6 py-6 bg-white relative z-10 border-t border-gray-100"
          style={customContentStyle}
        >
          {children}
          {showShareButton && (
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
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