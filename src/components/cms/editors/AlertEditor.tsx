import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AlertEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const AlertEditor: React.FC<AlertEditorProps> = ({ item, onSave, onCancel }) => {
  const alertCell = (item.cells as any[])?.[0] || {};
  const [content, setContent] = useState(alertCell.content || '');
  const [title, setTitle] = useState(alertCell.title || '');
  const [variant, setVariant] = useState<'default' | 'info' | 'success' | 'warning' | 'destructive'>(
    alertCell.variant || 'default'
  );
  
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
      type: 'alert',
      content,
      title,
      variant,
      position: 0,
      is_active: true,
      ...updates
    }] as any;
    
    setEditedItem({
      ...editedItem,
      cells: updatedCells
    });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    updateCell({ content: newContent });
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    updateCell({ title: newTitle });
  };

  const handleVariantChange = (newVariant: any) => {
    setVariant(newVariant);
    updateCell({ variant: newVariant });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja ostrzeżenia
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
            <TabsTrigger value="content">Treść</TabsTrigger>
            <TabsTrigger value="style">Styl</TabsTrigger>
            <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Typ ostrzeżenia</Label>
              <Select value={variant} onValueChange={handleVariantChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Domyślne</SelectItem>
                  <SelectItem value="info">Informacja</SelectItem>
                  <SelectItem value="success">Sukces</SelectItem>
                  <SelectItem value="warning">Ostrzeżenie</SelectItem>
                  <SelectItem value="destructive">Błąd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tytuł (opcjonalny)</Label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Uwaga!"
              />
            </div>

            <div className="space-y-2">
              <Label>Treść</Label>
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="To jest ważna informacja..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="style" className="p-4 space-y-6">
            {/* Border Radius */}
            <div className="space-y-2">
              <Label>Zaokrąglenie rogów (px)</Label>
              <Slider
                value={[editedItem.border_radius || 8]}
                onValueChange={([value]) => handleFieldChange('border_radius', value)}
                min={0}
                max={24}
                step={2}
              />
              <span className="text-sm text-muted-foreground">{editedItem.border_radius || 8}px</span>
            </div>

            {/* Border */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Obramowanie</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>Szerokość</Label>
                  <Input
                    type="number"
                    value={editedItem.border_width || 1}
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
              <h4 className="font-medium text-sm">Odstępy</h4>
              <div className="space-y-2">
                <Label>Padding (px)</Label>
                <Slider
                  value={[editedItem.padding || 16]}
                  onValueChange={([value]) => handleFieldChange('padding', value)}
                  min={8}
                  max={48}
                  step={4}
                />
                <span className="text-sm text-muted-foreground">{editedItem.padding || 16}px</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Margines górny (px)</Label>
                  <Slider
                    value={[editedItem.margin_top || 0]}
                    onValueChange={([value]) => handleFieldChange('margin_top', value)}
                    min={0}
                    max={64}
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
                    max={64}
                    step={4}
                  />
                  <span className="text-sm text-muted-foreground">{editedItem.margin_bottom || 0}px</span>
                </div>
              </div>
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
          </TabsContent>

          <TabsContent value="advanced" className="p-4 space-y-6">
            {/* Hover Effects */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Efekty przy najechaniu</h4>
              <div className="space-y-2">
                <Label>Skalowanie przy hover</Label>
                <Slider
                  value={[editedItem.hover_scale ? editedItem.hover_scale * 100 : 100]}
                  onValueChange={([value]) => handleFieldChange('hover_scale', value / 100)}
                  min={100}
                  max={105}
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
                placeholder="np. animate-pulse border-l-4"
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
