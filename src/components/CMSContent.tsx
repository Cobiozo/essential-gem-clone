import React from 'react';
import { CMSButton } from './CMSButton';
import { SecureMedia } from './SecureMedia';
import { FormattedText } from './FormattedText';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ContentCell, CMSItem } from '@/types/cms';
import { CollapsibleSection } from './CollapsibleSection';
import { isExternalUrl, openUrl } from '@/lib/urlUtils';
import * as icons from 'lucide-react';
import { ChevronRight, ChevronDown, Circle } from 'lucide-react';
import { CarouselElement } from './elements/CarouselElement';
import { AccordionElement } from './elements/AccordionElement';
import { CounterElement } from './elements/CounterElement';
import { ProgressBarElement } from './elements/ProgressBarElement';
import { RatingElement } from './elements/RatingElement';
import { GalleryElement } from './elements/GalleryElement';
import { SocialIconsElement } from './elements/SocialIconsElement';
import { AlertElement } from './elements/AlertElement';
import { TestimonialElement } from './elements/TestimonialElement';
import { ToggleContainerElement } from './elements/ToggleContainerElement';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useTheme } from '@/components/ThemeProvider';
import { isProblematicColor, sanitizeHtmlForDarkMode } from '@/lib/colorUtils';

interface CMSContentProps {
  item: CMSItem;
  onClick?: (title: string, url?: string) => void;
  isEditMode?: boolean;
}

