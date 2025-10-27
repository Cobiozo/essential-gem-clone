import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconPicker } from '@/components/cms/IconPicker';
import { Input } from '@/components/ui/input';

interface IconFieldEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const IconFieldEditor: React.FC<IconFieldEditorProps> = ({ item, onSave, onCancel }) => {
  const iconCell = (item.cells as any[])?.[0] || {};
  const [icon, setIcon] = useState(iconCell.icon || 'Circle');
  const [size, setSize] = useState(iconCell.size || 48);
  const [color, setColor] = useState(iconCell.color || '#000000');
  
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
      type: 'icon-field',
      icon,
      size,
      color,
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

  const handleIconChange = (value: string) => {
    setIcon(value);
    updateCell({ icon: value });
  };

  const handleSizeChange = (value: number) => {
    setSize(value);
    updateCell({ size: value });
  };

  const handleColorChange = (value: string) => {
    setColor(value);
    updateCell({ color: value });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja ikony
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
        <div className="p-4 space-y-4">
          <div>
            <Label>Wybierz ikonę</Label>
            <IconPicker value={icon} onChange={handleIconChange} />
          </div>

          <div>
            <Label>Rozmiar: {size}px</Label>
            <Slider
              value={[size]}
              onValueChange={([v]) => handleSizeChange(v)}
              min={16}
              max={128}
              step={4}
            />
          </div>

          <div>
            <Label>Kolor</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="#000000"
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
