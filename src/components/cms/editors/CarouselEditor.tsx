import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaUpload } from '@/components/MediaUpload';

interface CarouselEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const CarouselEditor: React.FC<CarouselEditorProps> = ({ item, onSave, onCancel }) => {
  const carouselCell = (item.cells as any[])?.[0] || {};
  const [images, setImages] = useState<Array<{ url: string; alt?: string; caption?: string }>>(
    carouselCell.images || []
  );
  const [autoplay, setAutoplay] = useState(carouselCell.autoplay !== false);
  const [interval, setInterval] = useState(carouselCell.interval || 3000);
  
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
      type: 'carousel',
      images,
      autoplay,
      interval,
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

  const handleAddImage = () => {
    const newImages = [...images, { url: '', alt: '', caption: '' }];
    setImages(newImages);
    updateCell({ images: newImages });
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    updateCell({ images: newImages });
  };

  const handleImageChange = (index: number, field: 'url' | 'alt' | 'caption', value: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], [field]: value };
    setImages(newImages);
    updateCell({ images: newImages });
  };

  const handleAutoplayChange = (checked: boolean) => {
    setAutoplay(checked);
    updateCell({ autoplay: checked });
  };

  const handleIntervalChange = (value: number) => {
    setInterval(value);
    updateCell({ interval: value });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja karuzeli
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
            <TabsTrigger value="content">Obrazy</TabsTrigger>
            <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="p-4 space-y-4">
            <div className="space-y-4">
              {images.map((img, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <MediaUpload
                        onMediaUploaded={(url, type, altText) => {
                          handleImageChange(index, 'url', url);
                          if (altText) handleImageChange(index, 'alt', altText);
                        }}
                        currentMediaUrl={img.url || undefined}
                        currentMediaType="image"
                        allowedTypes={['image']}
                      />
                      <Input
                        value={img.alt || ''}
                        onChange={(e) => handleImageChange(index, 'alt', e.target.value)}
                        placeholder="Tekst alternatywny (alt)"
                      />
                      <Input
                        value={img.caption || ''}
                        onChange={(e) => handleImageChange(index, 'caption', e.target.value)}
                        placeholder="Podpis (caption)"
                      />
                    </div>
                    <Button
                      onClick={() => handleRemoveImage(index)}
                      variant="destructive"
                      size="icon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleAddImage} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Dodaj obraz
            </Button>
          </TabsContent>

          <TabsContent value="settings" className="p-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="autoplay"
                checked={autoplay}
                onCheckedChange={handleAutoplayChange}
              />
              <Label htmlFor="autoplay">Automatyczne przewijanie</Label>
            </div>

            {autoplay && (
              <div className="space-y-2">
                <Label>Interwał: {interval}ms</Label>
                <Slider
                  value={[interval]}
                  onValueChange={([v]) => handleIntervalChange(v)}
                  min={1000}
                  max={10000}
                  step={500}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
