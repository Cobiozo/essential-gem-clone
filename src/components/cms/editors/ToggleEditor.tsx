import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ToggleEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const ToggleEditor: React.FC<ToggleEditorProps> = ({ item, onSave, onCancel }) => {
  const toggleCell = (item.cells as any[])?.[0] || {};
  const [title, setTitle] = useState(toggleCell.title || '');
  const [content, setContent] = useState(toggleCell.content || '');
  
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
      type: 'toggle',
      title,
      content,
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

  const handleContentChange = (value: string) => {
    setContent(value);
    updateCell({ content: value });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja przełącznika
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
            <Label>Tytuł</Label>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Tytuł przełącznika (kliknięcie rozwinie treść)"
            />
          </div>

          <div>
            <Label>Treść</Label>
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Treść która zostanie ukryta/pokazana"
              rows={8}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
