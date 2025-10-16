import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Share2, icons } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CMSContent } from '@/components/CMSContent';
import { CMSSection, CMSItem } from '@/types/cms';
import { useIsMobile } from '@/hooks/use-mobile';
import type { DeviceType } from '@/components/dnd/DevicePreview';
interface CollapsibleSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  showShareButton?: boolean;
  className?: string;
  nestedSections?: CMSSection[]; // Sekcje zagnieżdżone
  nestedItems?: CMSItem[]; // Elementy do sekcji zagnieżdżonych
  disableToggle?: boolean; // Gdy true, ignoruje kliknięcia nagłówka (np. podczas drag)
  isOpen?: boolean; // sterowane z zewnątrz
  onOpenChange?: (open: boolean) => void; // callback
  currentDevice?: DeviceType;
  variant?: 'default' | 'modern'; // Visual style variant
  isEditMode?: boolean; // Whether in edit mode
  onTitleChange?: (newTitle: string) => void; // Callback when title changes
  onDescriptionChange?: (newDescription: string) => void; // Callback when description changes
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
  sectionStyle,
  nestedSections = [],
  nestedItems = [],
  disableToggle = false,
  isOpen: controlledOpen,
  onOpenChange,
  currentDevice,
  variant = 'default',
  isEditMode = false,
  onTitleChange,
  onDescriptionChange,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [tempDescription, setTempDescription] = useState(description || '');
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  
  // Synchronize internal state with defaultOpen prop changes
  useEffect(() => {
    setInternalOpen(defaultOpen);
  }, [defaultOpen]);
  
  const isOpen = typeof controlledOpen === 'boolean' ? controlledOpen : internalOpen;
  const setOpen = (open: boolean) => {
    if (typeof controlledOpen === 'boolean') {
      onOpenChange?.(open);
    } else {
      setInternalOpen(open);
    }
  };
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
  const effectiveDevice: DeviceType = (currentDevice as DeviceType) ?? (useIsMobile() ? 'mobile' : 'desktop');
  const isMobile = effectiveDevice !== 'desktop';
  const borderRadiusValue = `${sectionStyle?.border_radius || 16}px`;
  const customContainerStyle = sectionStyle ? {
    backgroundColor: 'transparent',
    borderRadius: borderRadiusValue,
    boxShadow: sectionStyle.box_shadow || '0 4px 20px rgba(0, 0, 0, 0.08)',
    opacity: (sectionStyle.opacity || 100) / 100,
    width: isMobile
      ? '100%'
      : (sectionStyle.width_type === 'custom' ? `${sectionStyle.custom_width}px` : '100%'),
    minHeight: (!isOpen && sectionStyle.height_type === 'custom') ? `${sectionStyle.custom_height}px` : 'auto',
    height: 'auto',
    maxWidth: isMobile ? '100%' : 'none',
    marginTop: `${sectionStyle.section_margin_top || 16}px`,
    marginBottom: `${sectionStyle.section_margin_bottom || 16}px`,
    marginLeft: 'auto',
    marginRight: 'auto',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: `all ${sectionStyle.hover_transition_duration || 300}ms ease-in-out`,
  } : {
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 300ms ease-in-out',
  };

  // Header styles - modern card header design
  const customHeaderStyle = sectionStyle ? {
    flex: 'none',
    backgroundColor: sectionStyle.background_gradient ? 'transparent' : sectionStyle.background_color || 'white',
    backgroundImage: sectionStyle.background_gradient ? sectionStyle.background_gradient : 
                      sectionStyle.background_image ? `url(${sectionStyle.background_image})` : 'none',
    backgroundPosition: sectionStyle.background_image_position || 'center',
    backgroundSize: sectionStyle.background_image_size || 'cover',
    backgroundRepeat: 'no-repeat',
    height: 'auto',
    minHeight: (!isOpen) ? `${Math.max(sectionStyle.min_height || 200, 200)}px` : '80px',
    borderRadius: isOpen ? `${borderRadiusValue} ${borderRadiusValue} 0 0` : borderRadiusValue,
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
  } : {
    // Default modern card header
    flex: 'none',
    minHeight: isOpen ? '80px' : '200px',
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
    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)', // Default gradient
    borderRadius: isOpen ? '16px 16px 0 0' : '16px',
  };

  // Background image overlay (disabled as it requires absolute positioning)
  const backgroundImageOverlay = undefined;

  const customContentStyle = sectionStyle ? {
    padding: `${sectionStyle.padding || 24}px`,
    borderRadius: `0 0 ${borderRadiusValue} ${borderRadiusValue}`,
  } : {
    borderRadius: '0 0 16px 16px',
  };

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
        "group transition-all duration-300 ease-in-out hover:shadow-lg w-full clear-both",
        className, 
        sectionStyle?.style_class
      )}
      style={{
        ...customContainerStyle,
        ...hoverStyles,
        display: 'block',
        marginBottom: '2rem',
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
        onClick={(e) => {
          if (disableToggle) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          setOpen(!isOpen);
        }}
        className="w-full transition-all duration-300"
        style={customHeaderStyle}
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
        <div
          className="flex-1 flex flex-col space-y-2"
          style={{
            justifyContent: sectionStyle?.justify_content || 'center',
            alignItems: sectionStyle?.align_items || 'center',
            textAlign: (sectionStyle?.alignment as React.CSSProperties['textAlign']) || 'center',
          }}
        >
          <div className="flex items-center space-x-2 relative group">
            {IconComponent && sectionStyle?.icon_position === 'left' && (
              <IconComponent 
                size={sectionStyle.icon_size || 24}
                color={sectionStyle.icon_color || 'currentColor'}
                className="drop-shadow-sm"
              />
            )}
            {isEditMode && isEditingTitle ? (
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  onTitleChange?.(tempTitle);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false);
                    onTitleChange?.(tempTitle);
                  }
                  if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                    setTempTitle(title);
                  }
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded px-3 py-1 text-inherit focus:outline-none focus:ring-2 focus:ring-white/50"
                autoFocus
              />
            ) : (
              <div className="relative flex items-center gap-2">
                <h3 
                  className={cn(
                    "font-semibold leading-tight",
                    isEditMode && "cursor-text hover:bg-white/10 px-3 py-2 rounded transition-colors border-2 border-dashed border-white/30"
                  )}
                  dangerouslySetInnerHTML={{ __html: title }}
                  onClick={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      setIsEditingTitle(true);
                      setTempTitle(title);
                    }
                  }}
                />
                {isEditMode && !isEditingTitle && (
                  <span className="absolute -top-2 -right-8 text-xs text-white/60 bg-primary/80 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Kliknij aby edytować
                  </span>
                )}
              </div>
            )}
            {IconComponent && sectionStyle?.icon_position === 'right' && (
              <IconComponent 
                size={sectionStyle.icon_size || 24}
                color={sectionStyle.icon_color || 'currentColor'}
                className="drop-shadow-sm"
              />
            )}
          </div>
          {(description || isEditMode) && (
            <div className="relative group">
              {isEditMode && isEditingDescription ? (
                <textarea
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  onBlur={() => {
                    setIsEditingDescription(false);
                    onDescriptionChange?.(tempDescription);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsEditingDescription(false);
                      setTempDescription(description || '');
                    }
                    e.stopPropagation();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-white/20 backdrop-blur-sm border border-white/30 rounded px-3 py-2 text-sm text-inherit focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
                  rows={3}
                  autoFocus
                />
              ) : (
                <>
                  <p 
                    className={cn(
                      "text-sm opacity-90 mt-2 leading-relaxed max-w-md",
                      isEditMode && "cursor-text hover:bg-white/10 px-3 py-2 rounded transition-colors border-2 border-dashed border-white/30",
                      !description && isEditMode && "text-white/50 italic"
                    )}
                    dangerouslySetInnerHTML={{ __html: description || (isEditMode ? 'Kliknij aby dodać opis...' : '') }}
                    onClick={(e) => {
                      if (isEditMode) {
                        e.stopPropagation();
                        setIsEditingDescription(true);
                        setTempDescription(description || '');
                      }
                    }}
                  />
                  {isEditMode && !isEditingDescription && (
                    <span className="absolute -top-1 right-0 text-xs text-white/60 bg-primary/80 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Kliknij aby edytować
                    </span>
                  )}
                </>
              )}
            </div>
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
      <div 
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div 
            className="w-full px-6 py-6 bg-card border-t border-border"
            style={customContentStyle}
          >
            {children}
            
            {/* Sekcje zagnieżdżone */}
            {nestedSections && nestedSections.length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="text-lg font-semibold text-card-foreground border-b border-border pb-2">
                  Sekcje zagnieżdżone
                </h4>
                {nestedSections.map((nestedSection) => (
                  <div key={nestedSection.id} className="bg-muted rounded-lg">
                    <CollapsibleSection
                      title={nestedSection.title}
                      description={nestedSection.description || undefined}
                      sectionStyle={nestedSection}
                      className="border border-border"
                    >
                      <div className="space-y-3">
                        {nestedItems
                          .filter(item => item.section_id === nestedSection.id)
                          .map((item) => (
                            <CMSContent key={item.id} item={item} />
                          ))}
                        {nestedItems.filter(item => item.section_id === nestedSection.id).length === 0 && (
                          <div className="text-center text-muted-foreground py-4 text-sm">
                            Brak zawartości w tej sekcji
                          </div>
                        )}
                      </div>
                    </CollapsibleSection>
                  </div>
                ))}
              </div>
            )}
            
            {showShareButton && (
              <div className="mt-6 pt-4 border-t border-border flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="text-xs sm:text-sm"
                >
                  <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  {t('common.share')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};