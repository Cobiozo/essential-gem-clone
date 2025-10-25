import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CMSItem } from '@/types/cms';
import { Save, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaUpload } from '@/components/MediaUpload';

interface VideoEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({ item, onSave, onCancel }) => {
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

  const handleMediaUpload = (url: string, type: 'image' | 'video' | 'document' | 'audio' | 'other', altText?: string) => {
    setEditedItem({
      ...editedItem,
      media_url: url,
      media_type: type,
      media_alt_text: altText || '',
    });
  };

  const handleFieldChange = (field: keyof CMSItem, value: any) => {
    setEditedItem({
      ...editedItem,
      [field]: value,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Edytuj Film</h3>
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
          <TabsTrigger value="content">Film</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
          <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Wybierz film</Label>
                <MediaUpload
                  onMediaUploaded={handleMediaUpload}
                  currentMediaUrl={editedItem.media_url || undefined}
                  currentMediaType={editedItem.media_type as 'image' | 'video' | 'document' | 'audio' | 'other' | undefined}
                  currentAltText={editedItem.media_alt_text || undefined}
                  allowedTypes={['video']}
                  maxSizeMB={null}
                />
              </div>

              <div className="space-y-2">
                <Label>Opis filmu</Label>
                <Input
                  value={editedItem.media_alt_text || ''}
                  onChange={(e) => handleFieldChange('media_alt_text', e.target.value)}
                  placeholder="Opisz film dla dostępności"
                />
              </div>

              <div className="space-y-2">
                <Label>Tytuł filmu</Label>
                <Input
                  value={editedItem.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="Tytuł wyświetlany nad filmem"
                />
              </div>

              <div className="space-y-2">
                <Label>Podpis pod filmem</Label>
                <Input
                  value={editedItem.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Tekst wyświetlany pod filmem"
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
