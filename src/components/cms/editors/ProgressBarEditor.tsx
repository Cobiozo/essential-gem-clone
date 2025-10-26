import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProgressBarEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const ProgressBarEditor: React.FC<ProgressBarEditorProps> = ({ item, onSave, onCancel }) => {
  const progressCell = (item.cells as any[])?.[0] || {};
  const [value, setValue] = useState(progressCell.value || 50);
  const [max, setMax] = useState(progressCell.max || 100);
  const [label, setLabel] = useState(progressCell.label || '');
  const [showValue, setShowValue] = useState(progressCell.showValue !== false);
  
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
      type: 'progress',
      value,
      max,
      label,
      showValue,
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

  const handleShowValueChange = (checked: boolean) => {
    setShowValue(checked);
    updateCell({ showValue: checked });
  };

  const handleSave = () => {
    onSave(editedItem);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja paska postępu
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
              <Label>Etykieta</Label>
              <Input
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Postęp projektu"
              />
            </div>

            <div className="space-y-2">
              <Label>Wartość: {value}</Label>
              <Slider
                value={[value]}
                onValueChange={([v]) => handleValueChange(v)}
                min={0}
                max={max}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Maksymalna wartość</Label>
              <Input
                type="number"
                value={max}
                onChange={(e) => handleMaxChange(Number(e.target.value))}
                min={1}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-value"
                checked={showValue}
                onCheckedChange={handleShowValueChange}
              />
              <Label htmlFor="show-value">Pokazuj wartość procentową</Label>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Podgląd:</p>
              <div className="space-y-2">
                {label && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">{label}</span>
                    {showValue && <span className="text-muted-foreground">{Math.round((value / max) * 100)}%</span>}
                  </div>
                )}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className="h-full w-full flex-1 bg-primary transition-all"
                    style={{ transform: `translateX(-${100 - (value / max) * 100}%)` }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Pasek postępu wizualizuje postęp zadania lub procesu.
            </p>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
