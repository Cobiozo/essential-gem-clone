import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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

  // Get video settings from cells
  const videoCell = (editedItem.cells as any[])?.[0] || {};
  
  const updateVideoCell = (updates: any) => {
    const updatedCells = [{
      type: 'video',
      autoplay: videoCell.autoplay || false,
      controls: videoCell.controls !== false,
      loop: videoCell.loop || false,
      muted: videoCell.muted || false,
      aspectRatio: videoCell.aspectRatio || '16:9',
      position: 0,
      is_active: true,
      content: '',
      ...videoCell,
      ...updates
    }] as any;
    
    setEditedItem({
      ...editedItem,
      cells: updatedCells
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
            <div className="space-y-6 pb-4">
              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>Proporcje</Label>
                <Select
                  value={videoCell.aspectRatio || '16:9'}
                  onValueChange={(value) => updateVideoCell({ aspectRatio: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (Panoramiczny)</SelectItem>
                    <SelectItem value="4:3">4:3 (Standardowy)</SelectItem>
                    <SelectItem value="1:1">1:1 (Kwadrat)</SelectItem>
                    <SelectItem value="9:16">9:16 (Pionowy)</SelectItem>
                    <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              {/* Box Shadow */}
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
                  min={20}
                  max={100}
                  step={5}
                />
                <span className="text-sm text-muted-foreground">{editedItem.opacity || 100}%</span>
              </div>

              {/* Margins */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Odstępy</h4>
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
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="advanced" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-6 pb-4">
              {/* Playback Settings */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Odtwarzanie</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Automatyczne odtwarzanie</Label>
                    <p className="text-xs text-muted-foreground">Film rozpocznie się automatycznie</p>
                  </div>
                  <Switch
                    checked={videoCell.autoplay || false}
                    onCheckedChange={(checked) => updateVideoCell({ autoplay: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Pokaż kontrolki</Label>
                    <p className="text-xs text-muted-foreground">Przyciski play, pauza, głośność</p>
                  </div>
                  <Switch
                    checked={videoCell.controls !== false}
                    onCheckedChange={(checked) => updateVideoCell({ controls: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Zapętlenie</Label>
                    <p className="text-xs text-muted-foreground">Film odtwarza się w pętli</p>
                  </div>
                  <Switch
                    checked={videoCell.loop || false}
                    onCheckedChange={(checked) => updateVideoCell({ loop: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Wyciszony</Label>
                    <p className="text-xs text-muted-foreground">Rozpocznij bez dźwięku</p>
                  </div>
                  <Switch
                    checked={videoCell.muted || false}
                    onCheckedChange={(checked) => updateVideoCell({ muted: checked })}
                  />
                </div>
              </div>

              {/* Performance */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Wydajność</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Lazy Loading</Label>
                    <p className="text-xs text-muted-foreground">Ładuj film gdy będzie widoczny</p>
                  </div>
                  <Switch
                    checked={editedItem.lazy_loading !== false}
                    onCheckedChange={(checked) => handleFieldChange('lazy_loading', checked)}
                  />
                </div>
              </div>

              {/* Custom CSS */}
              <div className="space-y-2">
                <Label>Niestandardowa klasa CSS</Label>
                <Input
                  value={editedItem.style_class || ''}
                  onChange={(e) => handleFieldChange('style_class', e.target.value)}
                  placeholder="np. shadow-lg rounded-xl"
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
