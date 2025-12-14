import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CMSItem, ContentCell } from '@/types/cms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as icons from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  Type, 
  FileText, 
  List, 
  ExternalLink, 
  Anchor, 
  MousePointer2,
  Layers,
  Image,
  Video,
  LayoutGrid,
  Images,
  Star,
  ArrowUpDown,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { AdvancedStyleTab } from './AdvancedStyleTab';
import { MediaUpload } from '@/components/MediaUpload';
import { IconPicker } from '@/components/cms/IconPicker';

interface MultiCellEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

const CELL_TYPES = [
  { value: 'header', label: 'Nagłówek', icon: Type, description: 'Duży nagłówek sekcji' },
  { value: 'description', label: 'Opis', icon: FileText, description: 'Tekst opisowy' },
  { value: 'list_item', label: 'Element listy', icon: List, description: 'Punkt listy z kropką' },
  { value: 'text', label: 'Tekst', icon: FileText, description: 'Zwykły tekst' },
  { value: 'image', label: 'Obraz', icon: Image, description: 'Zdjęcie lub grafika' },
  { value: 'video', label: 'Film', icon: Video, description: 'Wideo lub YouTube' },
  { value: 'gallery', label: 'Galeria', icon: LayoutGrid, description: 'Siatka obrazów' },
  { value: 'carousel', label: 'Karuzela', icon: Images, description: 'Przewijane zdjęcia' },
  { value: 'icon', label: 'Ikona', icon: Star, description: 'Ikona z biblioteki' },
  { value: 'spacer', label: 'Odstęp', icon: ArrowUpDown, description: 'Pionowy odstęp' },
  { value: 'divider', label: 'Linia', icon: Minus, description: 'Linia rozdzielająca' },
  { value: 'button_functional', label: 'Przycisk funkcyjny', icon: MousePointer2, description: 'Przycisk z akcją' },
  { value: 'button_anchor', label: 'Przycisk kotwica', icon: Anchor, description: 'Link wewnętrzny' },
  { value: 'button_external', label: 'Przycisk zewnętrzny', icon: ExternalLink, description: 'Link zewnętrzny' },
  { value: 'section', label: 'Sekcja zagnieżdżona', icon: Layers, description: 'Kontener na elementy' },
] as const;

