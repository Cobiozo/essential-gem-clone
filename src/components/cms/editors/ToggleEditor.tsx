import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdvancedStyleTab } from './AdvancedStyleTab';
import { IconPicker } from '../IconPicker';

interface ToggleEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const ToggleEditor: React.FC<ToggleEditorProps> = ({ item, onSave, onCancel }) => {
  const toggleCell = (item.cells as any[])?.[0] || {};
  const [title, setTitle] = useState(toggleCell.title || '');
  const [defaultExpanded, setDefaultExpanded] = useState(toggleCell.defaultExpanded ?? false);
  const [buttonIcon, setButtonIcon] = useState(toggleCell.buttonIcon || 'ChevronDown');
  const [buttonText, setButtonText] = useState(toggleCell.buttonText || '');
  const [buttonPosition, setButtonPosition] = useState(toggleCell.buttonPosition || 'left');
  
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<string>(JSON.stringify(item));
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    const debouncedItemString = JSON.stringify(debouncedItem);
    if (debouncedItem && debouncedItemString !== prevItemRef.current && !isSavingRef.current) {
      isSavingRef.current = true;
      setIsSaving(true);
      onSave(debouncedItem);
      prevItemRef.current = debouncedItemString;
      
      setTimeout(() => {
        setIsSaving(false);
        isSavingRef.current = false;
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }, 300);
    }
  }, [debouncedItem, onSave]);

  const updateCell = (updates: any) => {
    const currentCell = (editedItem.cells as any[])?.[0] || {};
    const updatedCells = [{
      ...currentCell,
      type: 'toggle',
      title,
      defaultExpanded,
      buttonIcon,
      buttonText,
      buttonPosition,
      position: 0,
      is_active: true,
      ...updates
    }] as any;
    
    setEditedItem({
      ...editedItem,
      cells: updatedCells
    });
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    updateCell({ title: value });
  };

  const handleDefaultExpandedChange = (value: boolean) => {
    setDefaultExpanded(value);
    updateCell({ defaultExpanded: value });
  };

  const handleButtonIconChange = (value: string) => {
    setButtonIcon(value);
    updateCell({ buttonIcon: value });
  };

  const handleButtonTextChange = (value: string) => {
    setButtonText(value);
    updateCell({ buttonText: value });
  };

  const handleButtonPositionChange = (value: string) => {
    setButtonPosition(value);
    updateCell({ buttonPosition: value });
  };

  const handleStyleChange = (updates: Partial<CMSItem>) => {
    setEditedItem(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Kontener zwijany
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
          <TabsList className="w-full grid grid-cols-2 mx-0 px-4 pt-2">
            <TabsTrigger value="content">Treść</TabsTrigger>
            <TabsTrigger value="style">Styl</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="p-4 space-y-4">
            <div>
              <Label>Tekst przycisku (opcjonalny)</Label>
              <Input
                value={buttonText}
                onChange={(e) => handleButtonTextChange(e.target.value)}
                placeholder="Pokaż więcej"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Jeśli pusty, wyświetla się tylko ikona
              </p>
            </div>

            <div>
              <Label>Ikona przycisku</Label>
              <IconPicker
                value={buttonIcon}
                onChange={handleButtonIconChange}
              />
            </div>

            <div>
              <Label>Pozycja przycisku</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  variant={buttonPosition === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleButtonPositionChange('left')}
                >
                  Lewo
                </Button>
                <Button
                  variant={buttonPosition === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleButtonPositionChange('center')}
                >
                  Środek
                </Button>
                <Button
                  variant={buttonPosition === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleButtonPositionChange('right')}
                >
                  Prawo
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Domyślnie rozwinięty</Label>
              <Switch
                checked={defaultExpanded}
                onCheckedChange={handleDefaultExpandedChange}
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground text-center">
                💡 Dodawaj elementy do kontenera poprzez przeciąganie ich bezpośrednio na ten element w edytorze.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="style" className="p-4">
            <AdvancedStyleTab
              item={editedItem}
              onUpdate={handleStyleChange}
            />
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
