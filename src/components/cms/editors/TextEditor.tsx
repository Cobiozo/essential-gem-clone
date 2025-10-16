import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CMSItem } from '@/types/cms';
import { Save, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StyleTab } from './StyleTab';
import { useDebounce } from '@/hooks/use-debounce';
import { RichTextEditor } from '@/components/RichTextEditor';

interface TextEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({ item, onSave, onCancel }) => {
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);

  // Auto-save on debounced changes
  useEffect(() => {
    if (debouncedItem && debouncedItem !== item) {
      onSave(debouncedItem);
    }
  }, [debouncedItem]);

  const handleUpdate = (updates: Partial<CMSItem>) => {
    setEditedItem({ ...editedItem, ...updates });
  };

  const handleSave = () => {
    onSave(editedItem);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h3 className="text-lg font-semibold">Edytuj Tekst</h3>
        <div className="flex gap-2">
          <Button onClick={handleSave} size="sm">
            <Save className="w-4 h-4 mr-2" />
            Zapisz
          </Button>
          <Button onClick={onCancel} variant="outline" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-4 shrink-0">
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 min-h-0 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label>Treść</Label>
                <div className="border rounded-md overflow-hidden" style={{ height: '300px' }}>
                  <RichTextEditor
                    value={editedItem.description || ''}
                    onChange={(value) => handleUpdate({ description: value })}
                    placeholder="Wpisz treść..."
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="flex-1 min-h-0 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <StyleTab item={editedItem} onUpdate={handleUpdate} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
