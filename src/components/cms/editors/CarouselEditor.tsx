import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [loop, setLoop] = useState(carouselCell.loop !== false);
  const [showIndicators, setShowIndicators] = useState(carouselCell.showIndicators !== false);
  
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

  const handleFieldChange = (field: keyof CMSItem, value: any) => {
    setEditedItem({
      ...editedItem,
      [field]: value,
    });
  };

  const updateCell = (updates: any) => {
    const updatedCells = [{
      type: 'carousel',
      images,
      autoplay,
      interval,
      loop,
      showIndicators,
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

  const handleLoopChange = (checked: boolean) => {
    setLoop(checked);
    updateCell({ loop: checked });
  };

  const handleShowIndicatorsChange = (checked: boolean) => {
    setShowIndicators(checked);
    updateCell({ showIndicators: checked });
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
            <TabsTrigger value="style">Styl</TabsTrigger>
            <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
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
            <div className="flex items-center justify-between">
              <div>
                <Label>Automatyczne przewijanie</Label>
                <p className="text-xs text-muted-foreground">Slajdy zmieniają się automatycznie</p>
              </div>
              <Switch
                checked={autoplay}
                onCheckedChange={handleAutoplayChange}
              />
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

            <div className="flex items-center justify-between">
              <div>
                <Label>Zapętlenie</Label>
                <p className="text-xs text-muted-foreground">Po ostatnim slajdzie wróć do pierwszego</p>
              </div>
              <Switch
                checked={loop}
                onCheckedChange={handleLoopChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Pokaż wskaźniki</Label>
                <p className="text-xs text-muted-foreground">Kropki nawigacyjne pod karuzelą</p>
              </div>
              <Switch
                checked={showIndicators}
                onCheckedChange={handleShowIndicatorsChange}
              />
            </div>
          </TabsContent>

          <TabsContent value="style" className="p-4 space-y-6">
            {/* Border Radius */}
            <div className="space-y-2">
              <Label>Zaokrąglenie rogów (px)</Label>
              <Slider
                value={[editedItem.border_radius || 0]}
                onValueChange={([value]) => handleFieldChange('border_radius', value)}
                min={0}
                max={32}
                step={2}
              />
              <span className="text-sm text-muted-foreground">{editedItem.border_radius || 0}px</span>
            </div>

            {/* Shadow */}
            <div className="space-y-2">
              <Label>Cień</Label>
              <Select
                value={editedItem.box_shadow || 'none'}
                onValueChange={(value) => handleFieldChange('box_shadow', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak</SelectItem>
                  <SelectItem value="0 1px 3px rgba(0,0,0,0.12)">Lekki</SelectItem>
                  <SelectItem value="0 4px 6px rgba(0,0,0,0.1)">Średni</SelectItem>
                  <SelectItem value="0 10px 25px rgba(0,0,0,0.15)">Mocny</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Opacity */}
            <div className="space-y-2">
              <Label>Przezroczystość (%)</Label>
              <Slider
                value={[editedItem.opacity || 100]}
                onValueChange={([value]) => handleFieldChange('opacity', value)}
                min={50}
                max={100}
                step={5}
              />
              <span className="text-sm text-muted-foreground">{editedItem.opacity || 100}%</span>
            </div>

            {/* Spacing */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Odstępy</h4>
              <div className="space-y-2">
                <Label>Padding (px)</Label>
                <Slider
                  value={[editedItem.padding || 0]}
                  onValueChange={([value]) => handleFieldChange('padding', value)}
                  min={0}
                  max={32}
                  step={4}
                />
                <span className="text-sm text-muted-foreground">{editedItem.padding || 0}px</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Margines górny (px)</Label>
                  <Slider
                    value={[editedItem.margin_top || 0]}
                    onValueChange={([value]) => handleFieldChange('margin_top', value)}
                    min={0}
                    max={100}
                    step={4}
                  />
                  <span className="text-sm text-muted-foreground">{editedItem.margin_top || 0}px</span>
                </div>
                <div className="space-y-2">
                  <Label>Margines dolny (px)</Label>
                  <Slider
                    value={[editedItem.margin_bottom || 0]}
                    onValueChange={([value]) => handleFieldChange('margin_bottom', value)}
                    min={0}
                    max={100}
                    step={4}
                  />
                  <span className="text-sm text-muted-foreground">{editedItem.margin_bottom || 0}px</span>
                </div>
              </div>
            </div>

            {/* Max dimensions */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Wymiary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max szerokość (px)</Label>
                  <Input
                    type="number"
                    value={editedItem.max_width || ''}
                    onChange={(e) => handleFieldChange('max_width', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="np. 800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max wysokość (px)</Label>
                  <Input
                    type="number"
                    value={editedItem.max_height || ''}
                    onChange={(e) => handleFieldChange('max_height', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="np. 500"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="p-4 space-y-6">
            {/* Performance */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Wydajność</h4>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Lazy Loading</Label>
                  <p className="text-xs text-muted-foreground">Ładuj obrazy gdy będą widoczne</p>
                </div>
                <Switch
                  checked={editedItem.lazy_loading !== false}
                  onCheckedChange={(checked) => handleFieldChange('lazy_loading', checked)}
                />
              </div>
            </div>

            {/* Hover Effects */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Efekty przy najechaniu</h4>
              <div className="space-y-2">
                <Label>Skalowanie przy hover</Label>
                <Slider
                  value={[editedItem.hover_scale ? editedItem.hover_scale * 100 : 100]}
                  onValueChange={([value]) => handleFieldChange('hover_scale', value / 100)}
                  min={100}
                  max={110}
                  step={1}
                />
                <span className="text-sm text-muted-foreground">{editedItem.hover_scale ? Math.round(editedItem.hover_scale * 100) : 100}%</span>
              </div>
              <div className="space-y-2">
                <Label>Przezroczystość przy hover (%)</Label>
                <Slider
                  value={[editedItem.hover_opacity || 100]}
                  onValueChange={([value]) => handleFieldChange('hover_opacity', value)}
                  min={70}
                  max={100}
                  step={5}
                />
                <span className="text-sm text-muted-foreground">{editedItem.hover_opacity || 100}%</span>
              </div>
            </div>

            {/* Custom CSS */}
            <div className="space-y-2">
              <Label>Niestandardowa klasa CSS</Label>
              <Input
                value={editedItem.style_class || ''}
                onChange={(e) => handleFieldChange('style_class', e.target.value)}
                placeholder="np. overflow-hidden shadow-xl"
              />
              <p className="text-xs text-muted-foreground">
                Dodaj niestandardowe klasy Tailwind lub CSS
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
