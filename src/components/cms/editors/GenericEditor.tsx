import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CMSItem } from '@/types/cms';
import { Save, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GenericEditorProps {
  item: CMSItem;
  sectionId: string;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const GenericEditor: React.FC<GenericEditorProps> = ({ item, sectionId, onSave, onCancel }) => {
  const [editedItem, setEditedItem] = useState<CMSItem>(item);

  const handleSave = () => {
    onSave(editedItem);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Edytuj Element</h3>
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
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="content" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Tytuł</Label>
              <Input
                value={editedItem.title || ''}
                onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                placeholder="Wprowadź tytuł"
              />
            </div>

            <div className="space-y-2">
              <Label>Opis</Label>
              <Textarea
                value={editedItem.description || ''}
                onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                placeholder="Wprowadź opis"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={editedItem.url || ''}
                onChange={(e) => setEditedItem({ ...editedItem, url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </TabsContent>

          <TabsContent value="style" className="p-4">
            <div className="text-sm text-muted-foreground">Style options coming soon...</div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
