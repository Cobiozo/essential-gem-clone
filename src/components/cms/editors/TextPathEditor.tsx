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

interface TextPathEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

export const TextPathEditor: React.FC<TextPathEditorProps> = ({
  item,
  onSave,
  onCancel
}) => {
  const [text, setText] = useState(item.title || '');
  const [pathDefinition, setPathDefinition] = useState(item.description || 'M 10 80 Q 95 10 180 80');
  const [fontSize, setFontSize] = useState(item.font_size?.toString() || '24');
  const [pathType, setPathType] = useState(item.url || 'curve');
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

  const handleTextChange = (value: string) => {
    setText(value);
    updateItem({ title: value });
  };

  const handlePathDefinitionChange = (value: string) => {
    setPathDefinition(value);
    updateItem({ description: value });
  };

  const handleFontSizeChange = (value: string) => {
    setFontSize(value);
    updateItem({ font_size: parseInt(value) || 24 });
  };

  const handlePathTypeChange = (value: string) => {
    setPathType(value);
    let newPath = '';
    
    switch (value) {
      case 'curve':
        newPath = 'M 10 80 Q 95 10 180 80';
        break;
      case 'wave':
        newPath = 'M 10 50 Q 45 20 80 50 T 150 50';
        break;
      case 'circle':
        newPath = 'M 100 50 A 50 50 0 1 1 100 49';
        break;
      case 'line':
        newPath = 'M 10 50 L 190 50';
        break;
      default:
        newPath = pathDefinition;
    }
    
    setPathDefinition(newPath);
    updateItem({ 
      url: value,
      description: newPath
    });
  };

  const handleSaveNow = () => {
    onSave(editedItem);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Ścieżka tekstowa</h3>
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
            <Label htmlFor="text">Tekst</Label>
            <Input
              id="text"
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Twój tekst na ścieżce..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="path-type">Typ ścieżki</Label>
            <Select value={pathType} onValueChange={handlePathTypeChange}>
              <SelectTrigger id="path-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="curve">Krzywa</SelectItem>
                <SelectItem value="wave">Fala</SelectItem>
                <SelectItem value="circle">Okrąg</SelectItem>
                <SelectItem value="line">Linia prosta</SelectItem>
                <SelectItem value="custom">Niestandardowa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="path-definition">Definicja ścieżki SVG</Label>
            <Textarea
              id="path-definition"
              value={pathDefinition}
              onChange={(e) => handlePathDefinitionChange(e.target.value)}
              placeholder="M 10 80 Q 95 10 180 80"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Komenda SVG path (d attribute). Użyj generatora lub wybierz typ ścieżki powyżej.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-size">Rozmiar czcionki (px)</Label>
            <Input
              id="font-size"
              value={fontSize}
              onChange={(e) => handleFontSizeChange(e.target.value)}
              placeholder="24"
              type="number"
              min="8"
              max="100"
            />
          </div>

          <div className="rounded-lg border bg-muted p-4 space-y-2">
            <h4 className="font-semibold text-sm">Podgląd</h4>
            <svg viewBox="0 0 200 100" className="w-full h-24 border rounded bg-background">
              <defs>
                <path id="textPath" d={pathDefinition} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              </defs>
              <use href="#textPath" />
              <text fontSize={fontSize} fill="currentColor">
                <textPath href="#textPath" startOffset="0%">
                  {text || 'Twój tekst tutaj'}
                </textPath>
              </text>
            </svg>
          </div>

          <div className="rounded-lg border bg-muted p-4 space-y-2">
            <h4 className="font-semibold text-sm">Pomocy</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• M = Move to (początek)</li>
              <li>• L = Line to (linia)</li>
              <li>• Q = Quadratic curve (krzywa kwadratowa)</li>
              <li>• A = Arc (łuk)</li>
              <li>• T = Smooth curve (gładka krzywa)</li>
            </ul>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};