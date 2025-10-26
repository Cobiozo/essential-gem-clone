import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SocialIconsEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

interface SocialIcon {
  platform: string;
  url: string;
}

export const SocialIconsEditor: React.FC<SocialIconsEditorProps> = ({ item, onSave, onCancel }) => {
  const socialCell = (item.cells as any[])?.[0] || {};
  const [icons, setIcons] = useState<SocialIcon[]>(socialCell.icons || []);
  const [size, setSize] = useState(socialCell.size || 24);
  
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<string>(JSON.stringify(item));
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const debouncedItemString = JSON.stringify(debouncedItem);
    if (debouncedItem && debouncedItemString !== prevItemRef.current) {
      setIsSaving(true);
      onSave(debouncedItem);
      prevItemRef.current = debouncedItemString;
      
      setTimeout(() => {
        setIsSaving(false);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }, 300);
    }
  }, [debouncedItem, onSave]);

  const updateCell = (updates: any) => {
    const updatedCells = [{
      type: 'social',
      icons,
      size,
      position: 0,
      is_active: true,
      content: '',
      ...updates
    }] as any;
    
    setEditedItem({
      ...editedItem,
      cells: updatedCells
    });
  };

  const handleAddIcon = () => {
    const newIcons = [...icons, { platform: 'facebook', url: '' }];
    setIcons(newIcons);
    updateCell({ icons: newIcons });
  };

  const handleRemoveIcon = (index: number) => {
    const newIcons = icons.filter((_, i) => i !== index);
    setIcons(newIcons);
    updateCell({ icons: newIcons });
  };

  const handleIconChange = (index: number, field: 'platform' | 'url', value: string) => {
    const newIcons = [...icons];
    newIcons[index][field] = value;
    setIcons(newIcons);
    updateCell({ icons: newIcons });
  };

  const handleSizeChange = (value: number) => {
    setSize(value);
    updateCell({ size: value });
  };

  const platforms = ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'github', 'tiktok'];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja ikon społecznościowych
          {isSaving && <span className="text-xs text-muted-foreground">(zapisywanie...)</span>}
          {justSaved && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        </h3>
        <div className="flex gap-2">
          <Button onClick={() => onSave(editedItem)} size="sm">
            Zapisz
          </Button>
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none px-4">
            <TabsTrigger value="content">Ikony</TabsTrigger>
            <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="p-4 space-y-4">
            <div className="space-y-3">
              {icons.map((icon, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Select
                      value={icon.platform}
                      onValueChange={(value) => handleIconChange(index, 'platform', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {platforms.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={icon.url}
                      onChange={(e) => handleIconChange(index, 'url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <Button
                    onClick={() => handleRemoveIcon(index)}
                    variant="destructive"
                    size="icon"
                    className="mt-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={handleAddIcon} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Dodaj ikonę
            </Button>
          </TabsContent>

          <TabsContent value="settings" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Rozmiar ikon: {size}px</Label>
              <Slider
                value={[size]}
                onValueChange={([v]) => handleSizeChange(v)}
                min={16}
                max={64}
                step={4}
              />
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
