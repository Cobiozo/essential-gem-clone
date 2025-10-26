import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CMSItem } from '@/types/cms';
import { Save, X, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { useDebounce } from '@/hooks/use-debounce';

interface MapEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const MapEditor: React.FC<MapEditorProps> = ({ item, onSave, onCancel }) => {
  const mapCell = (item.cells as any[])?.[0] || {};
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const [mapHeight, setMapHeight] = useState(mapCell.height || 450);
  const [zoom, setZoom] = useState(mapCell.zoom || 15);
  const [mapType, setMapType] = useState(mapCell.mapType || 'roadmap');
  const debouncedItem = useDebounce(editedItem, 1000);

  // Auto-save on debounced changes
  useEffect(() => {
    if (debouncedItem && JSON.stringify(debouncedItem) !== JSON.stringify(item)) {
      onSave(debouncedItem);
    }
  }, [debouncedItem, onSave]);

  const updateCell = (updates: any) => {
    const updatedCells = [{
      type: 'google_maps',
      content: editedItem.url || '',
      height: mapHeight,
      zoom: zoom,
      mapType: mapType,
      position: 0,
      is_active: true,
      ...updates
    }] as any;
    
    setEditedItem({
      ...editedItem,
      cells: updatedCells
    });
  };

  const handleUpdate = (field: string, value: any) => {
    const newItem = {
      ...editedItem,
      [field]: value
    };
    setEditedItem(newItem);
    
    if (field === 'url') {
      updateCell({ content: value });
    }
  };

  const handleMapHeightChange = (value: number) => {
    setMapHeight(value);
    updateCell({ height: value });
  };

  const handleZoomChange = (value: string) => {
    const zoomNum = parseInt(value);
    setZoom(zoomNum);
    updateCell({ zoom: zoomNum });
  };

  const handleMapTypeChange = (value: string) => {
    setMapType(value);
    updateCell({ mapType: value });
  };

  const handleSave = () => {
    // Ensure cells are updated before saving
    const updatedCells = [{
      type: 'google_maps',
      content: editedItem.url || '',
      height: mapHeight,
      zoom: zoom,
      mapType: mapType,
      position: 0,
      is_active: true
    }] as any;
    
    onSave({
      ...editedItem,
      cells: updatedCells
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Edytuj Mapy Google</h3>
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
          <TabsTrigger value="content">Mapa</TabsTrigger>
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
              <Label>Adres lub współrzędne</Label>
              <Input
                value={editedItem.url || ''}
                onChange={(e) => handleUpdate('url', e.target.value)}
                placeholder="https://www.google.com/maps/embed?pb=..."
              />
              <p className="text-xs text-muted-foreground">
                Wklej pełny URL z Google Maps Embed (kliknij "Udostępnij" → "Osadź mapę" w Google Maps)
              </p>
              </div>

              <div className="space-y-2">
                <Label>Nazwa miejsca (opcjonalnie)</Label>
              <Input
                value={editedItem.title || ''}
                onChange={(e) => handleUpdate('title', e.target.value)}
                placeholder="np. Nasze biuro"
              />
              </div>

              <div className="space-y-2">
                <Label>Opis (opcjonalnie)</Label>
              <Input
                value={editedItem.description || ''}
                onChange={(e) => handleUpdate('description', e.target.value)}
                placeholder="np. Zapraszamy do odwiedzenia"
              />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label>Wysokość mapy (px)</Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={[mapHeight]}
                  onValueChange={([value]) => handleMapHeightChange(value)}
                  min={200}
                  max={800}
                  step={50}
                  className="flex-1"
                />
                <span className="w-16 text-sm text-muted-foreground">{mapHeight}px</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Poziom przybliżenia</Label>
              <Select value={zoom.toString()} onValueChange={handleZoomChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Bardzo oddalone (miasto)</SelectItem>
                  <SelectItem value="13">Oddalone (dzielnica)</SelectItem>
                  <SelectItem value="15">Standard (ulica)</SelectItem>
                  <SelectItem value="17">Przybliżone (budynek)</SelectItem>
                  <SelectItem value="19">Bardzo przybliżone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Typ mapy</Label>
              <Select value={mapType} onValueChange={handleMapTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roadmap">Mapa drogowa</SelectItem>
                  <SelectItem value="satellite">Satelita</SelectItem>
                  <SelectItem value="hybrid">Hybrydowa</SelectItem>
                  <SelectItem value="terrain">Teren</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">
                Mapa będzie wyświetlana z użyciem Google Maps Embed API
              </p>
            </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
