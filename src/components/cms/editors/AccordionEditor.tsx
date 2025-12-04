import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { CMSItem } from '@/types/cms';
import { Save, X, Plus, Trash2, GripVertical } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

interface AccordionEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

interface AccordionItem {
  title: string;
  content: string;
}

export const AccordionEditor: React.FC<AccordionEditorProps> = ({ item, onSave, onCancel }) => {
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);

  useEffect(() => {
    if (debouncedItem && debouncedItem !== item) {
      onSave(debouncedItem);
    }
  }, [debouncedItem]);
  
  const getAccordionItems = (): AccordionItem[] => {
    if (editedItem.cells && editedItem.cells.length > 0) {
      const items: AccordionItem[] = [];
      for (let i = 0; i < editedItem.cells.length; i++) {
        const cell = editedItem.cells[i];
        if (cell.type === 'section' && cell.section_title) {
          items.push({
            title: cell.section_title,
            content: cell.section_description || ''
          });
        }
      }
      return items.length > 0 ? items : [{ title: '', content: '' }];
    }
    return [{ title: '', content: '' }];
  };

  const [accordionItems, setAccordionItems] = useState<AccordionItem[]>(getAccordionItems());

  const handleFieldChange = (field: keyof CMSItem, value: any) => {
    setEditedItem({
      ...editedItem,
      [field]: value,
    });
  };

  const handleSave = () => {
    const updatedItem = {
      ...editedItem,
      cells: accordionItems.map((accordionItem, index) => ({
        type: 'section' as const,
        content: '',
        position: index,
        is_active: true,
        section_title: accordionItem.title,
        section_description: accordionItem.content
      }))
    };
    onSave(updatedItem);
  };

  const addAccordionItem = () => {
    setAccordionItems([...accordionItems, { title: '', content: '' }]);
  };

  const removeAccordionItem = (index: number) => {
    if (accordionItems.length > 1) {
      setAccordionItems(accordionItems.filter((_, i) => i !== index));
    }
  };

  const updateAccordionItem = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...accordionItems];
    updated[index][field] = value;
    setAccordionItems(updated);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Edytuj Akordeon</h3>
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
          <TabsTrigger value="content">Elementy</TabsTrigger>
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
          <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              {accordionItems.map((accordionItem, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-4">
                      <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-move" />
                      <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                          <Label>Tytuł elementu {index + 1}</Label>
                          <Input
                            value={accordionItem.title}
                            onChange={(e) => updateAccordionItem(index, 'title', e.target.value)}
                            placeholder="np. PRZECHOWYWANIE I DAWKOWANIE"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Treść</Label>
                          <Textarea
                            value={accordionItem.content}
                            onChange={(e) => updateAccordionItem(index, 'content', e.target.value)}
                            placeholder="Treść rozwijalnego elementu..."
                            rows={4}
                          />
                        </div>
                      </div>
                      {accordionItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAccordionItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button onClick={addAccordionItem} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Dodaj element
            </Button>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Nagłówek sekcji (opcjonalnie)</Label>
                <Input
                  value={editedItem.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="np. Witamy w Pure Life"
                />
              </div>
              <div className="space-y-2">
                <Label>Opis sekcji (opcjonalnie)</Label>
                <Textarea
                  value={editedItem.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Dodatkowy tekst nad akordenem..."
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-6 pb-4">
              {/* Colors */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Kolory</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kolor tła nagłówka</Label>
                    <Input
                      type="color"
                      value={editedItem.background_color || '#ffffff'}
                      onChange={(e) => handleFieldChange('background_color', e.target.value)}
                      className="h-10 w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kolor tekstu</Label>
                    <Input
                      type="color"
                      value={editedItem.text_color || '#000000'}
                      onChange={(e) => handleFieldChange('text_color', e.target.value)}
                      className="h-10 w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Border */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Obramowanie</h4>
                <div className="space-y-2">
                  <Label>Zaokrąglenie rogów (px)</Label>
                  <Slider
                    value={[editedItem.border_radius || 0]}
                    onValueChange={([value]) => handleFieldChange('border_radius', value)}
                    min={0}
                    max={24}
                    step={2}
                  />
                  <span className="text-sm text-muted-foreground">{editedItem.border_radius || 0}px</span>
                </div>
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
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="advanced" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-6 pb-4">
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
                    min={50}
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
                  placeholder="np. shadow-lg divide-y"
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
