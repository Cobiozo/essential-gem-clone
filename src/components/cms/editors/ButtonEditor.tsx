import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CMSItem } from '@/types/cms';
import { Save, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ButtonEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const ButtonEditor: React.FC<ButtonEditorProps> = ({ item, onSave, onCancel }) => {
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);

  // Auto-save on debounced changes
  useEffect(() => {
    if (debouncedItem && debouncedItem !== item) {
      onSave(debouncedItem);
    }
  }, [debouncedItem]);

  const handleSave = () => {
    onSave(editedItem);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Edytuj Button</h3>
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
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
          <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="content" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Tekst</Label>
              <Input
                value={editedItem.title || ''}
                onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                placeholder="Nasz sklep ->"
              />
            </div>

            <div className="space-y-2">
              <Label>Link</Label>
              <Input
                value={editedItem.url || ''}
                onChange={(e) => setEditedItem({ ...editedItem, url: e.target.value })}
                placeholder="https://mobline-it.pl/sklep/"
              />
            </div>

            <div className="space-y-2">
              <Label>Alignment</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">←</Button>
                <Button variant="outline" size="sm">↔</Button>
                <Button variant="outline" size="sm">→</Button>
                <Button variant="outline" size="sm">☰</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">↻</Button>
                <Button variant="outline" size="sm">⊕</Button>
                <Button variant="outline" size="sm">🗑</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Icon Position</Label>
              <Select
                value={editedItem.icon || 'before'}
                onValueChange={(value) => setEditedItem({ ...editedItem, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before</SelectItem>
                  <SelectItem value="after">After</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Icon Spacing</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[11]}
                  max={50}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm w-8">11</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="style" className="p-4">
            <div className="text-sm text-muted-foreground">Style options coming soon...</div>
          </TabsContent>

          <TabsContent value="advanced" className="p-4">
            <div className="text-sm text-muted-foreground">Advanced options coming soon...</div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
