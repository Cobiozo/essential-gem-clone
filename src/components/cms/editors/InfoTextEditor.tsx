import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CMSItem } from '@/types/cms';
import { Save, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';

interface InfoTextEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

const popularIcons = [
  'Heart', 'User', 'Users', 'Star', 'Check', 'X', 'Info', 
  'AlertCircle', 'MessageSquare', 'Phone', 'Mail', 'MapPin'
];

export const InfoTextEditor: React.FC<InfoTextEditorProps> = ({ item, onSave, onCancel }) => {
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
        <h3 className="text-lg font-semibold">Edytuj Pole ikonki</h3>
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

        <TabsContent value="content" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Ikonka</Label>
                <Select
                  value={editedItem.icon || 'Heart'}
                  onValueChange={(value) => setEditedItem({ ...editedItem, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {popularIcons.map((iconName) => {
                      const IconComponent = (LucideIcons as any)[iconName];
                      return (
                        <SelectItem key={iconName} value={iconName}>
                          <div className="flex items-center gap-2">
                            {IconComponent && <IconComponent className="w-4 h-4" />}
                            <span>{iconName}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Widok</Label>
                <Select defaultValue="default">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Domyślnie</SelectItem>
                    <SelectItem value="simple">Simple</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tytuł</Label>
                <Input
                  value={editedItem.title || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                  placeholder="Napisz do Nas"
                />
              </div>

              <div className="space-y-2">
                <Label>Opis</Label>
                <Textarea
                  value={editedItem.description || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                  placeholder="+48 518 339 298..."
                  rows={4}
                />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="pb-4">
              <div className="text-sm text-muted-foreground">Style options coming soon...</div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="advanced" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="pb-4">
              <div className="text-sm text-muted-foreground">Advanced options coming soon...</div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
