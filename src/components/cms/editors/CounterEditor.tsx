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

interface CounterEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const CounterEditor: React.FC<CounterEditorProps> = ({ item, onSave, onCancel }) => {
  const counterCell = (item.cells as any[])?.[0] || {};
  const [start, setStart] = useState(counterCell.start || 0);
  const [end, setEnd] = useState(counterCell.end || 100);
  const [duration, setDuration] = useState(counterCell.duration || 2000);
  const [prefix, setPrefix] = useState(counterCell.prefix || '');
  const [suffix, setSuffix] = useState(counterCell.suffix || '');
  
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<string>(JSON.stringify(item));
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Style states
  const [textColor, setTextColor] = useState(item.text_color || '');
  const [backgroundColor, setBackgroundColor] = useState(item.background_color || '');
  const [fontSize, setFontSize] = useState(item.font_size || 48);
  const [fontWeight, setFontWeight] = useState(item.font_weight || 700);
  const [textAlign, setTextAlign] = useState(item.text_align || 'center');
  const [padding, setPadding] = useState(item.padding || 0);
  const [marginTop, setMarginTop] = useState(item.margin_top || 0);
  const [marginBottom, setMarginBottom] = useState(item.margin_bottom || 0);
  const [borderRadius, setBorderRadius] = useState(item.border_radius || 0);
  
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
      type: 'counter',
      start,
      end,
      duration,
      prefix,
      suffix,
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

  const handleStartChange = (newStart: number) => {
    setStart(newStart);
    updateCell({ start: newStart });
  };

  const handleEndChange = (newEnd: number) => {
    setEnd(newEnd);
    updateCell({ end: newEnd });
  };

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    updateCell({ duration: newDuration });
  };

  const handlePrefixChange = (newPrefix: string) => {
    setPrefix(newPrefix);
    updateCell({ prefix: newPrefix });
  };

  const handleSuffixChange = (newSuffix: string) => {
    setSuffix(newSuffix);
    updateCell({ suffix: newSuffix });
  };

  const handleSave = () => {
    onSave(editedItem);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja licznika
          {isSaving && <span className="text-xs text-muted-foreground">(zapisywanie...)</span>}
          {justSaved && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        </h3>
        <div className="flex gap-2">
          <Button onClick={handleSave} size="sm">
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
              <Label>Wartość początkowa</Label>
              <Input
                type="number"
                value={start}
                onChange={(e) => handleStartChange(Number(e.target.value))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Wartość końcowa</Label>
              <Input
                type="number"
                value={end}
                onChange={(e) => handleEndChange(Number(e.target.value))}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label>Prefiks (przed liczbą)</Label>
              <Input
                value={prefix}
                onChange={(e) => handlePrefixChange(e.target.value)}
                placeholder="$ lub €"
              />
              <p className="text-xs text-muted-foreground">Np. "$", "€", "+"</p>
            </div>

            <div className="space-y-2">
              <Label>Sufiks (po liczbie)</Label>
              <Input
                value={suffix}
                onChange={(e) => handleSuffixChange(e.target.value)}
                placeholder="+ lub %"
              />
              <p className="text-xs text-muted-foreground">Np. "+", "%", "K", "M"</p>
            </div>

            <div className="space-y-2">
              <Label>Czas trwania animacji: {duration}ms</Label>
              <Slider
                value={[duration]}
                onValueChange={([v]) => handleDurationChange(v)}
                min={500}
                max={5000}
                step={100}
              />
              <p className="text-xs text-muted-foreground">
                {(duration / 1000).toFixed(1)} sekund
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Podgląd:</p>
              <div className="text-4xl font-bold text-center">
                {prefix}{end}{suffix}
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Licznik animuje się od {prefix}{start}{suffix} do {prefix}{end}{suffix}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="style" className="p-4 space-y-4">
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
              <Label>Rozmiar czcionki: {fontSize}px</Label>
              <Slider
                value={[fontSize]}
                onValueChange={([v]) => {
                  setFontSize(v);
                  updateItemStyle({ font_size: v });
                }}
                min={16}
                max={120}
                step={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Grubość czcionki</Label>
              <Select
                value={String(fontWeight)}
                onValueChange={(v) => {
                  setFontWeight(Number(v));
                  updateItemStyle({ font_weight: Number(v) });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Lekka (300)</SelectItem>
                  <SelectItem value="400">Normalna (400)</SelectItem>
                  <SelectItem value="500">Średnia (500)</SelectItem>
                  <SelectItem value="600">Półgruba (600)</SelectItem>
                  <SelectItem value="700">Gruba (700)</SelectItem>
                  <SelectItem value="800">Bardzo gruba (800)</SelectItem>
                </SelectContent>
              </Select>
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

            <div className="space-y-2">
              <Label>Zaokrąglenie rogów: {borderRadius}px</Label>
              <Slider
                value={[borderRadius]}
                onValueChange={([v]) => {
                  setBorderRadius(v);
                  updateItemStyle({ border_radius: v });
                }}
                min={0}
                max={32}
                step={2}
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
