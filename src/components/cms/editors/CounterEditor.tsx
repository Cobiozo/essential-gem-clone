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

  // Auto-save on debounced changes
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
    
    setEditedItem({
      ...editedItem,
      cells: updatedCells
    });
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
            <TabsTrigger value="settings">Ustawienia</TabsTrigger>
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

          <TabsContent value="settings" className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Licznik animuje się od wartości początkowej do końcowej gdy element staje się widoczny na ekranie.
            </p>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