const generateId = () => `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const MultiCellEditor: React.FC<MultiCellEditorProps> = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState<CMSItem>(() => ({
    ...item,
    cells: item.cells || [],
    show_number: item.show_number !== false,
    number_type: item.number_type || 'auto',
    custom_number: item.custom_number || '',
    custom_number_image: item.custom_number_image || '',
  }));
  
  const [expandedCells, setExpandedCells] = useState<string[]>([]);
  const lastSavedRef = useRef<string>(JSON.stringify(item));
  const isSavingRef = useRef(false);
  
  const debouncedFormData = useDebounce(formData, 1500);

  // Auto-save
  useEffect(() => {
    const currentData = JSON.stringify(debouncedFormData);
    if (currentData !== lastSavedRef.current && !isSavingRef.current) {
      isSavingRef.current = true;
      onSave(debouncedFormData);
      lastSavedRef.current = currentData;
      setTimeout(() => {
        isSavingRef.current = false;
      }, 500);
    }
  }, [debouncedFormData, onSave]);

  const updateField = useCallback(<K extends keyof CMSItem>(field: K, value: CMSItem[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const cells = (formData.cells || []) as ContentCell[];

  const addCell = useCallback((type: ContentCell['type']) => {
    const newCell: ContentCell = {
      id: generateId(),
      type,
      content: '',
      url: type.includes('button') ? '' : undefined,
      position: cells.length,
      is_active: true,
    };
    
    if (type === 'section') {
      newCell.section_title = '';
      newCell.section_description = '';
      newCell.section_items = [];
    }
    
    if (type === 'image' || type === 'video') {
      newCell.media_url = '';
      newCell.media_alt = '';
    }
    
    if (type === 'gallery' || type === 'carousel') {
      newCell.items = [];
    }
    
    if (type === 'spacer') {
      newCell.height = 24;
    }
    
    const newCells = [...cells, newCell];
    const updatedFormData = { ...formData, cells: newCells };
    setFormData(updatedFormData);
    setExpandedCells(prev => [...prev, newCell.id!]);
    
    onSave(updatedFormData);
    lastSavedRef.current = JSON.stringify(updatedFormData);
  }, [cells, formData, onSave]);

  const updateCell = useCallback((cellId: string, updates: Partial<ContentCell>) => {
    const newCells = cells.map(cell => 
      cell.id === cellId ? { ...cell, ...updates } : cell
    );
    updateField('cells', newCells);
  }, [cells, updateField]);

  const removeCell = useCallback((cellId: string) => {
    const newCells = cells
      .filter(cell => cell.id !== cellId)
      .map((cell, index) => ({ ...cell, position: index }));
    const updatedFormData = { ...formData, cells: newCells };
    setFormData(updatedFormData);
    setExpandedCells(prev => prev.filter(id => id !== cellId));
    
    onSave(updatedFormData);
    lastSavedRef.current = JSON.stringify(updatedFormData);
  }, [cells, formData, onSave]);

  const moveCell = useCallback((cellId: string, direction: 'up' | 'down') => {
    const index = cells.findIndex(c => c.id === cellId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= cells.length) return;
    
    const newCells = [...cells];
    [newCells[index], newCells[newIndex]] = [newCells[newIndex], newCells[index]];
    const reorderedCells = newCells.map((cell, idx) => ({ ...cell, position: idx }));
    const updatedFormData = { ...formData, cells: reorderedCells };
    setFormData(updatedFormData);
    
    onSave(updatedFormData);
    lastSavedRef.current = JSON.stringify(updatedFormData);
  }, [cells, formData, onSave]);

  const toggleCellExpanded = (cellId: string) => {
    setExpandedCells(prev => 
      prev.includes(cellId) 
        ? prev.filter(id => id !== cellId)
        : [...prev, cellId]
    );
  };

  const getCellIcon = (type: string) => {
    const cellType = CELL_TYPES.find(t => t.value === type);
    return cellType?.icon || Type;
  };

  const getCellLabel = (type: string) => {
    const cellType = CELL_TYPES.find(t => t.value === type);
    return cellType?.label || type;
  };

  // Gallery item management
  const addGalleryItem = (cellId: string) => {
    const cell = cells.find(c => c.id === cellId);
    if (!cell) return;
    const newItems = [...(cell.items || []), { url: '', alt: '', caption: '' }];
    updateCell(cellId, { items: newItems });
  };

  const updateGalleryItem = (cellId: string, itemIndex: number, updates: Partial<{ url: string; alt?: string; caption?: string }>) => {
    const cell = cells.find(c => c.id === cellId);
    if (!cell || !cell.items) return;
    const newItems = cell.items.map((item, idx) => 
      idx === itemIndex ? { ...item, ...updates } : item
    );
    updateCell(cellId, { items: newItems });
  };

  const removeGalleryItem = (cellId: string, itemIndex: number) => {
    const cell = cells.find(c => c.id === cellId);
    if (!cell || !cell.items) return;
    const newItems = cell.items.filter((_, idx) => idx !== itemIndex);
    updateCell(cellId, { items: newItems });
  };

  const renderCellEditor = (cell: ContentCell) => {
    switch (cell.type) {
      case 'image':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Obraz</Label>
              <MediaUpload
                currentMediaUrl={cell.media_url || ''}
                onMediaUploaded={(url) => updateCell(cell.id!, { media_url: url })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tekst alternatywny (alt)</Label>
              <Input
                value={cell.media_alt || ''}
                onChange={(e) => updateCell(cell.id!, { media_alt: e.target.value })}
                placeholder="Opis obrazu..."
              />
            </div>
            
            {/* Image settings */}
            <div className="border-t pt-3 space-y-3">
              <Label className="text-xs font-medium">Ustawienia obrazu</Label>
              
              <div className="space-y-1">
                <Label className="text-xs">Dopasowanie</Label>
                <Select
                  value={cell.object_fit || 'cover'}
                  onValueChange={(v) => updateCell(cell.id!, { object_fit: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Wypełnij (cover)</SelectItem>
                    <SelectItem value="contain">Dopasuj (contain)</SelectItem>
                    <SelectItem value="fill">Rozciągnij (fill)</SelectItem>
                    <SelectItem value="none">Oryginalny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Max szer. (px)</Label>
                  <Input
                    type="number"
                    value={cell.max_width || ''}
                    onChange={(e) => updateCell(cell.id!, { max_width: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max wys. (px)</Label>
                  <Input
                    type="number"
                    value={cell.max_height || ''}
                    onChange={(e) => updateCell(cell.id!, { max_height: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Zaokrąglenie: {cell.border_radius || 0}px</Label>
                <Slider
                  value={[cell.border_radius || 0]}
                  onValueChange={([v]) => updateCell(cell.id!, { border_radius: v })}
                  min={0}
                  max={48}
                  step={2}
                  className="py-1"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Cień</Label>
                <Select
                  value={cell.box_shadow || 'none'}
                  onValueChange={(v) => updateCell(cell.id!, { box_shadow: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
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
              
              <div className="space-y-1">
                <Label className="text-xs">Hover skalowanie: {cell.hover_scale ? Math.round(cell.hover_scale * 100) : 100}%</Label>
                <Slider
                  value={[cell.hover_scale ? cell.hover_scale * 100 : 100]}
                  onValueChange={([v]) => updateCell(cell.id!, { hover_scale: v / 100 })}
                  min={100}
                  max={120}
                  step={1}
                  className="py-1"
                />
              </div>
            </div>
          </div>
        );
      
      case 'video':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">URL filmu (YouTube lub bezpośredni)</Label>
              <Input
                value={cell.media_url || ''}
                onChange={(e) => updateCell(cell.id!, { media_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=... lub https://...mp4"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Opis filmu</Label>
              <Input
                value={cell.media_alt || ''}
                onChange={(e) => updateCell(cell.id!, { media_alt: e.target.value })}
                placeholder="Opis filmu..."
              />
            </div>
            
            {/* Video settings */}
            <div className="border-t pt-3 space-y-3">
              <Label className="text-xs font-medium">Ustawienia wideo</Label>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Max szer. (px)</Label>
                  <Input
                    type="number"
                    value={cell.max_width || ''}
                    onChange={(e) => updateCell(cell.id!, { max_width: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max wys. (px)</Label>
                  <Input
                    type="number"
                    value={cell.max_height || ''}
                    onChange={(e) => updateCell(cell.id!, { max_height: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Zaokrąglenie: {cell.border_radius || 0}px</Label>
                <Slider
                  value={[cell.border_radius || 0]}
                  onValueChange={([v]) => updateCell(cell.id!, { border_radius: v })}
                  min={0}
                  max={24}
                  step={2}
                  className="py-1"
                />
              </div>
            </div>
          </div>
        );
      
      case 'gallery':
      case 'carousel':
        return (
          <div className="space-y-3">
            <Label className="text-xs">Obrazy ({cell.items?.length || 0})</Label>
            {cell.items?.map((galleryItem, idx) => (
              <Card key={idx} className="p-1.5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-auto text-destructive"
                      onClick={() => removeGalleryItem(cell.id!, idx)}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                  <MediaUpload
                    currentMediaUrl={galleryItem.url}
                    onMediaUploaded={(url) => updateGalleryItem(cell.id!, idx, { url })}
                  />
                  <Input
                    value={galleryItem.alt || ''}
                    onChange={(e) => updateGalleryItem(cell.id!, idx, { alt: e.target.value })}
                    placeholder="Alt..."
                    className="h-7 text-xs"
                  />
                  <Input
                    value={galleryItem.caption || ''}
                    onChange={(e) => updateGalleryItem(cell.id!, idx, { caption: e.target.value })}
                    placeholder="Podpis..."
                    className="h-7 text-xs"
                  />
                </div>
              </Card>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => addGalleryItem(cell.id!)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" /> Dodaj obraz
            </Button>
            
            {/* Gallery/Carousel settings */}
            <div className="border-t pt-3 space-y-3">
              <Label className="text-xs font-medium">Ustawienia {cell.type === 'gallery' ? 'galerii' : 'karuzeli'}</Label>
              
              {cell.type === 'gallery' && (
                <div className="space-y-1">
                  <Label className="text-xs">Kolumny: {cell.columns || 3}</Label>
                  <Slider
                    value={[cell.columns || 3]}
                    onValueChange={([v]) => updateCell(cell.id!, { columns: v })}
                    min={1}
                    max={6}
                    step={1}
                    className="py-1"
                  />
                </div>
              )}
              
              <div className="space-y-1">
                <Label className="text-xs">Odstęp: {cell.gap || 8}px</Label>
                <Slider
                  value={[cell.gap || 8]}
                  onValueChange={([v]) => updateCell(cell.id!, { gap: v })}
                  min={0}
                  max={32}
                  step={2}
                  className="py-1"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Proporcje obrazów</Label>
                <Select
                  value={cell.aspectRatio || 'auto'}
                  onValueChange={(v) => updateCell(cell.id!, { aspectRatio: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatyczne</SelectItem>
                    <SelectItem value="1/1">1:1 (Kwadrat)</SelectItem>
                    <SelectItem value="4/3">4:3</SelectItem>
                    <SelectItem value="16/9">16:9</SelectItem>
                    <SelectItem value="3/4">3:4 (Portret)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-xs">Lightbox (powiększenie)</Label>
                <Switch
                  checked={cell.lightbox !== false}
                  onCheckedChange={(v) => updateCell(cell.id!, { lightbox: v })}
                  className="scale-75"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Zaokrąglenie: {cell.border_radius || 0}px</Label>
                <Slider
                  value={[cell.border_radius || 0]}
                  onValueChange={([v]) => updateCell(cell.id!, { border_radius: v })}
                  min={0}
                  max={24}
                  step={2}
                  className="py-1"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Cień obrazów</Label>
                <Select
                  value={cell.box_shadow || 'none'}
                  onValueChange={(v) => updateCell(cell.id!, { box_shadow: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
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
              
              <div className="space-y-1">
                <Label className="text-xs">Hover skalowanie: {cell.hover_scale ? Math.round(cell.hover_scale * 100) : 100}%</Label>
                <Slider
                  value={[cell.hover_scale ? cell.hover_scale * 100 : 100]}
                  onValueChange={([v]) => updateCell(cell.id!, { hover_scale: v / 100 })}
                  min={100}
                  max={115}
                  step={1}
                  className="py-1"
                />
              </div>
            </div>
          </div>
        );
      
      case 'icon':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Ikona</Label>
              <IconPicker
                value={cell.content || 'Star'}
                onChange={(icon) => updateCell(cell.id!, { content: icon })}
              />
            </div>
          </div>
        );
      
      case 'spacer':
        return (
          <div className="space-y-1">
            <Label className="text-xs">Wysokość odstępu (px)</Label>
            <Input
              type="number"
              value={cell.height || 24}
              onChange={(e) => updateCell(cell.id!, { height: parseInt(e.target.value) || 24 })}
              min={4}
              max={200}
            />
          </div>
        );
      
      case 'divider':
        return (
          <div className="text-xs text-muted-foreground">
            Linia rozdzielająca - brak dodatkowych opcji
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="cells" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 shrink-0">
          <TabsTrigger value="cells" className="text-xs px-1">Komórki</TabsTrigger>
          <TabsTrigger value="main" className="text-xs px-1">Główne</TabsTrigger>
          <TabsTrigger value="number" className="text-xs px-1">Nr</TabsTrigger>
          <TabsTrigger value="style" className="text-xs px-1">Styl</TabsTrigger>
        </TabsList>

        <TabsContent value="cells" className="flex-1 overflow-hidden flex flex-col mt-2">
          <ScrollArea className="flex-1">
            <div className="space-y-2 p-2">
              {/* Lista komórek */}
              {cells.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Brak komórek</p>
                  <p className="text-xs">Dodaj pierwszą komórkę poniżej</p>
                </div>
              ) : (
                cells.sort((a, b) => a.position - b.position).map((cell, index) => {
                  const CellIcon = getCellIcon(cell.type);
                  const isExpanded = expandedCells.includes(cell.id!);
                  
                  return (
                    <Card key={cell.id} className="overflow-hidden">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleCellExpanded(cell.id!)}>
                        <CollapsibleTrigger asChild>
                          <div className="p-2 hover:bg-muted/50 cursor-pointer space-y-1">
                            {/* Row 1: Icon and label */}
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                              <CellIcon className="w-3 h-3 shrink-0" />
                              <span className="flex-1 text-xs font-medium truncate">
                                {cell.content || cell.media_url || getCellLabel(cell.type)}
                              </span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            {/* Row 2: Controls */}
                            <div className="flex items-center justify-end gap-0.5 pl-5">
                              <Switch
                                checked={cell.is_active}
                                onCheckedChange={(checked) => updateCell(cell.id!, { is_active: checked })}
                                onClick={(e) => e.stopPropagation()}
                                className="scale-75"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveCell(cell.id!, 'up');
                                }}
                                disabled={index === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveCell(cell.id!, 'down');
                                }}
                                disabled={index === cells.length - 1}
                              >
                                ↓
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCell(cell.id!);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="pt-0 pb-3 px-3 space-y-3 border-t">
                            {/* Typ komórki */}
                            <div className="space-y-1 pt-3">
                              <Label className="text-xs">Typ komórki</Label>
                              <Select
                                value={cell.type}
                                onValueChange={(value) => updateCell(cell.id!, { type: value as ContentCell['type'] })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CELL_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      <div className="flex items-center gap-2">
                                        <type.icon className="w-4 h-4" />
                                        {type.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Edytor specyficzny dla typu */}
                            {renderCellEditor(cell)}

                            {/* Treść tekstowa dla typów tekstowych */}
                            {['header', 'description', 'text', 'list_item'].includes(cell.type) && (
                              <div className="space-y-1">
                                <Label className="text-xs">Treść</Label>
                                {cell.type === 'description' || cell.type === 'text' ? (
                                  <Textarea
                                    value={cell.content}
                                    onChange={(e) => updateCell(cell.id!, { content: e.target.value })}
                                    placeholder="Wprowadź tekst..."
                                    className="min-h-[80px]"
                                  />
                                ) : (
                                  <Input
                                    value={cell.content}
                                    onChange={(e) => updateCell(cell.id!, { content: e.target.value })}
                                    placeholder={cell.type === 'header' ? 'Nagłówek...' : 'Tekst...'}
                                  />
                                )}
                              </div>
                            )}

                            {/* URL dla przycisków */}
                            {cell.type.includes('button') && (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-xs">Tekst przycisku</Label>
                                  <Input
                                    value={cell.content}
                                    onChange={(e) => updateCell(cell.id!, { content: e.target.value })}
                                    placeholder="Tekst przycisku..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">URL / Link</Label>
                                  <Input
                                    value={cell.url || ''}
                                    onChange={(e) => updateCell(cell.id!, { url: e.target.value })}
                                    placeholder={
                                      cell.type === 'button_external' 
                                        ? 'https://...' 
                                        : cell.type === 'button_anchor'
                                        ? '#sekcja-id'
                                        : '/strona'
                                    }
                                  />
                                </div>
                              </>
                            )}

                            {/* Sekcja zagnieżdżona */}
                            {cell.type === 'section' && (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-xs text-left block">Tytuł sekcji</Label>
                                  <Input
                                    value={cell.section_title || ''}
                                    onChange={(e) => updateCell(cell.id!, { section_title: e.target.value })}
                                    placeholder="Tytuł sekcji..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-left block">Opis sekcji</Label>
                                  <Textarea
                                    value={cell.section_description || ''}
                                    onChange={(e) => updateCell(cell.id!, { section_description: e.target.value })}
                                    placeholder="Opis sekcji..."
                                    className="min-h-[60px]"
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Elementy w sekcji zagnieżdżonej można dodawać bezpośrednio w edytorze layoutu.
                                </p>
                              </>
                            )}

                            {/* Wyrównanie - dla wszystkich typów */}
                            <div className="pt-2 border-t mt-2 space-y-1">
                              <Label className="text-xs text-left block">Wyrównanie</Label>
                              <Select
                                value={cell.alignment || 'left'}
                                onValueChange={(value) => updateCell(cell.id!, { alignment: value as ContentCell['alignment'] })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="left">
                                    <div className="flex items-center gap-2">
                                      <AlignLeft className="w-4 h-4" /> Do lewej
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="center">
                                    <div className="flex items-center gap-2">
                                      <AlignCenter className="w-4 h-4" /> Środek
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="right">
                                    <div className="flex items-center gap-2">
                                      <AlignRight className="w-4 h-4" /> Do prawej
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="full">
                                    <div className="flex items-center gap-2">
                                      <AlignJustify className="w-4 h-4" /> Pełna szerokość
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })
              )}

              {/* Dodaj nową komórkę */}
              <div className="pt-3 border-t">
                <Label className="text-xs mb-2 block">Dodaj nową komórkę</Label>
                <div className="grid grid-cols-1 gap-1">
                  {CELL_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant="outline"
                      size="sm"
                      onClick={() => addCell(type.value)}
                      className="justify-start h-7 text-xs"
                    >
                      <type.icon className="w-3 h-3 mr-2 shrink-0" />
                      <span className="truncate">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="main" className="flex-1 overflow-auto mt-2 text-left">
          <div className="space-y-3 p-2">
            <div className="space-y-1">
              <Label className="text-xs text-left w-full block">Tytuł elementu</Label>
              <Input
                value={formData.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Tytuł..."
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-left w-full block">Opis elementu</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Opis..."
                className="min-h-[80px] text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Element aktywny</Label>
              <Switch
                checked={formData.is_active !== false}
                onCheckedChange={(checked) => updateField('is_active', checked)}
                className="scale-90"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="number" className="flex-1 overflow-auto mt-2 text-left">
          <div className="space-y-3 p-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Pokaż numerację</Label>
              <Switch
                checked={formData.show_number !== false}
                onCheckedChange={(checked) => updateField('show_number', checked)}
                className="scale-90"
              />
            </div>

            {formData.show_number !== false && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-left w-full block">Typ numeracji</Label>
                  <Select
                    value={formData.number_type || 'auto'}
                    onValueChange={(value) => updateField('number_type', value as CMSItem['number_type'])}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (1, 2, 3...)</SelectItem>
                      <SelectItem value="text">Własny tekst</SelectItem>
                      <SelectItem value="image">Obraz</SelectItem>
                      <SelectItem value="icon">Ikona</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.number_type === 'text' && (
                  <div className="space-y-1">
                    <Label className="text-xs text-left w-full block">Własny tekst</Label>
                    <Input
                      value={formData.custom_number || ''}
                      onChange={(e) => updateField('custom_number', e.target.value)}
                      placeholder="np. A, ★, I"
                      className="h-8 text-xs"
                    />
                  </div>
                )}

                {formData.number_type === 'image' && (
                  <div className="space-y-1">
                    <Label className="text-xs text-left w-full block">Obraz</Label>
                    <MediaUpload
                      currentMediaUrl={formData.custom_number_image || ''}
                      onMediaUploaded={(url) => updateField('custom_number_image', url)}
                    />
                  </div>
                )}

                {formData.number_type === 'icon' && (
                  <div className="space-y-1">
                    <Label className="text-xs text-left w-full block">Ikona</Label>
                    <IconPicker
                      value={formData.icon || 'Star'}
                      onChange={(icon) => updateField('icon', icon)}
                      trigger={
                        <Button variant="outline" className="w-full h-8 text-xs justify-start gap-2">
                          {formData.icon && React.createElement((icons as any)[formData.icon] || Star, { className: "w-4 h-4" })}
                          <span>{formData.icon || 'Wybierz ikonę'}</span>
                        </Button>
                      }
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs text-left w-full block">Kolor tła</Label>
                  <Input
                    type="color"
                    value={formData.background_color || '#fbbf24'}
                    onChange={(e) => updateField('background_color', e.target.value)}
                    className="h-8 w-full"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-left w-full block">Kolor ikony</Label>
                  <Input
                    type="color"
                    value={formData.icon_color || '#ffffff'}
                    onChange={(e) => updateField('icon_color', e.target.value)}
                    className="h-8 w-full"
                  />
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-auto mt-2 text-left">
          <AdvancedStyleTab 
            item={formData} 
            onUpdate={(updates) => setFormData(prev => ({ ...prev, ...updates }))} 
          />
        </TabsContent>

      </Tabs>
    </div>
  );
};
