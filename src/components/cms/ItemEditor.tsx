import React from 'react';
import { CMSItem } from '@/types/cms';
import { ButtonEditor } from './editors/ButtonEditor';
import { ImageEditor } from './editors/ImageEditor';
import { InfoTextEditor } from './editors/InfoTextEditor';
import { AccordionEditor } from './editors/AccordionEditor';
import { GenericEditor } from './editors/GenericEditor';

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
    
    case 'info_text':
      return <InfoTextEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    case 'accordion':
      return <AccordionEditor item={item} onSave={onSave} onCancel={handleCancel} />;
    
    default:
      // Fallback generic editor for other types
      return <GenericEditor item={item} sectionId={sectionId} onSave={onSave} onCancel={handleCancel} />;
  }
};
