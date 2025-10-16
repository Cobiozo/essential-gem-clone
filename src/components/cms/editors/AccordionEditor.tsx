import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CMSItem } from '@/types/cms';
import { Save, X, Plus, Trash2, GripVertical } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

interface AccordionEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

interface AccordionItem {
  title: string;
  content: string;
}

export const AccordionEditor: React.FC<AccordionEditorProps> = ({ item, onSave, onCancel }) => {
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);

  // Auto-save on debounced changes
  useEffect(() => {
    if (debouncedItem && debouncedItem !== item) {
      onSave(debouncedItem);
    }
  }, [debouncedItem]);
  
  // Parse accordion items from cells or create default structure
  const getAccordionItems = (): AccordionItem[] => {
    if (editedItem.cells && editedItem.cells.length > 0) {
      // Parse pairs: header (title) followed by description (content)
      const items: AccordionItem[] = [];
      for (let i = 0; i < editedItem.cells.length; i++) {
        const cell = editedItem.cells[i];
        if (cell.type === 'section' && cell.section_title) {
          items.push({
            title: cell.section_title,
            content: cell.section_description || ''
          });
        }
      }
      return items.length > 0 ? items : [{ title: '', content: '' }];
    }
    return [{ title: '', content: '' }];
  };

  const [accordionItems, setAccordionItems] = useState<AccordionItem[]>(getAccordionItems());

  const handleSave = () => {
    const updatedItem = {
      ...editedItem,
      cells: accordionItems.map((accordionItem, index) => ({
        type: 'section' as const,
        content: '',
        position: index,
        is_active: true,
        section_title: accordionItem.title,
        section_description: accordionItem.content
      }))
    };
    onSave(updatedItem);
  };

  const addAccordionItem = () => {
    setAccordionItems([...accordionItems, { title: '', content: '' }]);
  };

  const removeAccordionItem = (index: number) => {
    if (accordionItems.length > 1) {
      setAccordionItems(accordionItems.filter((_, i) => i !== index));
    }
  };

  const updateAccordionItem = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...accordionItems];
    updated[index][field] = value;
    setAccordionItems(updated);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Edytuj Akordeon</h3>
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

      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="content">Elementy</TabsTrigger>
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              {accordionItems.map((accordionItem, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-4">
                      <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-move" />
                      <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                          <Label>Tytuł elementu {index + 1}</Label>
                          <Input
                            value={accordionItem.title}
                            onChange={(e) => updateAccordionItem(index, 'title', e.target.value)}
                            placeholder="np. PRZECHOWYWANIE I DAWKOWANIE"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Treść</Label>
                          <Textarea
                            value={accordionItem.content}
                            onChange={(e) => updateAccordionItem(index, 'content', e.target.value)}
                            placeholder="Treść rozwijalnego elementu..."
                            rows={4}
                          />
                        </div>
                      </div>
                      {accordionItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAccordionItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button onClick={addAccordionItem} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Dodaj element
            </Button>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Nagłówek sekcji (opcjonalnie)</Label>
                <Input
                  value={editedItem.title || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                  placeholder="np. Witamy w Pure Life"
                />
              </div>
              <div className="space-y-2">
                <Label>Opis sekcji (opcjonalnie)</Label>
                <Textarea
                  value={editedItem.description || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                  placeholder="Dodatkowy tekst nad akordenem..."
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="pb-4">
              <div className="text-sm text-muted-foreground">Opcje stylu będą dostępne wkrótce...</div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
