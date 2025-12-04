import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CMSItem } from '@/types/cms';
import { Save, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaUpload } from '@/components/MediaUpload';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface ImageEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ item, onSave, onCancel }) => {
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
        <h3 className="text-lg font-semibold">Edytuj Obrazek</h3>
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
          <TabsTrigger value="content">Obrazek</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
          <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Wybierz obrazek lub film</Label>
                <MediaUpload
                  onMediaUploaded={handleMediaUpload}
                  currentMediaUrl={editedItem.media_url || undefined}
                  currentMediaType={editedItem.media_type as 'image' | 'video' | 'document' | 'audio' | 'other' | undefined}
                  currentAltText={editedItem.media_alt_text || undefined}
                  allowedTypes={['image', 'video']}
                  maxSizeMB={null}
                />
              </div>

              <div className="space-y-2">
                <Label>Tekst alternatywny (ALT)</Label>
                <Input
                  value={editedItem.media_alt_text || ''}
                  onChange={(e) => handleFieldChange('media_alt_text', e.target.value)}
                  placeholder="Opisz obrazek dla dostępności"
                />
              </div>

              <div className="space-y-2">
                <Label>Tytuł obrazka</Label>
                <Input
                  value={editedItem.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="Tytuł wyświetlany nad obrazkiem"
                />
              </div>

              <div className="space-y-2">
                <Label>Podpis pod obrazkiem</Label>
                <Input
                  value={editedItem.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Tekst wyświetlany pod obrazkiem"
                />
              </div>

              <div className="space-y-2">
                <Label>Link URL (opcjonalnie)</Label>
                <Input
                  value={editedItem.url || ''}
                  onChange={(e) => handleFieldChange('url', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-6 pb-4">
              {/* Rozmiar i dopasowanie */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Rozmiar i dopasowanie</h4>
                
                <div className="space-y-2">
                  <Label>Dopasowanie obrazka</Label>
                  <Select
                    value={editedItem.object_fit || 'cover'}
                    onValueChange={(value) => handleFieldChange('object_fit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Wypełnij (cover)</SelectItem>
                      <SelectItem value="contain">Dopasuj (contain)</SelectItem>
                      <SelectItem value="fill">Rozciągnij (fill)</SelectItem>
                      <SelectItem value="none">Oryginalny (none)</SelectItem>
                      <SelectItem value="scale-down">Zmniejsz jeśli większy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max szerokość (px)</Label>
                    <Input
                      type="number"
                      value={editedItem.max_width ?? ''}
                      onChange={(e) => handleFieldChange('max_width', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="np. 500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max wysokość (px)</Label>
                    <Input
                      type="number"
                      value={editedItem.max_height ?? ''}
                      onChange={(e) => handleFieldChange('max_height', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="np. 300"
                    />
                  </div>
                </div>
              </div>

              {/* Wyrównanie */}
              <div className="space-y-2">
                <Label>Wyrównanie</Label>
                <Select
                  value={editedItem.text_align || 'center'}
                  onValueChange={(value) => handleFieldChange('text_align', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Do lewej</SelectItem>
                    <SelectItem value="center">Wyśrodkowane</SelectItem>
                    <SelectItem value="right">Do prawej</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Zaokrąglenie i cień */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Efekty</h4>
                
                <div className="space-y-2">
                  <Label>Zaokrąglenie rogów: {editedItem.border_radius || 0}px</Label>
                  <Slider
                    value={[editedItem.border_radius || 0]}
                    onValueChange={([value]) => handleFieldChange('border_radius', value)}
                    min={0}
                    max={50}
                    step={2}
                  />
                </div>

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
                      <SelectItem value="0 20px 40px rgba(0,0,0,0.2)">Bardzo mocny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Przezroczystość: {editedItem.opacity || 100}%</Label>
                  <Slider
                    value={[editedItem.opacity || 100]}
                    onValueChange={([value]) => handleFieldChange('opacity', value)}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
              </div>

              {/* Obramowanie */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Obramowanie</h4>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Szerokość</Label>
                    <Input
                      type="number"
                      value={editedItem.border_width || 0}
                      onChange={(e) => handleFieldChange('border_width', parseInt(e.target.value) || 0)}
                      min={0}
                      max={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Styl</Label>
                    <Select
                      value={editedItem.border_style || 'solid'}
                      onValueChange={(value) => handleFieldChange('border_style', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Ciągły</SelectItem>
                        <SelectItem value="dashed">Przerywany</SelectItem>
                        <SelectItem value="dotted">Kropkowany</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kolor</Label>
                    <Input
                      type="color"
                      value={editedItem.border_color || '#000000'}
                      onChange={(e) => handleFieldChange('border_color', e.target.value)}
                      className="h-10 p-1"
                    />
                  </div>
                </div>
              </div>

              {/* Odstępy */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Odstępy</h4>
                
                <div className="space-y-2">
                  <Label>Padding: {editedItem.padding || 0}px</Label>
                  <Slider
                    value={[editedItem.padding || 0]}
                    onValueChange={([value]) => handleFieldChange('padding', value)}
                    min={0}
                    max={50}
                    step={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Margines górny: {editedItem.margin_top || 0}px</Label>
                    <Slider
                      value={[editedItem.margin_top || 0]}
                      onValueChange={([value]) => handleFieldChange('margin_top', value)}
                      min={0}
                      max={100}
                      step={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Margines dolny: {editedItem.margin_bottom || 0}px</Label>
                    <Slider
                      value={[editedItem.margin_bottom || 0]}
                      onValueChange={([value]) => handleFieldChange('margin_bottom', value)}
                      min={0}
                      max={100}
                      step={4}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="advanced" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-6 pb-4">
              {/* Link settings */}
              {editedItem.url && (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-foreground">Ustawienia linku</h4>
                  <div className="space-y-2">
                    <Label>Otwieranie linku</Label>
                    <Select
                      value={editedItem.link_target || '_self'}
                      onValueChange={(value) => handleFieldChange('link_target', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_self">W tym samym oknie</SelectItem>
                        <SelectItem value="_blank">W nowym oknie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Performance */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Wydajność</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Lazy Loading</Label>
                    <p className="text-xs text-muted-foreground">Ładuj obrazek gdy będzie widoczny</p>
                  </div>
                  <Switch
                    checked={editedItem.lazy_loading !== false}
                    onCheckedChange={(checked) => handleFieldChange('lazy_loading', checked)}
                  />
                </div>
              </div>

              {/* Hover effects */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Efekty przy najechaniu</h4>
                
                <div className="space-y-2">
                  <Label>Skalowanie przy hover: {editedItem.hover_scale ? Math.round(editedItem.hover_scale * 100) : 100}%</Label>
                  <Slider
                    value={[editedItem.hover_scale ? editedItem.hover_scale * 100 : 100]}
                    onValueChange={([value]) => handleFieldChange('hover_scale', value / 100)}
                    min={100}
                    max={120}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Przezroczystość przy hover: {editedItem.hover_opacity || 100}%</Label>
                  <Slider
                    value={[editedItem.hover_opacity || 100]}
                    onValueChange={([value]) => handleFieldChange('hover_opacity', value)}
                    min={50}
                    max={100}
                    step={5}
                  />
                </div>
              </div>

              {/* Custom CSS */}
              <div className="space-y-2">
                <Label>Niestandardowa klasa CSS</Label>
                <Input
                  value={editedItem.style_class || ''}
                  onChange={(e) => handleFieldChange('style_class', e.target.value)}
                  placeholder="np. shadow-lg rounded-full"
                />
                <p className="text-xs text-muted-foreground">
                  Dodaj niestandardowe klasy Tailwind lub CSS
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
