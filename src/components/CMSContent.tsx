import React from 'react';
import { CMSButton } from './CMSButton';
import { SecureMedia } from './SecureMedia';
import { FormattedText } from './FormattedText';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ContentCell, CMSItem } from '@/types/cms';
import { CollapsibleSection } from './CollapsibleSection';
import { isExternalUrl } from '@/lib/urlUtils';
import * as icons from 'lucide-react';
import { ChevronRight, Circle } from 'lucide-react';
import { CarouselElement } from './elements/CarouselElement';
import { AccordionElement } from './elements/AccordionElement';
import { CounterElement } from './elements/CounterElement';
import { ProgressBarElement } from './elements/ProgressBarElement';
import { RatingElement } from './elements/RatingElement';
import { GalleryElement } from './elements/GalleryElement';
import { SocialIconsElement } from './elements/SocialIconsElement';
import { AlertElement } from './elements/AlertElement';
import { TestimonialElement } from './elements/TestimonialElement';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface CMSContentProps {
  item: CMSItem;
  onClick?: (title: string, url?: string) => void;
}

export const CMSContent: React.FC<CMSContentProps> = ({ item, onClick }) => {
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
        .filter(cell => cell.is_active)
        .sort((a, b) => a.position - b.position);

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
                     dangerouslySetInnerHTML={{ __html: cell.content }}
                   />
                 );
              
               case 'description':
                 return (
                   <p 
                     key={cell.id} 
                     className="text-sm text-muted-foreground leading-relaxed"
                     dangerouslySetInnerHTML={{ __html: cell.content }}
                   />
                 );
              
               case 'list_item':
                 return (
                   <div key={cell.id} className="flex items-start space-x-2">
                     <span className="text-primary mt-1">•</span>
                     <span 
                       className="text-sm leading-relaxed"
                       dangerouslySetInnerHTML={{ __html: cell.content }}
                     />
                   </div>
                 );

              case 'section':
                if (!cell.section_items || cell.section_items.length === 0) {
                  return (
                     <div key={cell.id} className="border rounded-lg p-4 my-4 bg-muted/30">
                       <h4 
                         className="font-semibold mb-2"
                         dangerouslySetInnerHTML={{ __html: cell.section_title || cell.content }}
                       />
                       {cell.section_description && (
                         <p 
                           className="text-sm text-muted-foreground mb-2"
                           dangerouslySetInnerHTML={{ __html: cell.section_description }}
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
                      {cell.section_items.filter(sectionItem => sectionItem.is_active !== false).map((sectionItem) => (
                        <CMSContent 
                          key={sectionItem.id} 
                          item={sectionItem} 
                          onClick={onClick}
                        />
                      ))}
                    </div>
                  </CollapsibleSection>
                );
              
              case 'button_functional':
              case 'button_anchor':
              case 'button_external':
                return (
                  <Button
                    key={cell.id}
                    onClick={() => handleCellClick(cell)}
                    variant={cell.type === 'button_external' ? 'outline' : 'default'}
                    size="sm"
                    className="w-full justify-start"
                  >
                    {cell.type === 'button_external' && '🔗 '}
                    {cell.type === 'button_anchor' && '⚓ '}
                    {cell.type === 'button_functional' && '🔘 '}
                    {cell.content}
                  </Button>
                );
              
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
      return (
        <HeadingTag className={cn(
          'font-bold',
          level === 1 && 'text-4xl',
          level === 2 && 'text-3xl',
          level === 3 && 'text-2xl',
          level === 4 && 'text-xl',
          level === 5 && 'text-lg',
          level === 6 && 'text-base'
        )}>
          {headingCell?.content || item.title || 'Nagłówek'}
        </HeadingTag>
      );

    case 'text':
      const textCell = (item.cells as any[])?.[0];
      return (
        <FormattedText
          text={textCell?.content || item.description || ''}
          formatting={item.text_formatting}
          className="text-sm leading-relaxed"
          as="p"
        />
      );

    case 'image':
    case 'image-field':
      const imageCell = (item.cells as any[])?.[0];
      return (
        <div className="w-full">
          {imageCell?.content || item.media_url ? (
            <img
              src={imageCell?.content || item.media_url}
              alt={imageCell?.alt || item.media_alt_text || 'Image'}
              className="w-full h-auto rounded-lg"
            />
          ) : (
            <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
              <p className="text-muted-foreground">Dodaj obrazek</p>
            </div>
          )}
        </div>
      );

    case 'video':
      const videoCell = (item.cells as any[])?.[0];
      return renderMedia() || (
        <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
          <p className="text-muted-foreground">Dodaj wideo</p>
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
      const iconName = iconCell?.content || item.icon || 'Star';
      const IconComp = (icons as any)[iconName];
      return IconComp ? (
        <IconComp className="w-12 h-12 text-primary" style={{ color: iconCell?.color }} />
      ) : null;

    // Ogólne elementy
    case 'carousel':
      const carouselCell = (item.cells as any[])?.[0];
      return (
        <CarouselElement
          images={carouselCell?.images || []}
          autoplay={carouselCell?.autoplay}
          interval={carouselCell?.interval}
        />
      );

    case 'gallery':
      const galleryCell = (item.cells as any[])?.[0];
      return (
        <GalleryElement
          images={galleryCell?.images || []}
          columns={galleryCell?.columns || 3}
        />
      );

    case 'accordion':
      const accordionCell = (item.cells as any[])?.[0];
      return (
        <AccordionElement items={accordionCell?.items || []} />
      );

    case 'toggle':
      const toggleCell = (item.cells as any[])?.[0];
      return (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg">
            <span className="font-medium">{toggleCell?.title || 'Kliknij aby rozwinąć'}</span>
            <ChevronRight className="w-5 h-5 transition-transform" />
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4">
            {toggleCell?.content || ''}
          </CollapsibleContent>
        </Collapsible>
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
      return (
        <AlertElement
          content={alertCell?.content || ''}
          title={alertCell?.title}
          variant={alertCell?.variant || 'default'}
        />
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
      const cardItems = cardsCell?.items || [];
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlCell?.content || '' }}
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

    case 'accessibility':
    case 'shortcode':
    case 'menu-anchor':
    case 'sidebar':
    case 'learn-more':
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

    case 'button':
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
                    dangerouslySetInnerHTML={{ __html: item.title }}
                  />
                )}
                {item.description && (
                  <p 
                    className="text-xs sm:text-sm text-muted-foreground line-clamp-2"
                    style={textStyle}
                    dangerouslySetInnerHTML={{ __html: item.description }}
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