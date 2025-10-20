import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CMSItem } from '@/types/cms';
import { X } from 'lucide-react';
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
  const prevItemRef = useRef<string>(JSON.stringify(item));

  // Auto-save on debounced changes
  useEffect(() => {
    const debouncedItemString = JSON.stringify(debouncedItem);
    if (debouncedItem && debouncedItemString !== prevItemRef.current) {
      onSave(debouncedItem);
      prevItemRef.current = debouncedItemString;
    }
  }, [debouncedItem, onSave]);

  const handleUpdate = (updates: Partial<CMSItem>) => {
    setEditedItem(prev => {
      const existingCells = (prev.cells || [{ type: 'paragraph', content: '' }]) as any[];
      let newCells = [...existingCells];
      
      if ('description' in updates) {
        newCells[0] = { 
          ...(newCells[0] || {}), 
          content: updates.description || '', 
          type: 'paragraph' 
        };
      }
      
      return { 
        ...prev, 
        ...updates,
        cells: newCells
      };
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h3 className="text-lg font-semibold">Edytuj Tekst</h3>
        <Button onClick={onCancel} variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="mx-4 mt-4 mb-0 shrink-0">
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-auto m-0 data-[state=active]:flex data-[state=active]:flex-col">
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label>Treść</Label>
              <div className="border rounded-md overflow-hidden" style={{ height: '400px' }}>
                <RichTextEditor
                  value={editedItem.cells?.[0]?.content || editedItem.description || ''}
                  onChange={(value) => {
                    console.log('🟢 RichTextEditor changed to:', value.substring(0, 50) + '...');
                    handleUpdate({ description: value });
                  }}
                  placeholder="Wpisz treść..."
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-auto m-0">
          <div className="p-4">
            <StyleTab item={editedItem} onUpdate={handleUpdate} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
