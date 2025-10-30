import React, { useState, useEffect, useRef } from 'react';
import { CMSItem } from '@/types/cms';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { Loader2, Save, X } from 'lucide-react';

interface SidebarEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const SidebarEditor: React.FC<SidebarEditorProps> = ({
  item,
  onSave,
  onCancel
}) => {
  const [title, setTitle] = useState(item.title || '');
  const [content, setContent] = useState(item.description || '');
  const [position, setPosition] = useState(item.url || 'left');
  const [width, setWidth] = useState(item.cells?.[0]?.content || '300');
  const [editedItem, setEditedItem] = useState<CMSItem>(item);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  
  const debouncedItem = useDebounce(editedItem, 1000);
  const prevItemRef = useRef<CMSItem>(item);

  useEffect(() => {
    if (debouncedItem && debouncedItem !== prevItemRef.current) {
      setIsSaving(true);
      onSave(debouncedItem);
      prevItemRef.current = debouncedItem;
      
      setTimeout(() => {
        setIsSaving(false);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }, 500);
    }
  }, [debouncedItem, onSave]);

  const updateItem = (updates: Partial<CMSItem>) => {
    setEditedItem(prev => ({ ...prev, ...updates }));
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    updateItem({ title: value });
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    updateItem({ description: value });
  };

  const handlePositionChange = (value: string) => {
    setPosition(value);
    updateItem({ url: value });
  };

  const handleWidthChange = (value: string) => {
    setWidth(value);
    updateItem({
      cells: [{ 
        id: item.cells?.[0]?.id,
        type: 'description',
        content: value,
        position: 0,
        is_active: true
      }]
    });
  };

  const handleSaveNow = () => {
    onSave(editedItem);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Panel boczny</h3>
          <div className="flex items-center gap-2">
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Zapisywanie...
              </div>
            )}
            {justSaved && (
              <div className="text-sm text-green-600">
                ✓ Zapisano
              </div>
            )}
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleSaveNow}>
              <Save className="w-4 h-4 mr-2" />
              Zapisz
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł panelu</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Tytuł panelu bocznego..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Treść</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Treść panelu bocznego..."
              rows={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Pozycja</Label>
            <Select value={position} onValueChange={handlePositionChange}>
              <SelectTrigger id="position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Lewa strona</SelectItem>
                <SelectItem value="right">Prawa strona</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="width">Szerokość (px)</Label>
            <Input
              id="width"
              value={width}
              onChange={(e) => handleWidthChange(e.target.value)}
              placeholder="300"
              type="number"
              min="100"
              max="800"
            />
            <p className="text-xs text-muted-foreground">
              Szerokość panelu w pikselach (100-800)
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};