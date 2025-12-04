import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaUpload } from '@/components/MediaUpload';

interface GalleryEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const GalleryEditor: React.FC<GalleryEditorProps> = ({ item, onSave, onCancel }) => {
  const galleryCell = (item.cells as any[])?.[0] || {};
  const [images, setImages] = useState<Array<{ url: string; alt?: string; title?: string }>>(
    galleryCell.images || []
  );
  const [columns, setColumns] = useState(galleryCell.columns || 3);
  const [gap, setGap] = useState(galleryCell.gap || 16);
  const [lightbox, setLightbox] = useState(galleryCell.lightbox !== false);
  const [aspectRatio, setAspectRatio] = useState(galleryCell.aspectRatio || 'auto');
  
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
      type: 'gallery',
      images,
      columns,
      gap,
      lightbox,
      aspectRatio,
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
    const newImages = [...images, { url: '', alt: '', title: '' }];
    setImages(newImages);
    updateCell({ images: newImages });
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    updateCell({ images: newImages });
  };

  const handleImageChange = (index: number, field: 'url' | 'alt' | 'title', value: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], [field]: value };
    setImages(newImages);
    updateCell({ images: newImages });
  };

  const handleColumnsChange = (value: number) => {
    setColumns(value);
    updateCell({ columns: value });
  };

  const handleGapChange = (value: number) => {
    setGap(value);
    updateCell({ gap: value });
  };

  const handleLightboxChange = (checked: boolean) => {
    setLightbox(checked);
    updateCell({ lightbox: checked });
  };

  const handleAspectRatioChange = (value: string) => {
    setAspectRatio(value);
    updateCell({ aspectRatio: value });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja galerii
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
                        value={img.title || ''}
                        onChange={(e) => handleImageChange(index, 'title', e.target.value)}
                        placeholder="Tytuł (wyświetlany przy hover)"
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

          <TabsContent value="settings" className="p-4 space-y-6">
            <div className="space-y-2">
              <Label>Liczba kolumn: {columns}</Label>
              <Slider
                value={[columns]}
                onValueChange={([v]) => handleColumnsChange(v)}
                min={1}
                max={6}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Odstęp między obrazami: {gap}px</Label>
              <Slider
                value={[gap]}
                onValueChange={([v]) => handleGapChange(v)}
                min={0}
                max={48}
                step={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Proporcje obrazów</Label>
              <Select value={aspectRatio} onValueChange={handleAspectRatioChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatyczne</SelectItem>
                  <SelectItem value="1:1">1:1 (Kwadrat)</SelectItem>
                  <SelectItem value="4:3">4:3</SelectItem>
                  <SelectItem value="16:9">16:9</SelectItem>
                  <SelectItem value="3:4">3:4 (Portret)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Lightbox</Label>
                <p className="text-xs text-muted-foreground">Powiększ obraz po kliknięciu</p>
              </div>
              <Switch
                checked={lightbox}
                onCheckedChange={handleLightboxChange}
              />
            </div>
          </TabsContent>

          <TabsContent value="style" className="p-4 space-y-6">
            {/* Border Radius */}
            <div className="space-y-2">
              <Label>Zaokrąglenie rogów obrazów (px)</Label>
              <Slider
                value={[editedItem.border_radius || 0]}
                onValueChange={([value]) => handleFieldChange('border_radius', value)}
                min={0}
                max={24}
                step={2}
              />
              <span className="text-sm text-muted-foreground">{editedItem.border_radius || 0}px</span>
            </div>

            {/* Shadow */}
            <div className="space-y-2">
              <Label>Cień obrazów</Label>
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

            {/* Border */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Obramowanie obrazów</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>Szerokość</Label>
                  <Input
                    type="number"
                    value={editedItem.border_width || 0}
                    onChange={(e) => handleFieldChange('border_width', parseInt(e.target.value) || 0)}
                    min={0}
                    max={10}
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
                    value={editedItem.border_color || '#e5e7eb'}
                    onChange={(e) => handleFieldChange('border_color', e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Spacing */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Odstępy galerii</h4>
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
                  max={115}
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
                placeholder="np. masonry gap-4"
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
