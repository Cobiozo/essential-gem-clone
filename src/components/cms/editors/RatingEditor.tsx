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
    
    setEditedItem({
      ...editedItem,
      cells: updatedCells
    });
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
                  <span key={i} className={i < value ? "text-yellow-500" : "text-gray-300"}>
                    ★
                  </span>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
