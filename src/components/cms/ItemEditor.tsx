import React from 'react';
import { CMSItem } from '@/types/cms';
import { ButtonEditor } from './editors/ButtonEditor';
import { ImageEditor } from './editors/ImageEditor';
import { VideoEditor } from './editors/VideoEditor';
import { InfoTextEditor } from './editors/InfoTextEditor';
import { AccordionEditor } from './editors/AccordionEditor';
import { HeadingEditor } from './editors/HeadingEditor';
import { TextEditor } from './editors/TextEditor';
import { MapEditor } from './editors/MapEditor';
import { GenericEditor } from './editors/GenericEditor';
import { ProgressBarEditor } from './editors/ProgressBarEditor';
import { CounterEditor } from './editors/CounterEditor';
import { CarouselEditor } from './editors/CarouselEditor';
import { GalleryEditor } from './editors/GalleryEditor';
import { RatingEditor } from './editors/RatingEditor';
import { TestimonialEditor } from './editors/TestimonialEditor';
import { AlertEditor } from './editors/AlertEditor';
import { SocialIconsEditor } from './editors/SocialIconsEditor';

interface ItemEditorProps {
  item?: CMSItem;
  sectionId: string;
  onSave: (item: CMSItem) => void;
  onCancel?: () => void;
  isNew?: boolean;
  trigger?: React.ReactNode;
  isOpen?: boolean;
}

export const ItemEditor: React.FC<ItemEditorProps> = ({
  item,
  sectionId,
  onSave,
  onCancel,
  isNew = false,
  trigger,
  isOpen: externalIsOpen
}) => {
  // If no item, show generic message
  if (!item) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Wybierz element do edycji
      </div>
    );
  }

  const handleCancel = onCancel || (() => {});

  // Route to specialized editor based on item type
  switch (item.type) {
    case 'button':
      return <ButtonEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'image':
      return <ImageEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'video':
      return <VideoEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'info_text':
      return <InfoTextEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'accordion':
      return <AccordionEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'heading':
      return <HeadingEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'text':
      return <TextEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'maps':
      return <MapEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'progress-bar':
      return <ProgressBarEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'counter':
      return <CounterEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'carousel':
      return <CarouselEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'gallery':
      return <GalleryEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'rating':
      return <RatingEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'testimonial':
      return <TestimonialEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'alert':
      return <AlertEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'social-icons':
      return <SocialIconsEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    default:
      // Fallback generic editor for other types
      return <GenericEditor item={item} sectionId={sectionId} onSave={onSave} onCancel={handleCancel} />;
  }
};
