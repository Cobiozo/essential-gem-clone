import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RatingEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const RatingEditor: React.FC<RatingEditorProps> = ({ item, onSave, onCancel }) => {
  const ratingCell = (item.cells as any[])?.[0] || {};
  const [value, setValue] = useState(ratingCell.value || 5);
  const [max, setMax] = useState(ratingCell.max || 5);
  const [label, setLabel] = useState(ratingCell.label || '');
  
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<string>(JSON.stringify(item));
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Style states
  const [textColor, setTextColor] = useState(item.text_color || '');
  const [backgroundColor, setBackgroundColor] = useState(item.background_color || '');
  const [iconSize, setIconSize] = useState(item.icon_size || 24);
  const [iconColor, setIconColor] = useState(item.icon_color || '#facc15');
  const [padding, setPadding] = useState(item.padding || 0);
  const [marginTop, setMarginTop] = useState(item.margin_top || 0);
  const [marginBottom, setMarginBottom] = useState(item.margin_bottom || 0);
  const [textAlign, setTextAlign] = useState(item.text_align || 'left');
  
  // Advanced states
  const [hoverScale, setHoverScale] = useState(item.hover_scale || 1);
  const [hoverOpacity, setHoverOpacity] = useState(item.hover_opacity || 100);
  const [styleClass, setStyleClass] = useState(item.style_class || '');

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

  const updateCell = (updates: any) => {
    const updatedCells = [{
      type: 'rating',
      value,
      max,
      label,
      position: 0,
      is_active: true,
      content: '',
      ...updates
    }] as any;
    
    setEditedItem(prev => ({
      ...prev,
      cells: updatedCells
    }));
  };

  const updateItemStyle = (updates: Partial<CMSItem>) => {
    setEditedItem(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleValueChange = (newValue: number) => {
    setValue(newValue);
    updateCell({ value: newValue });
  };

  const handleMaxChange = (newMax: number) => {
    setMax(newMax);
    updateCell({ max: newMax });
  };

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    updateCell({ label: newLabel });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja oceny
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
              <Label>Etykieta</Label>
              <Input
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Ocena produktu"
              />
            </div>

            <div className="space-y-2">
              <Label>Wartość: {value}</Label>
              <Slider
                value={[value]}
                onValueChange={([v]) => handleValueChange(v)}
                min={0}
                max={max}
                step={0.5}
              />
            </div>

            <div className="space-y-2">
              <Label>Maksymalna wartość</Label>
              <Input
                type="number"
                value={max}
                onChange={(e) => handleMaxChange(Number(e.target.value))}
                min={1}
                max={10}
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Podgląd:</p>
              {label && <div className="text-sm font-medium mb-2">{label}</div>}
              <div className="flex gap-1">
                {Array.from({ length: max }).map((_, i) => (
                  <span 
                    key={i} 
                    className={i < value ? "" : "text-muted"}
                    style={{ 
                      color: i < value ? (iconColor || '#facc15') : undefined,
                      fontSize: `${iconSize}px`
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="style" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Kolor gwiazdek</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={iconColor || '#facc15'}
                  onChange={(e) => {
                    setIconColor(e.target.value);
                    updateItemStyle({ icon_color: e.target.value });
                  }}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={iconColor}
                  onChange={(e) => {
                    setIconColor(e.target.value);
                    updateItemStyle({ icon_color: e.target.value });
                  }}
                  placeholder="#facc15"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rozmiar gwiazdek: {iconSize}px</Label>
              <Slider
                value={[iconSize]}
                onValueChange={([v]) => {
                  setIconSize(v);
                  updateItemStyle({ icon_size: v });
                }}
                min={16}
                max={64}
                step={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Kolor tekstu</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={textColor || '#000000'}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    updateItemStyle({ text_color: e.target.value });
                  }}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    updateItemStyle({ text_color: e.target.value });
                  }}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kolor tła</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={backgroundColor || '#ffffff'}
                  onChange={(e) => {
                    setBackgroundColor(e.target.value);
                    updateItemStyle({ background_color: e.target.value });
                  }}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => {
                    setBackgroundColor(e.target.value);
                    updateItemStyle({ background_color: e.target.value });
                  }}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Wyrównanie</Label>
              <Select
                value={textAlign}
                onValueChange={(v) => {
                  setTextAlign(v);
                  updateItemStyle({ text_align: v });
                }}
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

            <div className="space-y-2">
              <Label>Padding: {padding}px</Label>
              <Slider
                value={[padding]}
                onValueChange={([v]) => {
                  setPadding(v);
                  updateItemStyle({ padding: v });
                }}
                min={0}
                max={60}
                step={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Margines górny: {marginTop}px</Label>
              <Slider
                value={[marginTop]}
                onValueChange={([v]) => {
                  setMarginTop(v);
                  updateItemStyle({ margin_top: v });
                }}
                min={0}
                max={100}
                step={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Margines dolny: {marginBottom}px</Label>
              <Slider
                value={[marginBottom]}
                onValueChange={([v]) => {
                  setMarginBottom(v);
                  updateItemStyle({ margin_bottom: v });
                }}
                min={0}
                max={100}
                step={4}
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Skala przy najechaniu: {hoverScale}x</Label>
              <Slider
                value={[hoverScale * 100]}
                onValueChange={([v]) => {
                  const scale = v / 100;
                  setHoverScale(scale);
                  updateItemStyle({ hover_scale: scale });
                }}
                min={100}
                max={120}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Przezroczystość przy najechaniu: {hoverOpacity}%</Label>
              <Slider
                value={[hoverOpacity]}
                onValueChange={([v]) => {
                  setHoverOpacity(v);
                  updateItemStyle({ hover_opacity: v });
                }}
                min={50}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Własna klasa CSS</Label>
              <Input
                value={styleClass}
                onChange={(e) => {
                  setStyleClass(e.target.value);
                  updateItemStyle({ style_class: e.target.value });
                }}
                placeholder="my-custom-class"
              />
              <p className="text-xs text-muted-foreground">
                Dodatkowe klasy CSS do zastosowania
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
