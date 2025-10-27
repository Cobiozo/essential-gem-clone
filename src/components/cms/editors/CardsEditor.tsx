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

  const updateCell = (updates: any) => {
    const updatedCells = [{
      type: 'cards',
      cards,
      columns,
      position: 0,
      is_active: true,
      content: '',
      ...updates
    }] as any;
    
    setEditedItem({
      ...editedItem,
      cells: updatedCells
    });
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
            <TabsTrigger value="settings">Ustawienia</TabsTrigger>
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
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
