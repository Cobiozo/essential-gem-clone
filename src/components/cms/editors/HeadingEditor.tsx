import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CMSItem } from '@/types/cms';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdvancedStyleTab } from './AdvancedStyleTab';
import { useDebounce } from '@/hooks/use-debounce';
import { IconPicker } from '../IconPicker';
import * as icons from 'lucide-react';

interface HeadingEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const HeadingEditor: React.FC<HeadingEditorProps> = ({ item, onSave, onCancel }) => {
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<string>(JSON.stringify(item));

  // Auto-save on debounced changes
  useEffect(() => {
    const debouncedItemString = JSON.stringify(debouncedItem);
    if (debouncedItem && debouncedItemString !== prevItemRef.current) {
      console.log('🟡 HeadingEditor auto-saving:', debouncedItem);
      onSave(debouncedItem);
      prevItemRef.current = debouncedItemString;
    }
  }, [debouncedItem, onSave]);

  const handleUpdate = (updates: Partial<CMSItem>) => {
    setEditedItem(prev => {
      const existingCells = (prev.cells || [{ type: 'h2', level: 2, content: '' }]) as any[];
      let newCells = [...existingCells];
      
      if ('title' in updates) {
        newCells[0] = { 
          ...(newCells[0] || {}), 
          content: updates.title || '', 
          type: 'h2', 
          level: 2 
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
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Edytuj Nagłówek</h3>
        <Button onClick={onCancel} variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Typ nagłówka</Label>
                <Select
                  value={editedItem.style_class?.includes('text-') ? editedItem.style_class.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/)?.[1] || 'xl' : 'xl'}
                  onValueChange={(value) => {
                    const sizeMap: Record<string, string> = {
                      'xs': 'text-xs',
                      'sm': 'text-sm',
                      'base': 'text-base',
                      'lg': 'text-lg',
                      'xl': 'text-xl',
                      '2xl': 'text-2xl',
                      '3xl': 'text-3xl',
                      '4xl': 'text-4xl',
                      '5xl': 'text-5xl',
                      '6xl': 'text-6xl'
                    };
                    const currentClass = editedItem.style_class || '';
                    const newClass = currentClass.replace(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/g, '').trim();
                    handleUpdate({ style_class: `${newClass} ${sizeMap[value]}`.trim() });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xs">H6 (najmniejszy)</SelectItem>
                    <SelectItem value="sm">H5</SelectItem>
                    <SelectItem value="base">H4</SelectItem>
                    <SelectItem value="lg">H3</SelectItem>
                    <SelectItem value="xl">H2</SelectItem>
                    <SelectItem value="2xl">H1</SelectItem>
                    <SelectItem value="3xl">Display małe</SelectItem>
                    <SelectItem value="4xl">Display średnie</SelectItem>
                    <SelectItem value="5xl">Display duże</SelectItem>
                    <SelectItem value="6xl">Display bardzo duże</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tekst nagłówka</Label>
            <Input
              value={editedItem.cells?.[0]?.content || editedItem.title || ''}
              onChange={(e) => {
                console.log('🟢 Heading input changed to:', e.target.value);
                handleUpdate({ title: e.target.value });
              }}
              placeholder="Wpisz tytuł..."
            />
              </div>

              <div className="space-y-2">
                <Label>Poziom semantyczny HTML</Label>
                <Select defaultValue="h2">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h1">H1 (główny tytuł strony)</SelectItem>
                    <SelectItem value="h2">H2 (sekcja)</SelectItem>
                    <SelectItem value="h3">H3 (podsekcja)</SelectItem>
                    <SelectItem value="h4">H4</SelectItem>
                    <SelectItem value="h5">H5</SelectItem>
                    <SelectItem value="h6">H6</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ważne dla SEO i dostępności
                </p>
              </div>

              <div className="space-y-2">
                <Label>Ikona (opcjonalnie)</Label>
                <IconPicker
                  value={editedItem.icon}
                  onChange={(iconName) => handleUpdate({ icon: iconName })}
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      {editedItem.icon ? (
                        <>
                          {(() => {
                            const IconComp = (icons as any)[editedItem.icon];
                            return IconComp ? <IconComp className="w-4 h-4 mr-2" /> : null;
                          })()}
                          <span>{editedItem.icon}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Wybierz ikonę...</span>
                      )}
                    </Button>
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Ikona pojawi się przed nagłówkiem
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="pb-4">
              <AdvancedStyleTab 
                item={editedItem} 
                onUpdate={handleUpdate}
                showDimensions={false}
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
