import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CMSItem } from '@/types/cms';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/use-debounce';
import { AdvancedStyleTab } from './AdvancedStyleTab';

interface CollapsiblePureLifeEditorProps {
  item: CMSItem;
  sectionId: string;
  onSave: (updatedItem: CMSItem) => void;
  onCancel: () => void;
}

export const CollapsiblePureLifeEditor: React.FC<CollapsiblePureLifeEditorProps> = ({
  item,
  sectionId,
  onSave,
  onCancel
}) => {
  const cells = (item.cells as any[]) || [];
  const initialCell = cells[0] || { content: '', description: '', defaultExpanded: false };

  const [title, setTitle] = useState(initialCell.content || item.title || '');
  const [description, setDescription] = useState(initialCell.description || item.description || '');
  const [defaultExpanded, setDefaultExpanded] = useState(initialCell.defaultExpanded || false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const prevValuesRef = useRef({ title, description, defaultExpanded });
  const isSavingRef = useRef(false);
  const debouncedTitle = useDebounce(title, 1500);
  const debouncedDescription = useDebounce(description, 1500);

  const handleSave = useCallback(async () => {
    if (isSavingRef.current) return;
    
    isSavingRef.current = true;
    setIsSaving(true);
    
    try {
      const updatedCells = [{
        ...initialCell,
        id: initialCell.id || 'collapsible-content',
        type: 'collapsible-pure-life',
        content: title,
        description: description,
        defaultExpanded: defaultExpanded,
        position: 0,
        is_active: true,
      }];

      await onSave({
        ...item,
        title: title,
        description: description,
        cells: updatedCells,
        section_id: sectionId,
      });

      prevValuesRef.current = { title, description, defaultExpanded };
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [title, description, defaultExpanded, item, sectionId, onSave, initialCell]);

  // Auto-save on debounced changes
  useEffect(() => {
    const currentValues = { title: debouncedTitle, description: debouncedDescription, defaultExpanded };
    const hasChanged = JSON.stringify(currentValues) !== JSON.stringify(prevValuesRef.current);
    
    if (hasChanged && !isSavingRef.current) {
      handleSave();
    }
  }, [debouncedTitle, debouncedDescription, defaultExpanded, handleSave]);

  const handleStyleUpdate = useCallback((styleUpdates: Partial<CMSItem>) => {
    // Update via onSave with debounce handled internally
    onSave({
      ...item,
      ...styleUpdates,
      section_id: sectionId,
    });
  }, [item, sectionId, onSave]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <h3 className="font-semibold text-lg">Sekcja zwijana (Pure Life)</h3>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground animate-pulse">Zapisywanie...</span>
          )}
          {justSaved && !isSaving && (
            <span className="text-xs text-green-600">Zapisano ✓</span>
          )}
        </div>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-2 shrink-0 max-w-[calc(100%-2rem)]">
          <TabsTrigger value="content">Treść</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-auto m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł sekcji (klikalny)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Wpisz tytuł sekcji..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis (opcjonalny)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Krótki opis widoczny pod tytułem..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="defaultExpanded" className="font-medium">
                    Domyślnie rozwinięta
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sekcja będzie otwarta po załadowaniu strony
                  </p>
                </div>
                <Switch
                  id="defaultExpanded"
                  checked={defaultExpanded}
                  onCheckedChange={setDefaultExpanded}
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Wskazówka:</strong> Przeciągnij elementy do tej sekcji w edytorze, 
                  aby dodać zawartość widoczną po rozwinięciu.
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-auto m-0">
          <ScrollArea className="h-full">
            <AdvancedStyleTab item={item} onUpdate={handleStyleUpdate} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
