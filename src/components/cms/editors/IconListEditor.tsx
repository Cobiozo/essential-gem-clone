import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconPicker } from '@/components/cms/IconPicker';

interface IconListEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const IconListEditor: React.FC<IconListEditorProps> = ({ item, onSave, onCancel }) => {
  const iconListCell = (item.cells as any[])?.[0] || {};
  const [items, setItems] = useState<Array<{ icon: string; text: string }>>(
    iconListCell.items || []
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

  const updateCell = (updates: any) => {
    const updatedCells = [{
      type: 'icon-list',
      items,
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

  const handleAddItem = () => {
    const newItems = [...items, { icon: 'Circle', text: '' }];
    setItems(newItems);
    updateCell({ items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    updateCell({ items: newItems });
  };

  const handleItemChange = (index: number, field: 'icon' | 'text', value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    updateCell({ items: newItems });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja listy z ikonami
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
          {items.map((listItem, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>Ikona</Label>
                    <IconPicker
                      value={listItem.icon}
                      onChange={(icon) => handleItemChange(index, 'icon', icon)}
                    />
                  </div>
                  <div>
                    <Label>Tekst</Label>
                    <Input
                      value={listItem.text}
                      onChange={(e) => handleItemChange(index, 'text', e.target.value)}
                      placeholder="Tekst pozycji"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => handleRemoveItem(index)}
                  variant="destructive"
                  size="icon"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button onClick={handleAddItem} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Dodaj pozycję
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};
