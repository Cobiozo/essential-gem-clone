import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface HtmlEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const HtmlEditor: React.FC<HtmlEditorProps> = ({ item, onSave, onCancel }) => {
  const htmlCell = (item.cells as any[])?.[0] || {};
  const [html, setHtml] = useState(htmlCell.content || '');
  
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
      type: 'html',
      content: html,
      position: 0,
      is_active: true,
      ...updates
    }] as any;
    
    setEditedItem({
      ...editedItem,
      cells: updatedCells
    });
  };

  const handleHtmlChange = (value: string) => {
    setHtml(value);
    updateCell({ content: value });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Edycja HTML
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
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Uwaga! Wklejanie niesprawdzonego kodu HTML może stanowić zagrożenie bezpieczeństwa. 
              Upewnij się, że rozumiesz kod który wklejasz.
            </AlertDescription>
          </Alert>

          <div>
            <Label>Kod HTML</Label>
            <Textarea
              value={html}
              onChange={(e) => handleHtmlChange(e.target.value)}
              placeholder="<div>Twój kod HTML...</div>"
              rows={20}
              className="font-mono text-sm"
            />
          </div>

          {html && (
            <div>
              <Label>Podgląd</Label>
              <div 
                className="border rounded-lg p-4 bg-muted/30"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
