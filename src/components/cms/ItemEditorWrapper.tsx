import React, { useState, useEffect } from 'react';
import { CMSItem } from '@/types/cms';
import { ItemEditor } from './ItemEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisibilityEditor } from './editors/VisibilityEditor';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ItemEditorWrapperProps {
  item?: CMSItem;
  sectionId: string;
  onSave: (item: CMSItem) => void;
  onCancel?: () => void;
  isNew?: boolean;
}

export const ItemEditorWrapper: React.FC<ItemEditorWrapperProps> = ({
  item,
  sectionId,
  onSave,
  onCancel,
  isNew = false,
}) => {
  const [editedItem, setEditedItem] = useState<CMSItem | undefined>(item);
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    setEditedItem(item);
  }, [item]);

  if (!editedItem) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Wybierz element do edycji
      </div>
    );
  }

  const handleItemSave = (updatedItem: CMSItem) => {
    // Merge visibility settings with updated item
    const finalItem = {
      ...updatedItem,
      visible_to_everyone: editedItem.visible_to_everyone,
      visible_to_clients: editedItem.visible_to_clients,
      visible_to_partners: editedItem.visible_to_partners,
      visible_to_specjalista: editedItem.visible_to_specjalista,
      visible_to_anonymous: editedItem.visible_to_anonymous,
    };
    onSave(finalItem);
  };

  const handleVisibilityChange = (settings: {
    visible_to_everyone?: boolean;
    visible_to_clients?: boolean;
    visible_to_partners?: boolean;
    visible_to_specjalista?: boolean;
    visible_to_anonymous?: boolean;
  }) => {
    setEditedItem(prev => prev ? { ...prev, ...settings } : prev);
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 grid grid-cols-2">
          <TabsTrigger value="content">Edycja</TabsTrigger>
          <TabsTrigger value="visibility">Widoczność</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
          <ItemEditor
            item={editedItem}
            sectionId={sectionId}
            onSave={handleItemSave}
            onCancel={onCancel}
            isNew={isNew}
          />
        </TabsContent>

        <TabsContent value="visibility" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <VisibilityEditor
                value={{
                  visible_to_everyone: editedItem.visible_to_everyone ?? true,
                  visible_to_clients: editedItem.visible_to_clients ?? false,
                  visible_to_partners: editedItem.visible_to_partners ?? false,
                  visible_to_specjalista: editedItem.visible_to_specjalista ?? false,
                  visible_to_anonymous: editedItem.visible_to_anonymous ?? false,
                }}
                onChange={handleVisibilityChange}
              />
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Informacja</h4>
                <p className="text-xs text-muted-foreground">
                  Ustawienia widoczności zostaną zapisane po kliknięciu "Zapisz" w zakładce Edycja.
                  Pamiętaj, że sekcja nadrzędna również musi być widoczna dla użytkownika, aby zobaczyć ten element.
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
