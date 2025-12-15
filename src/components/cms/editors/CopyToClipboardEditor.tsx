import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CMSItem } from '@/types/cms';
import { X, CheckCircle2, Clipboard } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconPicker } from '../IconPicker';
import { AdvancedStyleTab } from './AdvancedStyleTab';
import { RichTextEditor } from '@/components/RichTextEditor';
import * as icons from 'lucide-react';

interface CopyToClipboardEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const CopyToClipboardEditor: React.FC<CopyToClipboardEditorProps> = ({ item, onSave, onCancel }) => {
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

  // Get clipboard content from cells or description
  const getClipboardContent = () => {
    const cells = editedItem.cells as any[];
    if (cells && cells.length > 0 && cells[0]?.clipboard_content) {
      return cells[0].clipboard_content;
    }
    return editedItem.description || '';
  };

  const setClipboardContent = (content: string) => {
    const existingCells = (editedItem.cells || [{ type: 'copy-btn', content: '' }]) as any[];
    const newCells = [...existingCells];
    newCells[0] = { 
      ...(newCells[0] || {}), 
      clipboard_content: content,
      type: 'copy-btn',
    };
    setEditedItem({ ...editedItem, description: content, cells: newCells });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Clipboard className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Kopiuj do schowka</h3>
          {isSaving && <span className="text-xs text-muted-foreground">Zapisywanie...</span>}
          {justSaved && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3 h-3" />
              <span>Zapisano</span>
            </div>
          )}
        </div>
        <Button onClick={onCancel} variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              {/* Button text */}
              <div className="space-y-2">
                <Label>Tekst przycisku</Label>
                <Input
                  value={editedItem.title || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                  placeholder="Kopiuj do schowka"
                />
              </div>

              {/* Icon picker */}
              <div className="space-y-2">
                <Label>Ikona</Label>
                <IconPicker
                  value={editedItem.icon}
                  onChange={(iconName) => setEditedItem({ ...editedItem, icon: iconName })}
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      {editedItem.icon ? (
                        <>
                          {(() => {
                            const IconComp = (icons as any)[editedItem.icon];
                            return IconComp ? <IconComp className="w-4 h-4 mr-2" /> : null;
                          })()}
                          <span>{editedItem.icon}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Wybierz ikonę...</span>
                      )}
                    </Button>
                  }
                />
              </div>

              {/* Content to copy - hidden from button UI but editable here */}
              <div className="space-y-2">
                <Label>Treść do skopiowania</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Ta treść zostanie skopiowana do schowka użytkownika po kliknięciu przycisku. Nie jest widoczna na przycisku.
                </p>
                <div className="border rounded-md">
                  <RichTextEditor
                    value={getClipboardContent()}
                    onChange={setClipboardContent}
                    placeholder="Wpisz treść do skopiowania..."
                    compact
                  />
                </div>
              </div>

              {/* Preview of what will be copied */}
              <div className="space-y-2">
                <Label>Podgląd treści do skopiowania</Label>
                <div 
                  className="p-3 bg-muted rounded-md text-sm max-h-32 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: getClipboardContent() || '<em class="text-muted-foreground">Brak treści</em>' }}
                />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full">
            <div className="pb-4">
              <AdvancedStyleTab 
                item={editedItem} 
                onUpdate={(updates) => setEditedItem({ ...editedItem, ...updates })} 
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
