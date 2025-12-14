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
import { IconListEditor } from './editors/IconListEditor';
import { CardsEditor } from './editors/CardsEditor';
import { ToggleEditor } from './editors/ToggleEditor';
import { SoundCloudEditor } from './editors/SoundCloudEditor';
import { HtmlEditor } from './editors/HtmlEditor';
import { IconFieldEditor } from './editors/IconFieldEditor';
import { AccessibilityEditor } from './editors/AccessibilityEditor';
import { SidebarEditor } from './editors/SidebarEditor';
import { PpomEditor } from './editors/PpomEditor';
import { TextPathEditor } from './editors/TextPathEditor';
import { FileDownloadEditor } from './editors/FileDownloadEditor';
import { MultiCellEditor } from './editors/MultiCellEditor';

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
    
    case 'icon-list':
      return <IconListEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'cards':
      return <CardsEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'toggle':
      return <ToggleEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'soundcloud':
      return <SoundCloudEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'html':
      return <HtmlEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'icon-field':
    case 'icon':
      return <IconFieldEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'accessibility':
      return <AccessibilityEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'sidebar':
      return <SidebarEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'ppom':
      return <PpomEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'text-path':
      return <TextPathEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'file-download':
      return <FileDownloadEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'multi_cell':
      return <MultiCellEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    default:
      // Fallback generic editor for other types
      return <GenericEditor item={item} sectionId={sectionId} onSave={onSave} onCancel={handleCancel} />;
  }
};