export const CMSContent: React.FC<CMSContentProps> = ({ item, onClick, isEditMode = false }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleClick = () => {
    if (onClick) {
      onClick(item.title || '', item.url || undefined);
    }
  };

  const renderMedia = () => {
    if (!item.media_url || !item.media_type) return null;
    
    return (
      <SecureMedia
        mediaUrl={item.media_url}
        mediaType={item.media_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
        altText={item.media_alt_text || item.title || 'Zabezpieczone media'}
        className="w-full max-w-md mx-auto shadow-lg mb-4"
      />
    );
  };

  // Helper to apply item styles with dark mode detection
  // Używa TYLKO kolumn istniejących w bazie danych cms_items
  const applyItemStyles = (item: CMSItem) => {
    const inlineStyles: React.CSSProperties = {};
    
    // Kolor tekstu (z obsługą dark mode)
    if (item.text_color && !isProblematicColor(item.text_color, isDarkMode, 'text')) {
      inlineStyles.color = item.text_color;
    }
    
    // Kolor tła
    if (item.background_color && !isProblematicColor(item.background_color, isDarkMode, 'background')) {
      inlineStyles.backgroundColor = item.background_color;
    }
    
    // Typografia
    if (item.font_size) inlineStyles.fontSize = `${item.font_size}px`;
    if (item.font_weight) inlineStyles.fontWeight = item.font_weight;
    if (item.text_align) inlineStyles.textAlign = item.text_align as React.CSSProperties['textAlign'];
    
    // Odstępy
    if (item.padding) inlineStyles.padding = `${item.padding}px`;
    if (item.margin_top) inlineStyles.marginTop = `${item.margin_top}px`;
    if (item.margin_bottom) inlineStyles.marginBottom = `${item.margin_bottom}px`;
    
    // Box shadow
    if (item.box_shadow && item.box_shadow !== 'none') inlineStyles.boxShadow = item.box_shadow;
    
    // Wymiary (tylko max, obsługiwane w bazie)
    if (item.max_width) inlineStyles.maxWidth = `${item.max_width}px`;
    if (item.max_height) inlineStyles.maxHeight = `${item.max_height}px`;
    
    // Obramowanie
    if (item.border_width && item.border_width > 0) {
      inlineStyles.borderWidth = `${item.border_width}px`;
      inlineStyles.borderStyle = (item.border_style || 'solid') as React.CSSProperties['borderStyle'];
      inlineStyles.borderColor = item.border_color || 'hsl(var(--border))';
    }
    if (item.border_radius) inlineStyles.borderRadius = `${item.border_radius}px`;
    
    // Przezroczystość
    if (item.opacity !== undefined && item.opacity !== null && item.opacity !== 100) {
      inlineStyles.opacity = item.opacity / 100;
    }
    
    // Object fit (dla obrazów / wideo)
    if (item.object_fit) inlineStyles.objectFit = item.object_fit as React.CSSProperties['objectFit'];
    
    return {
      style: inlineStyles,
      className: item.style_class || '',
      hoverScale: item.hover_scale as number | undefined,
      hoverOpacity: item.hover_opacity as number | undefined,
      lazyLoading: item.lazy_loading,
    };
  };

  switch (item.type) {
    case 'header_text':
      return (
        <div className="mb-3 sm:mb-4">
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm lg:text-base text-muted-foreground leading-relaxed"
            as="p"
          />
        </div>
      );

    case 'author':
      return (
        <div className="mb-3 sm:mb-4">
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm text-muted-foreground"
            as="p"
          />
        </div>
      );

    case 'info_text':
      return (
        <div className="mb-3 sm:mb-4 p-3 bg-accent/10 rounded-lg border-l-4 border-accent">
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm lg:text-base text-foreground leading-relaxed"
            as="p"
          />
        </div>
      );

    case 'tip':
      return (
        <div className="mt-3 sm:mt-4 p-3 bg-primary/10 rounded-lg border-l-4 border-primary">
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm lg:text-base text-foreground leading-relaxed"
            as="p"
          />
        </div>
      );

    case 'description':
      return (
        <div className="mb-3 sm:mb-4">
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm lg:text-base text-muted-foreground leading-relaxed"
            as="p"
          />
        </div>
      );

    case 'contact_info':
      return (
        <div className="mb-3 sm:mb-4 p-3 bg-accent/10 rounded-lg border-l-4 border-accent">
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm lg:text-base text-foreground leading-relaxed"
            as="p"
          />
        </div>
      );

    case 'support_info':
      return (
        <div className="mb-3 sm:mb-4 p-3 bg-muted rounded-lg border-l-4 border-muted-foreground">
          {renderMedia()}
          <FormattedText
            text={item.description || ''}
            formatting={item.text_formatting}
            className="text-xs sm:text-sm lg:text-base text-foreground leading-relaxed"
            as="p"
          />
        </div>
      );

    case 'multi_cell':
      if (!item.cells || item.cells.length === 0) {
        return <div className="text-muted-foreground text-sm">Brak aktywnych komórek</div>;
      }

      const activeCells = item.cells
        .filter(cell => cell.is_active !== false)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      const handleCellClick = (cell: ContentCell) => {
        if (cell.type.includes('button') && cell.url) {
          if (cell.type === 'button_anchor' && onClick) {
            // Handle anchor links (internal page sections)
            onClick(cell.content, cell.url);
          } else if (cell.type === 'button_external' || isExternalUrl(cell.url)) {
            // Handle external links
            window.open(cell.url, '_blank', 'noopener,noreferrer');
          } else if (cell.type === 'button_functional' && onClick) {
            // Handle functional buttons
            onClick(cell.content, cell.url);
          } else {
            // Handle internal links
            window.location.href = cell.url;
          }
        }
      };

      return (
        <div className="space-y-3">
          {activeCells.map((cell) => {
            switch (cell.type) {
              case 'header':
                 return (
                   <h3 
                     key={cell.id} 
                     className="text-lg font-semibold text-foreground leading-tight"
                     dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(cell.content, isDarkMode) }}
                   />
                 );
              
               case 'description':
                 return (
                   <p 
                     key={cell.id} 
                     className="text-sm text-muted-foreground leading-relaxed"
                     dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(cell.content, isDarkMode) }}
                   />
                 );
              
               case 'list_item':
                 return (
                   <div key={cell.id} className="flex items-start space-x-2">
                     <span className="text-primary mt-1">•</span>
                     <span 
                       className="text-sm leading-relaxed text-foreground"
                       dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(cell.content, isDarkMode) }}
                     />
                   </div>
                 );

              case 'section':
                // Helper function to render sub-cells inside nested section
                const renderSubCell = (subCell: ContentCell) => {
                  const subAlignment = subCell.alignment || 'left';
                  const subAlignmentClass = subAlignment === 'center' ? 'flex justify-center w-full' 
                    : subAlignment === 'right' ? 'flex justify-end w-full'
                    : subAlignment === 'full' ? 'w-full' 
                    : 'flex justify-start';
                  
                  switch (subCell.type) {
                    case 'header':
                      return (
                        <h4 
                          key={subCell.id} 
                          className="text-base font-semibold text-foreground leading-tight"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(subCell.content, isDarkMode) }}
                        />
                      );
                    case 'description':
                    case 'text':
                      return (
                        <p 
                          key={subCell.id} 
                          className="text-sm text-muted-foreground leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(subCell.content, isDarkMode) }}
                        />
                      );
                    case 'list_item':
                      return (
                        <div key={subCell.id} className="flex items-start space-x-2">
                          <span className="text-primary mt-1">•</span>
                          <span 
                            className="text-sm leading-relaxed text-foreground"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(subCell.content, isDarkMode) }}
                          />
                        </div>
                      );
                    case 'image':
                      if (!subCell.media_url) return null;
                      const imgStyle: React.CSSProperties = {};
                      if (subCell.width) imgStyle.width = `${subCell.width}px`;
                      if (subCell.height_px) imgStyle.height = `${subCell.height_px}px`;
                      if (subCell.max_width) imgStyle.maxWidth = `${subCell.max_width}px`;
                      if (subCell.max_height) imgStyle.maxHeight = `${subCell.max_height}px`;
                      if (subCell.object_fit) imgStyle.objectFit = subCell.object_fit as any;
                      if (subCell.border_radius) imgStyle.borderRadius = `${subCell.border_radius}px`;
                      return (
                        <div key={subCell.id} className={subAlignmentClass}>
                          <img 
                            src={subCell.media_url} 
                            alt={subCell.media_alt || ''} 
                            className="rounded"
                            style={imgStyle}
                          />
                        </div>
                      );
                    case 'video':
                      if (!subCell.media_url) return null;
                      const isYouTubeSubCell = subCell.media_url.includes('youtube.com') || subCell.media_url.includes('youtu.be');
                      const isLibraryVideoSubCell = subCell.video_source === 'library' || (!isYouTubeSubCell && !subCell.media_url.includes('http'));
                      
                      if (isYouTubeSubCell) {
                        const videoId = subCell.media_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                        return (
                          <div key={subCell.id} className={subAlignmentClass}>
                            <div className="relative w-full aspect-video rounded overflow-hidden" style={{
                              maxWidth: subCell.max_width ? `${subCell.max_width}px` : undefined,
                              maxHeight: subCell.max_height ? `${subCell.max_height}px` : undefined,
                              borderRadius: subCell.border_radius ? `${subCell.border_radius}px` : undefined,
                            }}>
                              <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                className="absolute inset-0 w-full h-full"
                                allowFullScreen
                              />
                            </div>
                          </div>
                        );
                      }
                      
                      // Local/library video - use HTML5 video
                      const videoStyle: React.CSSProperties = {
                        maxWidth: subCell.max_width ? `${subCell.max_width}px` : '100%',
                        maxHeight: subCell.max_height ? `${subCell.max_height}px` : undefined,
                        borderRadius: subCell.border_radius ? `${subCell.border_radius}px` : undefined,
                      };
                      
                      return (
                        <div key={subCell.id} className={subAlignmentClass}>
                          <video 
                            src={subCell.media_url} 
                            controls={subCell.controls !== false}
                            autoPlay={subCell.autoplay === true}
                            loop={subCell.loop === true}
                            muted={subCell.muted !== false}
                            playsInline
                            className="w-full rounded"
                            style={videoStyle}
                          />
                        </div>
                      );
                    case 'spacer':
                      return <div key={subCell.id} style={{ height: `${subCell.height || 24}px` }} />;
                    case 'divider':
                      return <Separator key={subCell.id} className="my-2" />;
                    case 'icon':
                      const SubIcon = (icons as any)[subCell.content] || icons.Star;
                      return (
                        <div key={subCell.id} className={subAlignmentClass}>
                          <SubIcon className="w-6 h-6 text-primary" />
                        </div>
                      );
                    case 'button_functional':
                    case 'button_anchor':
                    case 'button_external':
                      return (
                        <div key={subCell.id} className={subAlignmentClass}>
                          <Button
                            onClick={() => handleCellClick(subCell)}
                            variant="default"
                            size="sm"
                          >
                            {subCell.content || 'Kliknij'}
                          </Button>
                        </div>
                      );
                    case 'gallery':
                      if (!subCell.items || subCell.items.length === 0) return null;
                      return (
                        <div key={subCell.id} className={cn("grid gap-2", `grid-cols-${subCell.columns || 3}`)}>
                          {subCell.items.map((img, idx) => (
                            <img key={idx} src={img.url} alt={img.alt || ''} className="rounded object-cover aspect-square" />
                          ))}
                        </div>
                      );
                    case 'carousel':
                      if (!subCell.items || subCell.items.length === 0) return null;
                      return (
                        <div key={subCell.id} className="flex gap-2 overflow-x-auto">
                          {subCell.items.map((img, idx) => (
                            <img key={idx} src={img.url} alt={img.alt || ''} className="h-24 rounded object-cover" />
                          ))}
                        </div>
                      );
                    default:
                      return (
                        <div key={subCell.id} className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(subCell.content, isDarkMode) }} />
                      );
                  }
                };

                if (!cell.section_items || cell.section_items.length === 0) {
                  return (
                     <div key={cell.id} className="border rounded-lg p-4 my-4 bg-muted/30">
                       <h4 
                         className="font-semibold mb-2 text-foreground"
                         dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(cell.section_title || cell.content, isDarkMode) }}
                       />
                       {cell.section_description && (
                         <p 
                           className="text-sm text-muted-foreground mb-2"
                           dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(cell.section_description, isDarkMode) }}
                         />
                       )}
                       <p className="text-sm text-muted-foreground">Brak elementów w tej sekcji</p>
                     </div>
                  );
                }
                
                return (
                  <CollapsibleSection
                    key={cell.id}
                    title={cell.section_title || cell.content}
                    description={cell.section_description}
                    defaultOpen={true}
                    className="border rounded-lg p-4 my-4 bg-muted/30"
                  >
                    <div className="space-y-2">
                      {cell.section_items.filter(sectionItem => sectionItem.is_active !== false).map((sectionItem) => 
                        renderSubCell(sectionItem)
                      )}
                    </div>
                  </CollapsibleSection>
                );
              
              case 'button_functional':
              case 'button_anchor':
              case 'button_external':
                // Styl szerokości
                const btnCellStyle: React.CSSProperties = {};
                let btnWidthClass = '';
                
                if (cell.width_type === 'full') {
                  btnWidthClass = 'w-full';
                } else if (cell.width_type === 'custom' && cell.width) {
                  btnCellStyle.width = `${cell.width}px`;
                }
                
                // Kolory
                if (cell.background_color) {
                  btnCellStyle.backgroundColor = cell.background_color;
                  btnCellStyle.borderColor = cell.background_color;
                }
                if (cell.text_color) {
                  btnCellStyle.color = cell.text_color;
                }
                if (cell.font_size) {
                  btnCellStyle.fontSize = `${cell.font_size}px`;
                }
                if (cell.font_family) {
                  btnCellStyle.fontFamily = cell.font_family;
                }
                
                // Wyrównanie kontenera
                const btnAlignment = cell.alignment || 'left';
                const btnAlignClass = btnAlignment === 'center' ? 'flex justify-center w-full' 
                  : btnAlignment === 'right' ? 'flex justify-end w-full'
                  : btnAlignment === 'full' ? 'w-full' 
                  : '';
                
                // Ikona
                const BtnCellIcon = cell.icon ? (icons as any)[cell.icon] : null;
                const iconSize = cell.icon_size || 16;
                const iconSpacing = cell.icon_spacing || 8;
                
                return (
                  <div key={cell.id} className={btnAlignClass}>
                    <Button
                      onClick={() => handleCellClick(cell)}
                      variant={cell.background_color ? undefined : (cell.type === 'button_external' ? 'outline' : 'default')}
                      size="sm"
                      className={`${btnWidthClass} justify-center`}
                      style={btnCellStyle}
                    >
                      {BtnCellIcon && cell.icon_position !== 'after' && (
                        <BtnCellIcon style={{ width: iconSize, height: iconSize, marginRight: iconSpacing }} />
                      )}
                      {cell.content}
                      {BtnCellIcon && cell.icon_position === 'after' && (
                        <BtnCellIcon style={{ width: iconSize, height: iconSize, marginLeft: iconSpacing }} />
                      )}
                    </Button>
                  </div>
                );
              
              case 'text':
                return (
                  <p 
                    key={cell.id || `cell-${Math.random()}`} 
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: cell.content }}
                  />
                );
              
              case 'image':
                if (!cell.media_url) return null;
                const imgCellStyle: React.CSSProperties = {};
                if (cell.width) imgCellStyle.width = `${cell.width}px`;
                if (cell.height_px) imgCellStyle.height = `${cell.height_px}px`;
                if (cell.max_width) imgCellStyle.maxWidth = `${cell.max_width}px`;
                if (cell.max_height) imgCellStyle.maxHeight = `${cell.max_height}px`;
                if (cell.object_fit) imgCellStyle.objectFit = cell.object_fit as any;
                if (cell.border_radius) imgCellStyle.borderRadius = `${cell.border_radius}px`;
                const imgAlignment = cell.alignment || 'left';
                const imgAlignClass = imgAlignment === 'center' ? 'flex justify-center w-full' 
                  : imgAlignment === 'right' ? 'flex justify-end w-full'
                  : imgAlignment === 'full' ? 'w-full' 
                  : 'flex justify-start';
                return (
                  <div key={cell.id} className={imgAlignClass}>
                    <img 
                      src={cell.media_url} 
                      alt={cell.media_alt || ''} 
                      className="rounded"
                      style={imgCellStyle}
                      loading={cell.lazy_loading !== false ? 'lazy' : 'eager'}
                    />
                  </div>
                );
              
              case 'video':
                if (!cell.media_url) return null;
                const isYouTubeCell = cell.media_url.includes('youtube.com') || cell.media_url.includes('youtu.be');
                const isLibraryVideoCell = cell.video_source === 'library' || (!isYouTubeCell && !cell.media_url.startsWith('http'));
                const videoCellAlignment = cell.alignment || 'left';
                const videoCellAlignClass = videoCellAlignment === 'center' ? 'flex justify-center w-full' 
                  : videoCellAlignment === 'right' ? 'flex justify-end w-full'
                  : videoCellAlignment === 'full' ? 'w-full' 
                  : 'flex justify-start';
                
                if (isYouTubeCell) {
                  const ytId = cell.media_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                  return (
                    <div key={cell.id} className={videoCellAlignClass}>
                      <div className="relative w-full aspect-video rounded overflow-hidden" style={{
                        maxWidth: cell.max_width ? `${cell.max_width}px` : undefined,
                        maxHeight: cell.max_height ? `${cell.max_height}px` : undefined,
                        borderRadius: cell.border_radius ? `${cell.border_radius}px` : undefined,
                      }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          className="absolute inset-0 w-full h-full"
                          allowFullScreen
                          loading="lazy"
                        />
                      </div>
                    </div>
                  );
                }
                
                // Local/library video - use HTML5 video
                const videoCellStyle: React.CSSProperties = {
                  maxWidth: cell.max_width ? `${cell.max_width}px` : '100%',
                  maxHeight: cell.max_height ? `${cell.max_height}px` : undefined,
                  borderRadius: cell.border_radius ? `${cell.border_radius}px` : undefined,
                };
                
                return (
                  <div key={cell.id} className={videoCellAlignClass}>
                    <video 
                      src={cell.media_url} 
                      controls={cell.controls !== false}
                      autoPlay={cell.autoplay === true}
                      loop={cell.loop === true}
                      muted={cell.muted !== false}
                      playsInline
                      className="w-full rounded"
                      style={videoCellStyle}
                    />
                  </div>
                );
              
              case 'gallery':
                if (!cell.items || cell.items.length === 0) return null;
                const galleryAlignment = cell.alignment || 'left';
                const galleryAlignClass = galleryAlignment === 'center' ? 'flex justify-center w-full' 
                  : galleryAlignment === 'right' ? 'flex justify-end w-full'
                  : 'w-full';
                return (
                  <div key={cell.id} className={galleryAlignClass}>
                    <div 
                      className="grid gap-2" 
                      style={{ 
                        gridTemplateColumns: `repeat(${cell.columns || 3}, 1fr)`,
                        gap: cell.gap ? `${cell.gap}px` : undefined,
                      }}
                    >
                      {cell.items.map((img, idx) => (
                        <img 
                          key={idx} 
                          src={img.url} 
                          alt={img.alt || ''} 
                          className="rounded object-cover aspect-square"
                          style={{ borderRadius: cell.border_radius ? `${cell.border_radius}px` : undefined }}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  </div>
                );
              
              case 'carousel':
                if (!cell.items || cell.items.length === 0) return null;
                return (
                  <div key={cell.id} className="flex gap-2 overflow-x-auto py-1">
                    {cell.items.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img.url} 
                        alt={img.alt || ''} 
                        className="h-24 rounded object-cover flex-shrink-0"
                        style={{ borderRadius: cell.border_radius ? `${cell.border_radius}px` : undefined }}
                        loading="lazy"
                      />
                    ))}
                  </div>
                );
              
              case 'icon':
                const CellIcon = (icons as any)[cell.content] || icons.Star;
                const iconAlignment = cell.alignment || 'left';
                const iconAlignClass = iconAlignment === 'center' ? 'flex justify-center w-full' 
                  : iconAlignment === 'right' ? 'flex justify-end w-full'
                  : 'flex justify-start';
                return (
                  <div key={cell.id} className={iconAlignClass}>
                    <CellIcon className="w-6 h-6 text-primary" />
                  </div>
                );
              
              case 'spacer':
                return <div key={cell.id} style={{ height: `${cell.height || 24}px` }} />;
              
              case 'divider':
                return <Separator key={cell.id} className="my-2" />;
              
              default:
                return null;
            }
          })}
        </div>
      );

    // Nowe typy elementów - Podstawowe
    case 'heading':
      const cells = item.cells as any[];
      const headingCell = cells?.[0];
      const level = headingCell?.level || 2;
      const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
      const headingStyles = applyItemStyles(item);
      const HeadingIcon = item.icon ? (icons as any)[item.icon] : null;
      
      if (!headingCell?.content && !item.title && isEditMode) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-3 text-center">
            <p className="text-xs text-muted-foreground">Nagłówek H{level}</p>
          </div>
        );
      }
      
      const getJustifyClass = (align: string | undefined) => {
        switch(align) {
          case 'center': return 'justify-center';
          case 'right': return 'justify-end';
          case 'justify': return 'justify-between';
          default: return 'justify-start';
        }
      };
      
      // Nie używaj font-bold gdy font_weight jest ustawione ręcznie
      const hasFontWeight = item.font_weight && item.font_weight !== 400;
      // Nie używaj domyślnych rozmiarów gdy font_size jest ustawione
      const hasFontSize = item.font_size && item.font_size > 0;
      
      return (
        <HeadingTag 
          className={cn(
            'flex items-center gap-2 w-full',
            !hasFontWeight && 'font-bold',
            getJustifyClass(item.text_align),
            !hasFontSize && level === 1 && 'text-4xl',
            !hasFontSize && level === 2 && 'text-3xl',
            !hasFontSize && level === 3 && 'text-2xl',
            !hasFontSize && level === 4 && 'text-xl',
            !hasFontSize && level === 5 && 'text-lg',
            !hasFontSize && level === 6 && 'text-base',
            headingStyles.className
          )}
          style={headingStyles.style}
        >
          {HeadingIcon && <HeadingIcon className="inline-block" style={{ width: '1em', height: '1em' }} />}
          {headingCell?.content || item.title || 'Nagłówek'}
        </HeadingTag>
      );

    case 'text':
      const textCell = (item.cells as any[])?.[0];
      const textStyles = applyItemStyles(item);
      const TextIcon = item.icon ? (icons as any)[item.icon] : null;
      
      if (!textCell?.content && !item.description && isEditMode) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-3 text-center">
            <p className="text-xs text-muted-foreground">Tekst</p>
          </div>
        );
      }
      
      // Dla tekstu zachowujemy text-align CSS ponieważ wpływa na wyrównanie wewnątrz bloku
      return (
        <div className={cn('flex items-start gap-2 w-full', textStyles.className)} style={textStyles.style}>
          {TextIcon && <TextIcon className="mt-1 flex-shrink-0" style={{ width: '1em', height: '1em' }} />}
          <FormattedText
            text={textCell?.content || item.description || ''}
            formatting={item.text_formatting}
            className="text-sm leading-relaxed flex-1"
            as="p"
          />
        </div>
      );

    case 'image':
    case 'image-field':
      const imageCell = (item.cells as any[])?.[0];
      const imageStyles = applyItemStyles(item);
      const hasHoverEffect = (imageStyles.hoverScale && imageStyles.hoverScale !== 1) || 
                             (imageStyles.hoverOpacity && imageStyles.hoverOpacity !== 100);
      
      // Określ wyrównanie obrazu za pomocą flex
      const getImageJustify = () => {
        switch (item.text_align) {
          case 'center': return 'justify-center';
          case 'right': return 'justify-end';
          default: return 'justify-start';
        }
      };
      
      // Usuń textAlign z imageStyles - używamy flex kontenera
      const { textAlign: _imgTextAlign, ...imageInlineStyles } = imageStyles.style;
      
      return (
        <div 
          className={cn('flex w-full', getImageJustify())} 
          style={{ marginTop: imageStyles.style.marginTop, marginBottom: imageStyles.style.marginBottom }}
        >
          {imageCell?.content || item.media_url ? (
            <img
              src={imageCell?.content || item.media_url}
              alt={imageCell?.alt || item.media_alt_text || 'Image'}
              className={cn(
                'h-auto max-w-full transition-all duration-300',
                hasHoverEffect && 'hover:scale-[var(--hover-scale)] hover:opacity-[var(--hover-opacity)]',
                imageStyles.className
              )}
              style={{
                ...imageInlineStyles,
                marginTop: undefined,
                marginBottom: undefined,
                '--hover-scale': imageStyles.hoverScale || 1,
                '--hover-opacity': (imageStyles.hoverOpacity || 100) / 100,
              } as React.CSSProperties}
              loading={imageStyles.lazyLoading !== false ? 'lazy' : 'eager'}
            />
          ) : isEditMode ? (
            <div className="border border-dashed border-muted-foreground/30 rounded p-6 text-center">
              <p className="text-xs text-muted-foreground">Obrazek</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
              <p className="text-muted-foreground">Dodaj obrazek</p>
            </div>
          )}
        </div>
      );

    case 'video':
      const videoCell = (item.cells as any[])?.[0];
      const videoStyles = applyItemStyles(item);
      const videoUrl = videoCell?.content || item.media_url;
      
      // Get youtubeId from cells, or fallback: detect from media_url
      let youtubeId = videoCell?.youtubeId;
      const mediaUrl = item.media_url;
      
      // Fallback: if no youtubeId but media_url is a YouTube URL, extract ID
      if (!youtubeId && mediaUrl) {
        const isYT = mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be');
        if (isYT) {
          const ytMatch = mediaUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
          if (ytMatch && ytMatch[1]) {
            youtubeId = ytMatch[1];
          }
        }
      }
      
      const youtubeThumbnail = videoCell?.thumbnail;
      const videoAutoplay = videoCell?.autoplay ?? false;
      const videoLoop = videoCell?.loop ?? false;
      const videoMuted = videoCell?.muted ?? true;
      const videoControls = videoCell?.controls ?? true;
      
      const hasYouTubeVideo = !!youtubeId;
      const hasLocalVideo = !!videoUrl && !hasYouTubeVideo && !videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be');
      const hasAnyVideo = hasYouTubeVideo || hasLocalVideo;
      
      if (isEditMode && !hasAnyVideo) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-6 text-center">
            <p className="text-xs text-muted-foreground">Video</p>
          </div>
        );
      }
      
      // YouTube embed
      if (hasYouTubeVideo) {
        const youtubeParams = new URLSearchParams({
          autoplay: videoAutoplay ? '1' : '0',
          loop: videoLoop ? '1' : '0',
          mute: videoMuted ? '1' : '0',
          controls: videoControls ? '1' : '0',
          rel: '0',
          modestbranding: '1'
        });
        if (videoLoop) {
          youtubeParams.set('playlist', youtubeId);
        }
        
        return (
          <div style={videoStyles.style} className={cn('w-full', videoStyles.className)}>
            <div 
              className="relative w-full rounded-lg overflow-hidden"
              style={{ 
                aspectRatio: videoCell?.aspectRatio?.replace(':', '/') || '16/9',
                maxWidth: item.max_width ? `${item.max_width}px` : undefined,
                maxHeight: item.max_height ? `${item.max_height}px` : undefined,
              }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?${youtubeParams.toString()}`}
                title={item.title || 'YouTube video'}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading={item.lazy_loading !== false ? 'lazy' : undefined}
              />
            </div>
            {item.title && (
              <h4 className="mt-2 font-medium text-foreground">{item.title}</h4>
            )}
            {item.description && (
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            )}
          </div>
        );
      }
      
      // Local video
      return (
        <div style={videoStyles.style} className={cn('w-full', videoStyles.className)}>
          {hasLocalVideo ? (
            <>
              <video
                src={videoUrl}
                controls={videoControls}
                autoPlay={videoAutoplay}
                loop={videoLoop}
                muted={videoMuted}
                className="w-full max-w-full rounded-lg"
                style={{ 
                  objectFit: (item.object_fit as React.CSSProperties['objectFit']) || 'cover',
                  maxWidth: item.max_width ? `${item.max_width}px` : undefined,
                  maxHeight: item.max_height ? `${item.max_height}px` : undefined,
                }}
              />
              {item.title && (
                <h4 className="mt-2 font-medium text-foreground">{item.title}</h4>
              )}
              {item.description && (
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
              <p className="text-muted-foreground">Nieprawidłowy lub brak URL wideo</p>
            </div>
          )}
        </div>
      );

    case 'divider':
      return <Separator className="my-4" />;

    case 'spacer':
      const spacerCell = (item.cells as any[])?.[0];
      const height = spacerCell?.height || 40;
      return <div style={{ height: `${height}px` }} />;

    case 'icon':
    case 'icon-field':
      const iconCell = (item.cells as any[])?.[0];
      const iconName = iconCell?.icon || iconCell?.content || item.icon || 'Star';
      const IconComp = (icons as any)[iconName];
      
      if (!IconComp && isEditMode) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-3 text-center">
            <p className="text-xs text-muted-foreground">Ikona</p>
          </div>
        );
      }
      
      return IconComp ? (
        <IconComp className="w-12 h-12 text-primary" style={{ color: iconCell?.color }} />
      ) : null;

    // Ogólne elementy
    case 'carousel':
      const carouselCell = (item.cells as any[])?.[0];
      const carouselStyles = applyItemStyles(item);
      if ((!carouselCell?.images || carouselCell.images.length === 0) && isEditMode) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-6 text-center">
            <p className="text-xs text-muted-foreground">Karuzela</p>
          </div>
        );
      }
      return (
        <div style={carouselStyles.style} className={carouselStyles.className}>
          <CarouselElement
            images={carouselCell?.images || []}
            autoplay={carouselCell?.autoplay}
            interval={carouselCell?.interval}
          />
        </div>
      );

    case 'gallery':
      const galleryCell = (item.cells as any[])?.[0];
      const galleryStyles = applyItemStyles(item);
      if ((!galleryCell?.images || galleryCell.images.length === 0) && isEditMode) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-6 text-center">
            <p className="text-xs text-muted-foreground">Galeria</p>
          </div>
        );
      }
      return (
        <div style={galleryStyles.style} className={galleryStyles.className}>
          <GalleryElement
            images={galleryCell?.images || []}
            columns={galleryCell?.columns || 3}
          />
        </div>
      );

    case 'accordion':
      // Parse accordion items from cells with section_title/section_description
      const accordionItems = item.cells?.map(cell => ({
        title: cell.section_title || '',
        content: cell.section_description || ''
      })) || [];
      const accordionStyles = applyItemStyles(item);
      
      if (accordionItems.length === 0 && isEditMode) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-6 text-center">
            <p className="text-xs text-muted-foreground">Accordion</p>
          </div>
        );
      }
      
      // Render accordion with optional title and description
      return (
        <div style={accordionStyles.style} className={accordionStyles.className}>
          {item.title && (
            <h3 className="text-2xl font-bold text-center mb-4">{item.title}</h3>
          )}
          {item.description && (
            <p className="text-center text-muted-foreground mb-6">{item.description}</p>
          )}
          <AccordionElement items={accordionItems} />
        </div>
      );

    case 'learn-more':
      // Sekcja zwijana jako widżet układu
      const learnMoreStyles = applyItemStyles(item);
      const learnMoreTitle = item.title || 'Sekcja zwijana';
      const learnMoreContent = item.description || '';
      
      return (
        <Collapsible>
          <div
            className={cn(
              'border rounded-xl bg-card shadow-sm overflow-hidden',
              learnMoreStyles.className
            )}
            style={learnMoreStyles.style}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left">
              <span className="font-semibold text-sm sm:text-base">
                {learnMoreTitle}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 sm:px-5 sm:pb-5 text-sm text-muted-foreground">
              {learnMoreContent ? (
                <FormattedText
                  text={learnMoreContent}
                  formatting={item.text_formatting}
                  as="div"
                  className="leading-relaxed"
                />
              ) : isEditMode ? (
                <p className="text-xs text-muted-foreground">Dodaj treść sekcji zwijanej w edytorze elementu.</p>
              ) : null}
            </CollapsibleContent>
          </div>
        </Collapsible>
      );

    case 'toggle':
      const toggleCell = (item.cells as any[])?.[0];
      const toggleChildItems = toggleCell?.childItems || [];
      const toggleDefaultExpanded = toggleCell?.defaultExpanded ?? false;
      const toggleButtonIcon = toggleCell?.buttonIcon || 'ChevronDown';
      const toggleButtonText = toggleCell?.buttonText || '';
      const toggleButtonPosition = toggleCell?.buttonPosition || 'left';
      
      return (
        <ToggleContainerElement
          item={item}
          childItems={toggleChildItems}
          defaultExpanded={toggleDefaultExpanded}
          buttonIcon={toggleButtonIcon}
          buttonText={toggleButtonText}
          buttonPosition={toggleButtonPosition}
          isEditMode={isEditMode}
          onClick={onClick}
        />
      );

    case 'counter':
      const counterCell = (item.cells as any[])?.[0];
      return (
        <CounterElement
          start={counterCell?.start || 0}
          end={counterCell?.end || 100}
          duration={counterCell?.duration || 2000}
          suffix={counterCell?.suffix || ''}
          prefix={counterCell?.prefix || ''}
        />
      );

    case 'progress-bar':
      const progressCell = (item.cells as any[])?.[0];
      return (
        <ProgressBarElement
          value={progressCell?.value || 50}
          max={progressCell?.max || 100}
          label={progressCell?.label}
          showValue={progressCell?.showValue !== false}
        />
      );

    case 'rating':
      const ratingCell = (item.cells as any[])?.[0];
      return (
        <RatingElement
          value={ratingCell?.value || 5}
          max={ratingCell?.max || 5}
          label={ratingCell?.label}
        />
      );

    case 'testimonial':
      const testimonialCell = (item.cells as any[])?.[0];
      return (
        <TestimonialElement
          content={testimonialCell?.content || ''}
          author={testimonialCell?.author || ''}
          role={testimonialCell?.role}
          avatar={testimonialCell?.avatar}
        />
      );

    case 'social-icons':
      const socialCell = (item.cells as any[])?.[0];
      return (
        <SocialIconsElement icons={socialCell?.icons || []} size={socialCell?.size || 24} />
      );

    case 'alert':
      const alertCell = (item.cells as any[])?.[0];
      const alertStyles = applyItemStyles(item);
      return (
        <div style={alertStyles.style} className={alertStyles.className}>
          <AlertElement
            content={alertCell?.content || ''}
            title={alertCell?.title}
            variant={alertCell?.variant || 'default'}
          />
        </div>
      );

    case 'icon-list':
      const listCell = (item.cells as any[])?.[0];
      const listItems = listCell?.items || [];
      return (
        <div className="space-y-2">
          {listItems.map((listItem: any, idx: number) => {
            const ListIcon = (icons as any)[listItem.icon] || Circle;
            return (
              <div key={idx} className="flex items-start gap-2">
                <ListIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>{listItem.text}</span>
              </div>
            );
          })}
        </div>
      );

    case 'cards':
      const cardsCell = (item.cells as any[])?.[0];
      const cardItems = cardsCell?.cards || [];
      const cardColumns = cardsCell?.columns || 3;
      const getCardsGridClass = (cols: number) => {
        if (cols === 1) return 'grid-cols-1';
        if (cols === 2) return 'grid-cols-1 sm:grid-cols-2';
        if (cols === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      };
      return (
        <div className={cn("grid gap-4", getCardsGridClass(cardColumns))}>
          {cardItems.map((card: any, idx: number) => (
            <div key={idx} className="p-4 border rounded-lg bg-card">
              <h3 className="font-semibold mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground">{card.content}</p>
            </div>
          ))}
        </div>
      );

    case 'html':
      const htmlCell = (item.cells as any[])?.[0];
      return (
        <div
          className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(htmlCell?.content || '', isDarkMode) }}
        />
      );

    case 'soundcloud':
      const soundcloudCell = (item.cells as any[])?.[0];
      return soundcloudCell?.url ? (
        <iframe
          width="100%"
          height={soundcloudCell?.height || 166}
          scrolling="no"
          frameBorder="no"
          src={soundcloudCell.url}
          className="rounded-lg"
        />
      ) : (
        <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
          <p className="text-muted-foreground">Dodaj URL SoundCloud</p>
        </div>
      );

    case 'button':
      const buttonCell = (item.cells as any[])?.[0];
      const buttonUrl = buttonCell?.url || item.url;
      const buttonStyles = applyItemStyles(item);
      const ButtonIcon = item.icon ? (icons as any)[item.icon] : null;
      const iconPosition = (item as any).icon_position || 'before';
      
      if (!buttonCell?.content && !item.title && isEditMode) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-3 text-center">
            <p className="text-xs text-muted-foreground">Przycisk</p>
          </div>
        );
      }
      
      const handleButtonClick = () => {
        if (!buttonUrl) return;
        openUrl(buttonUrl);
      };
      
      const hasButtonHover = (buttonStyles.hoverScale && buttonStyles.hoverScale !== 1) ||
        (buttonStyles.hoverOpacity && buttonStyles.hoverOpacity !== 100);
      
      // Określ wyrównanie - używamy flex justify dla prawidłowego pozycjonowania
      const getButtonJustify = () => {
        switch (item.text_align) {
          case 'center': return 'justify-center';
          case 'right': return 'justify-end';
          case 'justify': return 'justify-stretch';
          default: return 'justify-start';
        }
      };
      
      // Usuń textAlign z buttonStyles.style - używamy flex
      const { textAlign: _btnTextAlign, maxWidth: btnMaxWidth, maxHeight: btnMaxHeight, ...buttonInlineStyles } = buttonStyles.style;
      
      // Dla justify - przycisk zajmuje całą szerokość
      const isJustify = item.text_align === 'justify';
      
      return (
        <div className={cn('flex w-full', getButtonJustify())}>
          <div style={{
            width: btnMaxWidth || (isJustify ? '100%' : 'fit-content'),
            maxHeight: btnMaxHeight,
          }}>
            <Button
              onClick={handleButtonClick}
              className={cn(
                'transition-all duration-300',
                hasButtonHover && 'hover:scale-[var(--hover-scale)] hover:opacity-[var(--hover-opacity)]',
                buttonStyles.className
              )}
              style={{
                ...buttonInlineStyles,
                '--hover-scale': buttonStyles.hoverScale || 1,
                '--hover-opacity': (buttonStyles.hoverOpacity || 100) / 100,
                width: '100%',
              } as React.CSSProperties}
            >
              {ButtonIcon && iconPosition === 'before' && (
                <ButtonIcon className="w-4 h-4 mr-2" />
              )}
              {buttonCell?.content || item.title || 'Kliknij'}
              {ButtonIcon && iconPosition === 'after' && (
                <ButtonIcon className="w-4 h-4 ml-2" />
              )}
            </Button>
          </div>
        </div>
      );

    case 'file-download':
      const fileCell = (item.cells as any[])?.[0];
      const fileStyles = applyItemStyles(item);
      // Priority: external URL > uploaded file URL
      const fileUrl = fileCell?.externalUrl || fileCell?.url || item.url;
      const fileName = fileCell?.fileName || 'Plik';
      const fileOpenMode = fileCell?.openMode || 'download';
      const FileIcon = item.icon ? (icons as any)[item.icon] : (icons as any).Download;
      const fileIconPosition = (item as any).icon_position || 'before';
      
      if (!fileUrl && isEditMode) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-3 text-center">
            <p className="text-xs text-muted-foreground">Pobierz plik</p>
          </div>
        );
      }
      
      const handleFileDownload = () => {
        if (!fileUrl) return;
        
        if (fileOpenMode === 'newTab') {
          // Open in new tab
          window.open(fileUrl, '_blank', 'noopener,noreferrer');
        } else {
          // Download file
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      };
      
      // Określ wyrównanie przycisku pobierania
      const getFileJustify = () => {
        switch (item.text_align) {
          case 'center': return 'justify-center';
          case 'right': return 'justify-end';
          default: return 'justify-start';
        }
      };
      
      const { textAlign: _fileTextAlign, ...fileInlineStyles } = fileStyles.style;
      
      return (
        <div className={cn('flex w-full', getFileJustify())}>
          <Button
            onClick={handleFileDownload}
            className={fileStyles.className}
            style={fileInlineStyles}
            variant="outline"
          >
            {FileIcon && fileIconPosition === 'before' && (
              <FileIcon className="w-4 h-4 mr-2" />
            )}
            {fileCell?.content || item.title || 'Pobierz plik'}
            {FileIcon && fileIconPosition === 'after' && (
              <FileIcon className="w-4 h-4 ml-2" />
            )}
          </Button>
        </div>
      );

    case 'copy-to-clipboard':
      const copyCell = (item.cells as any[])?.[0];
      const copyStyles = applyItemStyles(item);
      const clipboardContent = copyCell?.clipboard_content || item.description || '';
      const CopyIcon = item.icon ? (icons as any)[item.icon] : (icons as any).Clipboard;
      
      if (!clipboardContent && isEditMode) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-3 text-center">
            <p className="text-xs text-muted-foreground">Kopiuj do schowka</p>
          </div>
        );
      }
      
      const handleCopyToClipboard = async () => {
        try {
          // Strip HTML tags for plain text copy
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = clipboardContent;
          const plainText = tempDiv.textContent || tempDiv.innerText || '';
          
          await navigator.clipboard.writeText(plainText);
          
          // Optional: show toast notification
          const event = new CustomEvent('toast', { 
            detail: { message: 'Skopiowano do schowka!', type: 'success' } 
          });
          window.dispatchEvent(event);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      };
      
      // Określ wyrównanie przycisku
      const getCopyJustify = () => {
        switch (item.text_align) {
          case 'center': return 'justify-center';
          case 'right': return 'justify-end';
          case 'justify': return 'justify-stretch';
          default: return 'justify-start';
        }
      };
      
      const { textAlign: _copyTextAlign, maxWidth: copyMaxWidth, maxHeight: copyMaxHeight, ...copyInlineStyles } = copyStyles.style;
      const isCopyJustify = item.text_align === 'justify';
      
      return (
        <div className={cn('flex w-full', getCopyJustify())}>
          <div style={{
            width: copyMaxWidth || (isCopyJustify ? '100%' : 'fit-content'),
            maxHeight: copyMaxHeight,
          }}>
            <Button
              onClick={handleCopyToClipboard}
              className={copyStyles.className}
              style={{
                ...copyInlineStyles,
                width: '100%',
              }}
              variant="outline"
            >
              {CopyIcon && (
                <CopyIcon className="w-4 h-4 mr-2" />
              )}
              {item.title || 'Kopiuj do schowka'}
            </Button>
          </div>
        </div>
      );

    case 'maps':
      const mapsCell = (item.cells as any[])?.[0];
      if (!mapsCell?.content && isEditMode) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-6 text-center">
            <p className="text-xs text-muted-foreground">Mapa</p>
          </div>
        );
      }
      return mapsCell?.content ? (
        <iframe
          src={mapsCell.content}
          width="100%"
          height="450"
          style={{ border: 0 }}
          loading="lazy"
          className="rounded-lg"
        />
      ) : (
        <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
          <p className="text-muted-foreground">Dodaj URL mapy Google</p>
        </div>
      );

    case 'accessibility':
    case 'shortcode':
    case 'menu-anchor':
    case 'sidebar':
    case 'trustindex':
    case 'ppom':
    case 'text-path':
      const genericCell = (item.cells as any[])?.[0];
      return (
        <div className="p-4 border border-dashed rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-1">
            Element typu: <span className="font-medium">{item.type}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {genericCell?.content || 'Skonfiguruj ten element w edytorze'}
          </p>
        </div>
      );

    case 'container':
    case 'grid':
      // Te elementy nie powinny być renderowane jako itemy - powinny być sekcjami
      if (isEditMode) {
        return (
          <div className="p-4 border-2 border-dashed border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">⚠️ Element "{item.type}" powinien być sekcją, nie itemem</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Usuń ten element i użyj go ponownie z panelu elementów</p>
          </div>
        );
      }
      return null;

    case 'collapsible-pure-life':
      // Ten element powinien być sekcją, nie itemem
      if (isEditMode) {
        return (
          <div className="p-4 border-2 border-dashed border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">⚠️ "Sekcja zwijana (Pure Life)" powinna być sekcją</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Usuń ten element i dodaj go ponownie z panelu układów</p>
          </div>
        );
      }
      return null;

    case 'image-link': {
      const cellData = item.cells as any;
      const linkType = cellData?.link_type || 'external';
      const openInNewTab = cellData?.open_in_new_tab ?? true;
      
      // Show placeholder in edit mode when no image
      if (!item.media_url && isEditMode) {
        return (
          <div className="border border-dashed border-muted-foreground/30 rounded p-6 text-center bg-muted/20">
            <div className="flex flex-col items-center gap-2">
              <icons.Image className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Obrazek z linkiem</p>
              <p className="text-[10px] text-muted-foreground/70">Kliknij aby dodać obrazek</p>
            </div>
          </div>
        );
      }
      
      const handleImageLinkClick = async () => {
        let targetUrl = item.url || '';
        
        if (linkType === 'resource' && cellData?.resource_id) {
          // Fetch resource URL
          const { data } = await (await import('@/integrations/supabase/client')).supabase
            .from('knowledge_resources')
            .select('source_url')
            .eq('id', cellData.resource_id)
            .single();
          if (data?.source_url) {
            targetUrl = data.source_url;
          }
        }
        
        if (targetUrl) {
          if (openInNewTab) {
            window.open(targetUrl, '_blank');
          } else {
            window.location.href = targetUrl;
          }
        }
      };

      const itemStyles = applyItemStyles(item);
      
      return (
        <div 
          className={cn("cursor-pointer transition-all hover:opacity-90 hover:scale-[1.02]", itemStyles.className)}
          style={itemStyles.style}
          onClick={handleImageLinkClick}
        >
          {item.media_url && (
            <img
              src={item.media_url}
              alt={item.media_alt_text || 'Obrazek z linkiem'}
              className="w-full h-auto object-cover"
              style={{
                borderRadius: item.border_radius ? `${item.border_radius}px` : undefined,
                maxWidth: item.max_width ? `${item.max_width}px` : undefined,
              }}
              loading={item.lazy_loading ? 'lazy' : undefined}
            />
          )}
        </div>
      );
    }

    default:
      // Get icon component if specified
      const IconComponent = item.icon ? (icons as any)[item.icon] : null;
      
      // Parse title and description styles
      const titleStyle = item.title_formatting ? JSON.parse(JSON.stringify(item.title_formatting)) : {};
      const textStyle = item.text_formatting ? JSON.parse(JSON.stringify(item.text_formatting)) : {};
      
      return (
        <div>
          {renderMedia()}
          <button
            onClick={(e) => {
              e.preventDefault();
              handleClick();
            }}
            className="w-full p-5 sm:p-6 text-left rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-card border border-border hover:border-primary/30 hover:shadow-lg group"
          >
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                {item.title && (
                  <h4 
                    className="font-semibold text-sm sm:text-base mb-1 text-foreground group-hover:text-primary transition-colors line-clamp-2"
                    style={titleStyle}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(item.title, isDarkMode) }}
                  />
                )}
                {item.description && (
                  <p 
                    className="text-xs sm:text-sm text-muted-foreground line-clamp-2"
                    style={textStyle}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(item.description, isDarkMode) }}
                  />
                )}
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                {IconComponent ? (
                  <IconComponent className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                )}
              </div>
            </div>
          </button>
        </div>
      );
  }
};