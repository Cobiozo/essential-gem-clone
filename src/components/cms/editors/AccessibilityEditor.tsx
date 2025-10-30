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

interface AccessibilityEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const AccessibilityEditor: React.FC<AccessibilityEditorProps> = ({
  item,
  onSave,
  onCancel
}) => {
  const [ariaLabel, setAriaLabel] = useState(item.title || '');
  const [ariaDescription, setAriaDescription] = useState(item.description || '');
  const [role, setRole] = useState(item.url || 'region');
  const [tabIndex, setTabIndex] = useState(item.cells?.[0]?.content || '0');
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

  const handleAriaLabelChange = (value: string) => {
    setAriaLabel(value);
    updateItem({ title: value });
  };

  const handleAriaDescriptionChange = (value: string) => {
    setAriaDescription(value);
    updateItem({ description: value });
  };

  const handleRoleChange = (value: string) => {
    setRole(value);
    updateItem({ url: value });
  };

  const handleTabIndexChange = (value: string) => {
    setTabIndex(value);
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
          <h3 className="font-semibold">Dostępność A11y</h3>
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
            <Label htmlFor="aria-label">Etykieta ARIA</Label>
            <Input
              id="aria-label"
              value={ariaLabel}
              onChange={(e) => handleAriaLabelChange(e.target.value)}
              placeholder="Etykieta dostępności..."
            />
            <p className="text-xs text-muted-foreground">
              Krótka etykieta dla czytników ekranu
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aria-description">Opis ARIA</Label>
            <Textarea
              id="aria-description"
              value={ariaDescription}
              onChange={(e) => handleAriaDescriptionChange(e.target.value)}
              placeholder="Szczegółowy opis dostępności..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Szczegółowy opis dla czytników ekranu
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rola ARIA</Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="region">Region</SelectItem>
                <SelectItem value="navigation">Nawigacja</SelectItem>
                <SelectItem value="main">Główna treść</SelectItem>
                <SelectItem value="complementary">Uzupełniająca</SelectItem>
                <SelectItem value="banner">Baner</SelectItem>
                <SelectItem value="contentinfo">Info o treści</SelectItem>
                <SelectItem value="search">Wyszukiwanie</SelectItem>
                <SelectItem value="form">Formularz</SelectItem>
                <SelectItem value="article">Artykuł</SelectItem>
                <SelectItem value="aside">Na boku</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Rola semantyczna elementu
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tab-index">Tab Index</Label>
            <Input
              id="tab-index"
              value={tabIndex}
              onChange={(e) => handleTabIndexChange(e.target.value)}
              placeholder="0"
              type="number"
            />
            <p className="text-xs text-muted-foreground">
              Kolejność fokusa (0 = naturalna, -1 = nie w fokusie, 1+ = priorytet)
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};