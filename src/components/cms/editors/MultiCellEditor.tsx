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

  // Nested section sub-cell management
  const addSubCell = useCallback((parentCellId: string, type: ContentCell['type']) => {
    const parentCell = cells.find(c => c.id === parentCellId);
    if (!parentCell) return;
    
    const subCells = parentCell.section_items as ContentCell[] || [];
    const newSubCell: ContentCell = {
      id: generateId(),
      type,
      content: '',
      url: type.includes('button') ? '' : undefined,
      position: subCells.length,
      is_active: true,
    };
    
    if (type === 'image' || type === 'video') {
      newSubCell.media_url = '';
      newSubCell.media_alt = '';
    }
    if (type === 'gallery' || type === 'carousel') {
      newSubCell.items = [];
    }
    if (type === 'spacer') {
      newSubCell.height = 24;
    }
    
    const newSubCells = [...subCells, newSubCell];
    updateCell(parentCellId, { section_items: newSubCells as any });
    setExpandedCells(prev => [...prev, newSubCell.id!]);
    
    // Immediate save for structure change
    const updatedCells = cells.map(c => 
      c.id === parentCellId ? { ...c, section_items: newSubCells } : c
    );
    const updatedFormData = { ...formData, cells: updatedCells };
    onSave(updatedFormData);
    lastSavedRef.current = JSON.stringify(updatedFormData);
  }, [cells, formData, onSave, updateCell]);

  const updateSubCell = useCallback((parentCellId: string, subCellId: string, updates: Partial<ContentCell>) => {
    const parentCell = cells.find(c => c.id === parentCellId);
    if (!parentCell) return;
    
    const subCells = parentCell.section_items as ContentCell[] || [];
    const newSubCells = subCells.map(sc => 
      sc.id === subCellId ? { ...sc, ...updates } : sc
    );
    updateCell(parentCellId, { section_items: newSubCells as any });
  }, [cells, updateCell]);

  const removeSubCell = useCallback((parentCellId: string, subCellId: string) => {
    const parentCell = cells.find(c => c.id === parentCellId);
    if (!parentCell) return;
    
    const subCells = parentCell.section_items as ContentCell[] || [];
    const newSubCells = subCells
      .filter(sc => sc.id !== subCellId)
      .map((sc, idx) => ({ ...sc, position: idx }));
    
    const updatedCells = cells.map(c => 
      c.id === parentCellId ? { ...c, section_items: newSubCells } : c
    );
    const updatedFormData = { ...formData, cells: updatedCells };
    setFormData(updatedFormData);
    setExpandedCells(prev => prev.filter(id => id !== subCellId));
    
    onSave(updatedFormData);
    lastSavedRef.current = JSON.stringify(updatedFormData);
  }, [cells, formData, onSave]);

  const moveSubCell = useCallback((parentCellId: string, subCellId: string, direction: 'up' | 'down') => {
    const parentCell = cells.find(c => c.id === parentCellId);
    if (!parentCell) return;
    
    const subCells = parentCell.section_items as ContentCell[] || [];
    const index = subCells.findIndex(sc => sc.id === subCellId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subCells.length) return;
    
    const newSubCells = [...subCells];
    [newSubCells[index], newSubCells[newIndex]] = [newSubCells[newIndex], newSubCells[index]];
    const reorderedSubCells = newSubCells.map((sc, idx) => ({ ...sc, position: idx }));
    
    const updatedCells = cells.map(c => 
      c.id === parentCellId ? { ...c, section_items: reorderedSubCells } : c
    );
    const updatedFormData = { ...formData, cells: updatedCells };
    setFormData(updatedFormData);
    
    onSave(updatedFormData);
    lastSavedRef.current = JSON.stringify(updatedFormData);
  }, [cells, formData, onSave]);

  // Get nested section sub-cell types (exclude nested section to prevent infinite nesting)
  const SUB_CELL_TYPES = CELL_TYPES.filter(t => t.value !== 'section');

  const renderCellEditor = (cell: ContentCell) => {
    switch (cell.type) {
      case 'image':
        return (
          <div className="space-y-2">
            <div className="space-y-0.5">
              <Label className="text-[10px]">Obraz</Label>
              <MediaUpload
                compact
                currentMediaUrl={cell.media_url || ''}
                onMediaUploaded={(url) => updateCell(cell.id!, { media_url: url })}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px]">Tekst alt</Label>
              <Input
                value={cell.media_alt || ''}
                onChange={(e) => updateCell(cell.id!, { media_alt: e.target.value })}
                placeholder="Opis..."
                className="h-6 text-[11px] px-1.5"
              />
            </div>
            
            {/* Image settings */}
            <div className="border-t pt-2 space-y-2">
              <Label className="text-[10px] font-medium">Wymiary i styl</Label>
              
              {/* Exact dimensions */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Szer. (px)</Label>
                  <Input
                    type="number"
                    value={cell.width || ''}
                    onChange={(e) => updateCell(cell.id!, { width: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="h-6 text-[11px] px-1.5"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Wys. (px)</Label>
                  <Input
                    type="number"
                    value={cell.height_px || ''}
                    onChange={(e) => updateCell(cell.id!, { height_px: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="h-6 text-[11px] px-1.5"
                  />
                </div>
              </div>
              
              {/* Max dimensions */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Max szer.</Label>
                  <Input
                    type="number"
                    value={cell.max_width || ''}
                    onChange={(e) => updateCell(cell.id!, { max_width: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="h-6 text-[11px] px-1.5"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Max wys.</Label>
                  <Input
                    type="number"
                    value={cell.max_height || ''}
                    onChange={(e) => updateCell(cell.id!, { max_height: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="h-6 text-[11px] px-1.5"
                  />
                </div>
              </div>
              
              <div className="space-y-0.5">
                <Label className="text-[10px]">Dopasowanie</Label>
                <Select
                  value={cell.object_fit || 'cover'}
                  onValueChange={(v) => updateCell(cell.id!, { object_fit: v })}
                >
                  <SelectTrigger className="h-6 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Wypełnij</SelectItem>
                    <SelectItem value="contain">Dopasuj</SelectItem>
                    <SelectItem value="fill">Rozciągnij</SelectItem>
                    <SelectItem value="none">Oryginalny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Rogi: {cell.border_radius || 0}px</Label>
                  <Slider
                    value={[cell.border_radius || 0]}
                    onValueChange={([v]) => updateCell(cell.id!, { border_radius: v })}
                    min={0}
                    max={48}
                    step={2}
                    className="py-0.5"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Hover: {cell.hover_scale ? Math.round(cell.hover_scale * 100) : 100}%</Label>
                  <Slider
                    value={[cell.hover_scale ? cell.hover_scale * 100 : 100]}
                    onValueChange={([v]) => updateCell(cell.id!, { hover_scale: v / 100 })}
                    min={100}
                    max={120}
                    step={1}
                    className="py-0.5"
                  />
                </div>
              </div>
              
              <div className="space-y-0.5">
                <Label className="text-[10px]">Cień</Label>
                <Select
                  value={cell.box_shadow || 'none'}
                  onValueChange={(v) => updateCell(cell.id!, { box_shadow: v })}
                >
                  <SelectTrigger className="h-6 text-[11px]">
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
            </div>
          </div>
        );
      
      case 'video':
        return (
          <div className="space-y-2">
            <div className="space-y-0.5">
              <Label className="text-[10px]">URL filmu</Label>
              <Input
                value={cell.media_url || ''}
                onChange={(e) => updateCell(cell.id!, { media_url: e.target.value })}
                placeholder="YouTube lub mp4..."
                className="h-6 text-[11px] px-1.5"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px]">Opis</Label>
              <Input
                value={cell.media_alt || ''}
                onChange={(e) => updateCell(cell.id!, { media_alt: e.target.value })}
                placeholder="Opis..."
                className="h-6 text-[11px] px-1.5"
              />
            </div>
            
            <div className="border-t pt-2 space-y-2">
              <Label className="text-[10px] font-medium">Wymiary</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Max szer.</Label>
                  <Input
                    type="number"
                    value={cell.max_width || ''}
                    onChange={(e) => updateCell(cell.id!, { max_width: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="h-6 text-[11px] px-1.5"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Max wys.</Label>
                  <Input
                    type="number"
                    value={cell.max_height || ''}
                    onChange={(e) => updateCell(cell.id!, { max_height: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="h-6 text-[11px] px-1.5"
                  />
                </div>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Rogi: {cell.border_radius || 0}px</Label>
                <Slider
                  value={[cell.border_radius || 0]}
                  onValueChange={([v]) => updateCell(cell.id!, { border_radius: v })}
                  min={0}
                  max={24}
                  step={2}
                  className="py-0.5"
                />
              </div>
            </div>
          </div>
        );
      
      case 'gallery':
      case 'carousel':
        return (
          <div className="space-y-2">
            <Label className="text-[10px]">Obrazy ({cell.items?.length || 0})</Label>
            {cell.items?.map((galleryItem, idx) => (
              <Card key={idx} className="p-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">#{idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-auto text-destructive"
                      onClick={() => removeGalleryItem(cell.id!, idx)}
                    >
                      <Trash2 className="w-2 h-2" />
                    </Button>
                  </div>
                  <MediaUpload
                    compact
                    currentMediaUrl={galleryItem.url}
                    onMediaUploaded={(url) => updateGalleryItem(cell.id!, idx, { url })}
                  />
                  <Input
                    value={galleryItem.alt || ''}
                    onChange={(e) => updateGalleryItem(cell.id!, idx, { alt: e.target.value })}
                    placeholder="Alt..."
                    className="h-5 text-[10px] px-1"
                  />
                  <Input
                    value={galleryItem.caption || ''}
                    onChange={(e) => updateGalleryItem(cell.id!, idx, { caption: e.target.value })}
                    placeholder="Podpis..."
                    className="h-5 text-[10px] px-1"
                  />
                </div>
              </Card>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => addGalleryItem(cell.id!)}
              className="w-full h-6 text-[11px]"
            >
              <Plus className="w-3 h-3 mr-1" /> Dodaj
            </Button>
            
            {/* Gallery/Carousel settings */}
            <div className="border-t pt-2 space-y-1.5">
              <Label className="text-[10px] font-medium">Ustawienia</Label>
              
              <div className="grid grid-cols-2 gap-1.5">
                {cell.type === 'gallery' && (
                  <div className="space-y-0.5">
                    <Label className="text-[10px]">Kolumny: {cell.columns || 3}</Label>
                    <Slider
                      value={[cell.columns || 3]}
                      onValueChange={([v]) => updateCell(cell.id!, { columns: v })}
                      min={1}
                      max={6}
                      step={1}
                      className="py-0.5"
                    />
                  </div>
                )}
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Odstęp: {cell.gap || 8}px</Label>
                  <Slider
                    value={[cell.gap || 8]}
                    onValueChange={([v]) => updateCell(cell.id!, { gap: v })}
                    min={0}
                    max={32}
                    step={2}
                    className="py-0.5"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Proporcje</Label>
                  <Select
                    value={cell.aspectRatio || 'auto'}
                    onValueChange={(v) => updateCell(cell.id!, { aspectRatio: v })}
                  >
                    <SelectTrigger className="h-5 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="1/1">1:1</SelectItem>
                      <SelectItem value="4/3">4:3</SelectItem>
                      <SelectItem value="16/9">16:9</SelectItem>
                      <SelectItem value="3/4">3:4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <Label className="text-[10px]">Lightbox</Label>
                  <Switch
                    checked={cell.lightbox !== false}
                    onCheckedChange={(v) => updateCell(cell.id!, { lightbox: v })}
                    className="scale-[0.6]"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Rogi: {cell.border_radius || 0}px</Label>
                  <Slider
                    value={[cell.border_radius || 0]}
                    onValueChange={([v]) => updateCell(cell.id!, { border_radius: v })}
                    min={0}
                    max={24}
                    step={2}
                    className="py-0.5"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Hover: {cell.hover_scale ? Math.round(cell.hover_scale * 100) : 100}%</Label>
                  <Slider
                    value={[cell.hover_scale ? cell.hover_scale * 100 : 100]}
                    onValueChange={([v]) => updateCell(cell.id!, { hover_scale: v / 100 })}
                    min={100}
                    max={115}
                    step={1}
                    className="py-0.5"
                  />
                </div>
              </div>
              
              <div className="space-y-0.5">
                <Label className="text-[10px]">Cień</Label>
                <Select
                  value={cell.box_shadow || 'none'}
                  onValueChange={(v) => updateCell(cell.id!, { box_shadow: v })}
                >
                  <SelectTrigger className="h-5 text-[10px]">
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

        <TabsContent value="cells" className="flex-1 overflow-hidden flex flex-col mt-1">
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
                            {/* Row 1: Icon and label/preview */}
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                              {(cell.type === 'image' || cell.type === 'video' || cell.type === 'gallery' || cell.type === 'carousel') && cell.media_url ? (
                                <img 
                                  src={cell.media_url} 
                                  alt="" 
                                  className="w-6 h-6 object-cover rounded shrink-0"
                                />
                              ) : (
                                <CellIcon className="w-3 h-3 shrink-0" />
                              )}
                              <span className="flex-1 text-xs font-medium truncate">
                                {cell.content || (cell.media_url ? getCellLabel(cell.type) : getCellLabel(cell.type))}
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
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-left block">Opis sekcji</Label>
                                  <Textarea
                                    value={cell.section_description || ''}
                                    onChange={(e) => updateCell(cell.id!, { section_description: e.target.value })}
                                    placeholder="Opis sekcji..."
                                    className="min-h-[40px] text-xs"
                                  />
                                </div>
                                
                                {/* Sub-cells management */}
                                <div className="border-t pt-2 mt-2 space-y-2">
                                  <Label className="text-xs text-left block font-semibold">Elementy w sekcji ({(cell.section_items as ContentCell[] || []).length})</Label>
                                  
                                  {/* Existing sub-cells */}
                                  {((cell.section_items as ContentCell[]) || []).length > 0 && (
                                    <div className="space-y-1 max-h-60 overflow-y-auto">
                                      {((cell.section_items as ContentCell[]) || []).map((subCell, subIdx) => {
                                        const SubCellIcon = getCellIcon(subCell.type);
                                        const isSubCellExpanded = expandedCells.includes(subCell.id!);
                                        return (
                                          <Collapsible key={subCell.id} open={isSubCellExpanded} onOpenChange={() => toggleCellExpanded(subCell.id!)}>
                                            <CollapsibleTrigger asChild>
                                              <div className="flex items-center gap-1 p-1.5 bg-muted/50 rounded text-xs cursor-pointer hover:bg-muted/70">
                                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                                  {(subCell.type === 'image' || subCell.type === 'video') && subCell.media_url ? (
                                                    <img src={subCell.media_url} alt="" className="w-5 h-5 object-cover rounded shrink-0" />
                                                  ) : (
                                                    <SubCellIcon className="w-3 h-3 shrink-0 text-muted-foreground" />
                                                  )}
                                                  <span className="truncate">{subCell.content || getCellLabel(subCell.type)}</span>
                                                </div>
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5"
                                                    onClick={(e) => { e.stopPropagation(); moveSubCell(cell.id!, subCell.id!, 'up'); }}
                                                    disabled={subIdx === 0}
                                                  >
                                                    <icons.ChevronUp className="w-3 h-3" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5"
                                                    onClick={(e) => { e.stopPropagation(); moveSubCell(cell.id!, subCell.id!, 'down'); }}
                                                    disabled={subIdx === ((cell.section_items as ContentCell[]) || []).length - 1}
                                                  >
                                                    <icons.ChevronDown className="w-3 h-3" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 text-destructive"
                                                    onClick={(e) => { e.stopPropagation(); removeSubCell(cell.id!, subCell.id!); }}
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </Button>
                                                  <ChevronDown className={`w-3 h-3 transition-transform ${isSubCellExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                              </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                              <div className="p-2 border-l-2 border-primary/30 ml-2 mt-1 space-y-2">
                                                {/* Type selector for sub-cell */}
                                                <div className="space-y-0.5">
                                                  <Label className="text-[10px]">Typ</Label>
                                                  <Select
                                                    value={subCell.type}
                                                    onValueChange={(value) => updateSubCell(cell.id!, subCell.id!, { type: value as ContentCell['type'] })}
                                                  >
                                                    <SelectTrigger className="h-6 text-[11px]">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      {SUB_CELL_TYPES.map((type) => (
                                                        <SelectItem key={type.value} value={type.value}>
                                                          <div className="flex items-center gap-1.5">
                                                            <type.icon className="w-3 h-3" />
                                                            <span className="text-xs">{type.label}</span>
                                                          </div>
                                                        </SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                
                                                {/* Content editor based on sub-cell type */}
                                                {['header', 'description', 'text', 'list_item'].includes(subCell.type) && (
                                                  <div className="space-y-0.5">
                                                    <Label className="text-[10px]">Treść</Label>
                                                    {subCell.type === 'description' || subCell.type === 'text' ? (
                                                      <Textarea
                                                        value={subCell.content}
                                                        onChange={(e) => updateSubCell(cell.id!, subCell.id!, { content: e.target.value })}
                                                        placeholder="Tekst..."
                                                        className="min-h-[50px] text-[11px]"
                                                      />
                                                    ) : (
                                                      <Input
                                                        value={subCell.content}
                                                        onChange={(e) => updateSubCell(cell.id!, subCell.id!, { content: e.target.value })}
                                                        placeholder="Tekst..."
                                                        className="h-6 text-[11px]"
                                                      />
                                                    )}
                                                  </div>
                                                )}

                                                {/* Image/Video upload */}
                                                {(subCell.type === 'image' || subCell.type === 'video') && (
                                                  <div className="space-y-1">
                                                    <Label className="text-[10px]">{subCell.type === 'image' ? 'Obraz' : 'Wideo'}</Label>
                                                    <MediaUpload
                                                      compact
                                                      currentMediaUrl={subCell.media_url || ''}
                                                      onMediaUploaded={(url) => updateSubCell(cell.id!, subCell.id!, { media_url: url })}
                                                    />
                                                    {subCell.type === 'image' && (
                                                      <div className="grid grid-cols-2 gap-1">
                                                        <div className="space-y-0.5">
                                                          <Label className="text-[10px]">Szer. (px)</Label>
                                                          <Input
                                                            type="number"
                                                            value={subCell.width || ''}
                                                            onChange={(e) => updateSubCell(cell.id!, subCell.id!, { width: e.target.value ? parseInt(e.target.value) : undefined })}
                                                            className="h-6 text-[11px]"
                                                          />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                          <Label className="text-[10px]">Wys. (px)</Label>
                                                          <Input
                                                            type="number"
                                                            value={subCell.height_px || ''}
                                                            onChange={(e) => updateSubCell(cell.id!, subCell.id!, { height_px: e.target.value ? parseInt(e.target.value) : undefined })}
                                                            className="h-6 text-[11px]"
                                                          />
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Button fields */}
                                                {subCell.type.includes('button') && (
                                                  <>
                                                    <div className="space-y-0.5">
                                                      <Label className="text-[10px]">Tekst przycisku</Label>
                                                      <Input
                                                        value={subCell.content}
                                                        onChange={(e) => updateSubCell(cell.id!, subCell.id!, { content: e.target.value })}
                                                        placeholder="Kliknij"
                                                        className="h-6 text-[11px]"
                                                      />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                      <Label className="text-[10px]">URL</Label>
                                                      <Input
                                                        value={subCell.url || ''}
                                                        onChange={(e) => updateSubCell(cell.id!, subCell.id!, { url: e.target.value })}
                                                        placeholder="https://..."
                                                        className="h-6 text-[11px]"
                                                      />
                                                    </div>
                                                  </>
                                                )}

                                                {/* Icon selector */}
                                                {subCell.type === 'icon' && (
                                                  <div className="space-y-0.5">
                                                    <Label className="text-[10px]">Ikona</Label>
                                                    <IconPicker
                                                      value={subCell.content || 'Star'}
                                                      onChange={(icon) => updateSubCell(cell.id!, subCell.id!, { content: icon })}
                                                    />
                                                  </div>
                                                )}

                                                {/* Spacer height */}
                                                {subCell.type === 'spacer' && (
                                                  <div className="space-y-0.5">
                                                    <Label className="text-[10px]">Wysokość (px)</Label>
                                                    <Input
                                                      type="number"
                                                      value={subCell.height || 24}
                                                      onChange={(e) => updateSubCell(cell.id!, subCell.id!, { height: parseInt(e.target.value) || 24 })}
                                                      className="h-6 text-[11px]"
                                                    />
                                                  </div>
                                                )}

                                                {/* Alignment */}
                                                <div className="space-y-0.5">
                                                  <Label className="text-[10px]">Wyrównanie</Label>
                                                  <Select
                                                    value={subCell.alignment || 'left'}
                                                    onValueChange={(value) => updateSubCell(cell.id!, subCell.id!, { alignment: value as ContentCell['alignment'] })}
                                                  >
                                                    <SelectTrigger className="h-6 text-[11px]">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="left">Do lewej</SelectItem>
                                                      <SelectItem value="center">Środek</SelectItem>
                                                      <SelectItem value="right">Do prawej</SelectItem>
                                                      <SelectItem value="full">Pełna szer.</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              </div>
                                            </CollapsibleContent>
                                          </Collapsible>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* Add sub-cell dropdown */}
                                  <Select
                                    value=""
                                    onValueChange={(value) => addSubCell(cell.id!, value as ContentCell['type'])}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <Plus className="w-3 h-3 mr-1" />
                                      <span>Dodaj element</span>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SUB_CELL_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          <div className="flex items-center gap-2">
                                            <type.icon className="w-3 h-3" />
                                            <span className="text-xs">{type.label}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
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

        <TabsContent value="main" className="flex-1 overflow-y-auto mt-1">
          <div className="space-y-2 p-1.5">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-left w-full block">Tytuł</Label>
              <Input
                value={formData.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Tytuł..."
                className="h-6 text-[11px]"
              />
            </div>

            <div className="space-y-0.5">
              <Label className="text-[10px] text-left w-full block">Opis</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Opis..."
                className="min-h-[50px] text-[11px]"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Aktywny</Label>
              <Switch
                checked={formData.is_active !== false}
                onCheckedChange={(checked) => updateField('is_active', checked)}
                className="scale-75"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="number" className="flex-1 overflow-y-auto mt-1">
          <div className="space-y-2 p-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Pokaż numerację</Label>
              <Switch
                checked={formData.show_number !== false}
                onCheckedChange={(checked) => updateField('show_number', checked)}
                className="scale-75"
              />
            </div>

            {formData.show_number !== false && (
              <>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-left w-full block">Typ</Label>
                  <Select
                    value={formData.number_type || 'auto'}
                    onValueChange={(value) => updateField('number_type', value as CMSItem['number_type'])}
                  >
                    <SelectTrigger className="h-6 text-[11px]">
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
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-left w-full block">Własny tekst</Label>
                    <Input
                      value={formData.custom_number || ''}
                      onChange={(e) => updateField('custom_number', e.target.value)}
                      placeholder="np. A, ★, I"
                      className="h-6 text-[11px]"
                    />
                  </div>
                )}

                {formData.number_type === 'image' && (
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-left w-full block">Obraz</Label>
                    <MediaUpload
                      compact
                      currentMediaUrl={formData.custom_number_image || ''}
                      onMediaUploaded={(url) => updateField('custom_number_image', url)}
                    />
                  </div>
                )}

                {formData.number_type === 'icon' && (
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-left w-full block">Ikona</Label>
                    <IconPicker
                      value={formData.icon || 'Star'}
                      onChange={(icon) => updateField('icon', icon)}
                      trigger={
                        <Button variant="outline" className="w-full h-6 text-[11px] justify-start gap-1.5">
                          {formData.icon && React.createElement((icons as any)[formData.icon] || Star, { className: "w-3 h-3" })}
                          <span>{formData.icon || 'Wybierz'}</span>
                        </Button>
                      }
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-left w-full block">Tło</Label>
                    <Input
                      type="color"
                      value={formData.background_color || '#fbbf24'}
                      onChange={(e) => updateField('background_color', e.target.value)}
                      className="h-6 w-full"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-left w-full block">Ikona</Label>
                    <Input
                      type="color"
                      value={formData.icon_color || '#ffffff'}
                      onChange={(e) => updateField('icon_color', e.target.value)}
                      className="h-6 w-full"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-y-auto mt-1">
          <AdvancedStyleTab 
            item={formData} 
            onUpdate={(updates) => setFormData(prev => ({ ...prev, ...updates }))} 
          />
        </TabsContent>

      </Tabs>
    </div>
  );
};
