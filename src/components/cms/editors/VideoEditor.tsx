import React, { useState, useEffect, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { CMSItem } from '@/types/cms';
import { Save, X, Youtube, Video, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaUpload } from '@/components/MediaUpload';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VideoEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

// Helper function to extract YouTube video ID
const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// Get YouTube thumbnail URL
const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

// Check if URL is a YouTube URL
const isYouTubeUrl = (url: string): boolean => {
  return extractYouTubeId(url) !== null;
};

export const VideoEditor: React.FC<VideoEditorProps> = ({ item, onSave, onCancel }) => {
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');
  const debouncedItem = useDebounce(editedItem, 1000);

  // Initialize YouTube URL from existing data
  useEffect(() => {
    const videoCell = (item.cells as any[])?.[0];
    if (videoCell?.youtubeId) {
      setYoutubeUrl(`https://www.youtube.com/watch?v=${videoCell.youtubeId}`);
    } else if (videoCell?.youtubeUrl) {
      setYoutubeUrl(videoCell.youtubeUrl);
    }
  }, []);

  useEffect(() => {
    if (debouncedItem && debouncedItem !== item) {
      onSave(debouncedItem);
    }
  }, [debouncedItem]);

  const handleSave = () => {
    onSave(editedItem);
  };

  const handleYouTubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    setUrlError('');
    
    if (!url.trim()) {
      // Clear YouTube data if URL is empty
      updateVideoCell({ youtubeId: null, youtubeUrl: null, thumbnail: null });
      return;
    }
    
    const videoId = extractYouTubeId(url);
    if (videoId) {
      const thumbnail = getYouTubeThumbnail(videoId);
      updateVideoCell({ 
        youtubeId: videoId, 
        youtubeUrl: url,
        thumbnail: thumbnail
      });
    } else {
      setUrlError('Nieprawidłowy URL YouTube. Obsługiwane formaty: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...');
    }
  };

  const handleMediaUpload = (url: string, type: 'image' | 'video' | 'document' | 'audio' | 'other', altText?: string) => {
    // Clear YouTube data when uploading local video
    const videoCell = (editedItem.cells as any[])?.[0] || {};
    const updatedCells = [{
      ...videoCell,
      type: 'video',
      youtubeId: null,
      youtubeUrl: null,
      thumbnail: null,
      position: 0,
      is_active: true,
    }] as any;
    
    setEditedItem({
      ...editedItem,
      media_url: url,
      media_type: type,
      media_alt_text: altText || '',
      cells: updatedCells
    });
    setYoutubeUrl('');
  };

  const handleFieldChange = (field: keyof CMSItem, value: any) => {
    setEditedItem({
      ...editedItem,
      [field]: value,
    });
  };

  // Get video settings from cells
  const videoCell = (editedItem.cells as any[])?.[0] || {};
  
  // Determine current video source
  const youtubeId = videoCell?.youtubeId;
  const hasYouTube = !!youtubeId;
  const hasLocalVideo = !!editedItem.media_url && !hasYouTube;
  const thumbnailUrl = videoCell?.thumbnail;
  
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
              {/* YouTube URL Input */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-500" />
                  Link do filmu YouTube
                </Label>
                <Input
                  value={youtubeUrl}
                  onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... lub https://youtu.be/..."
                />
                {urlError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{urlError}</AlertDescription>
                  </Alert>
                )}
              </div>
              
              {/* YouTube Preview */}
              {hasYouTube && thumbnailUrl && (
                <div className="space-y-2">
                  <Label>Podgląd miniaturki YouTube</Label>
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                    <img 
                      src={thumbnailUrl} 
                      alt="Miniaturka YouTube" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to lower quality thumbnail if maxres is not available
                        const img = e.target as HTMLImageElement;
                        if (img.src.includes('maxresdefault')) {
                          img.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
                        }
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-red-600 rounded-full p-3">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Separator */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">lub prześlij własny film</span>
                </div>
              </div>

              {/* Local Video Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Prześlij własny film
                </Label>
                <MediaUpload
                  onMediaUploaded={handleMediaUpload}
                  currentMediaUrl={hasLocalVideo ? editedItem.media_url || undefined : undefined}
                  currentMediaType={hasLocalVideo ? (editedItem.media_type as 'image' | 'video' | 'document' | 'audio' | 'other' | undefined) : undefined}
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
