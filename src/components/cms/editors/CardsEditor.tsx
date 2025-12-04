import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CardsEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const CardsEditor: React.FC<CardsEditorProps> = ({ item, onSave, onCancel }) => {
  const cardsCell = (item.cells as any[])?.[0] || {};
  const [cards, setCards] = useState<Array<{ title: string; content: string }>>(
    cardsCell.cards || []
  );
  const [columns, setColumns] = useState(cardsCell.columns || 3);
  const [gap, setGap] = useState(cardsCell.gap || 16);
  
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<string>(JSON.stringify(item));
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Style states
  const [textColor, setTextColor] = useState(item.text_color || '');
  const [backgroundColor, setBackgroundColor] = useState(item.background_color || '');
  const [borderRadius, setBorderRadius] = useState(item.border_radius || 8);
  const [borderWidth, setBorderWidth] = useState(item.border_width || 0);
  const [borderColor, setBorderColor] = useState(item.border_color || '');
  const [borderStyle, setBorderStyle] = useState(item.border_style || 'solid');
  const [boxShadow, setBoxShadow] = useState(item.box_shadow || '');
  const [padding, setPadding] = useState(item.padding || 16);
  const [marginTop, setMarginTop] = useState(item.margin_top || 0);
  const [marginBottom, setMarginBottom] = useState(item.margin_bottom || 0);
  
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
      type: 'cards',
      cards,
      columns,
      gap,
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

  const handleAddCard = () => {
    const newCards = [...cards, { title: '', content: '' }];
    setCards(newCards);
    updateCell({ cards: newCards });
  };

  const handleRemoveCard = (index: number) => {
    const newCards = cards.filter((_, i) => i !== index);
    setCards(newCards);
    updateCell({ cards: newCards });
  };

  const handleCardChange = (index: number, field: 'title' | 'content', value: string) => {
    const newCards = [...cards];
    newCards[index] = { ...newCards[index], [field]: value };
    setCards(newCards);
    updateCell({ cards: newCards });
  };

  const handleColumnsChange = (value: number) => {
    setColumns(value);
    updateCell({ columns: value });
  };

  const handleGapChange = (value: number) => {
    setGap(value);
    updateCell({ gap: value });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja kart
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
            <TabsTrigger value="content">Karty</TabsTrigger>
            <TabsTrigger value="settings">Układ</TabsTrigger>
            <TabsTrigger value="style">Styl</TabsTrigger>
            <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="p-4 space-y-4">
            <div className="space-y-4">
              {cards.map((card, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <div>
                        <Label>Tytuł</Label>
                        <Input
                          value={card.title}
                          onChange={(e) => handleCardChange(index, 'title', e.target.value)}
                          placeholder="Tytuł karty"
                        />
                      </div>
                      <div>
                        <Label>Treść</Label>
                        <Textarea
                          value={card.content}
                          onChange={(e) => handleCardChange(index, 'content', e.target.value)}
                          placeholder="Treść karty"
                          rows={3}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemoveCard(index)}
                      variant="destructive"
                      size="icon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleAddCard} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Dodaj kartę
            </Button>
          </TabsContent>

          <TabsContent value="settings" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Liczba kolumn: {columns}</Label>
              <Slider
                value={[columns]}
                onValueChange={([v]) => handleColumnsChange(v)}
                min={1}
                max={4}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Odstęp między kartami: {gap}px</Label>
              <Slider
                value={[gap]}
                onValueChange={([v]) => handleGapChange(v)}
                min={0}
                max={48}
                step={4}
              />
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
              <Label>Kolor tła kart</Label>
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

            <div className="space-y-2">
              <Label>Grubość ramki: {borderWidth}px</Label>
              <Slider
                value={[borderWidth]}
                onValueChange={([v]) => {
                  setBorderWidth(v);
                  updateItemStyle({ border_width: v });
                }}
                min={0}
                max={8}
                step={1}
              />
            </div>

            {borderWidth > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Kolor ramki</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={borderColor || '#000000'}
                      onChange={(e) => {
                        setBorderColor(e.target.value);
                        updateItemStyle({ border_color: e.target.value });
                      }}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={borderColor}
                      onChange={(e) => {
                        setBorderColor(e.target.value);
                        updateItemStyle({ border_color: e.target.value });
                      }}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Styl ramki</Label>
                  <Select
                    value={borderStyle}
                    onValueChange={(v) => {
                      setBorderStyle(v);
                      updateItemStyle({ border_style: v });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Ciągła</SelectItem>
                      <SelectItem value="dashed">Kreskowana</SelectItem>
                      <SelectItem value="dotted">Kropkowana</SelectItem>
                      <SelectItem value="double">Podwójna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Cień</Label>
              <Select
                value={boxShadow || 'none'}
                onValueChange={(v) => {
                  setBoxShadow(v);
                  updateItemStyle({ box_shadow: v });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak</SelectItem>
                  <SelectItem value="0 1px 2px 0 rgba(0,0,0,0.05)">Bardzo mały</SelectItem>
                  <SelectItem value="0 1px 3px 0 rgba(0,0,0,0.1)">Mały</SelectItem>
                  <SelectItem value="0 4px 6px -1px rgba(0,0,0,0.1)">Średni</SelectItem>
                  <SelectItem value="0 10px 15px -3px rgba(0,0,0,0.1)">Duży</SelectItem>
                  <SelectItem value="0 20px 25px -5px rgba(0,0,0,0.1)">Bardzo duży</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Padding kart: {padding}px</Label>
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
                max={110}
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
