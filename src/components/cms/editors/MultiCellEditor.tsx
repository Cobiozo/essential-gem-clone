import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CMSItem, ContentCell } from '@/types/cms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  Type, 
  FileText, 
  List, 
  ExternalLink, 
  Anchor, 
  MousePointer2,
  Layers
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { VisibilityEditor } from './VisibilityEditor';
import { AdvancedStyleTab } from './AdvancedStyleTab';

interface MultiCellEditorProps {
  item: CMSItem;
  onSave: (item: CMSItem) => void;
  onCancel: () => void;
}

const CELL_TYPES = [
  { value: 'header', label: 'Nagłówek', icon: Type, description: 'Duży nagłówek sekcji' },
  { value: 'description', label: 'Opis', icon: FileText, description: 'Tekst opisowy' },
  { value: 'list_item', label: 'Element listy', icon: List, description: 'Punkt listy z kropką' },
  { value: 'button_functional', label: 'Przycisk funkcyjny', icon: MousePointer2, description: 'Przycisk z akcją' },
  { value: 'button_anchor', label: 'Przycisk kotwica', icon: Anchor, description: 'Link wewnętrzny' },
  { value: 'button_external', label: 'Przycisk zewnętrzny', icon: ExternalLink, description: 'Link zewnętrzny' },
  { value: 'section', label: 'Sekcja zagnieżdżona', icon: Layers, description: 'Kontener na elementy' },
] as const;

const generateId = () => `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const MultiCellEditor: React.FC<MultiCellEditorProps> = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState<CMSItem>(() => ({
    ...item,
    cells: item.cells || [],
  }));
  
  const [expandedCells, setExpandedCells] = useState<string[]>([]);
  const lastSavedRef = useRef<string>(JSON.stringify(item));
  const isSavingRef = useRef(false);
  
  const debouncedFormData = useDebounce(formData, 1500);

  // Auto-save
  useEffect(() => {
    const currentData = JSON.stringify(debouncedFormData);
    if (currentData !== lastSavedRef.current && !isSavingRef.current) {
      isSavingRef.current = true;
      onSave(debouncedFormData);
      lastSavedRef.current = currentData;
      setTimeout(() => {
        isSavingRef.current = false;
      }, 500);
    }
  }, [debouncedFormData, onSave]);

  const updateField = useCallback(<K extends keyof CMSItem>(field: K, value: CMSItem[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const cells = (formData.cells || []) as ContentCell[];

  const addCell = useCallback((type: ContentCell['type']) => {
    const newCell: ContentCell = {
      id: generateId(),
      type,
      content: '',
      url: type.includes('button') ? '' : undefined,
      position: cells.length,
      is_active: true,
    };
    
    if (type === 'section') {
      newCell.section_title = '';
      newCell.section_description = '';
      newCell.section_items = [];
    }
    
    const newCells = [...cells, newCell];
    updateField('cells', newCells);
    setExpandedCells(prev => [...prev, newCell.id!]);
  }, [cells, updateField]);

  const updateCell = useCallback((cellId: string, updates: Partial<ContentCell>) => {
    const newCells = cells.map(cell => 
      cell.id === cellId ? { ...cell, ...updates } : cell
    );
    updateField('cells', newCells);
  }, [cells, updateField]);

  const removeCell = useCallback((cellId: string) => {
    const newCells = cells
      .filter(cell => cell.id !== cellId)
      .map((cell, index) => ({ ...cell, position: index }));
    updateField('cells', newCells);
    setExpandedCells(prev => prev.filter(id => id !== cellId));
  }, [cells, updateField]);

  const moveCell = useCallback((cellId: string, direction: 'up' | 'down') => {
    const index = cells.findIndex(c => c.id === cellId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= cells.length) return;
    
    const newCells = [...cells];
    [newCells[index], newCells[newIndex]] = [newCells[newIndex], newCells[index]];
    const reorderedCells = newCells.map((cell, idx) => ({ ...cell, position: idx }));
    updateField('cells', reorderedCells);
  }, [cells, updateField]);

  const toggleCellExpanded = (cellId: string) => {
    setExpandedCells(prev => 
      prev.includes(cellId) 
        ? prev.filter(id => id !== cellId)
        : [...prev, cellId]
    );
  };

  const getCellIcon = (type: string) => {
    const cellType = CELL_TYPES.find(t => t.value === type);
    return cellType?.icon || Type;
  };

  const getCellLabel = (type: string) => {
    const cellType = CELL_TYPES.find(t => t.value === type);
    return cellType?.label || type;
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="cells" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 shrink-0">
          <TabsTrigger value="cells">Komórki</TabsTrigger>
          <TabsTrigger value="main">Główne</TabsTrigger>
          <TabsTrigger value="style">Styl</TabsTrigger>
          <TabsTrigger value="visibility">Widoczność</TabsTrigger>
        </TabsList>

        <TabsContent value="cells" className="flex-1 overflow-hidden flex flex-col mt-2">
          <ScrollArea className="flex-1">
            <div className="space-y-2 p-2">
              {/* Lista komórek */}
              {cells.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Brak komórek</p>
                  <p className="text-xs">Dodaj pierwszą komórkę poniżej</p>
                </div>
              ) : (
                cells.sort((a, b) => a.position - b.position).map((cell, index) => {
                  const CellIcon = getCellIcon(cell.type);
                  const isExpanded = expandedCells.includes(cell.id!);
                  
                  return (
                    <Card key={cell.id} className="overflow-hidden">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleCellExpanded(cell.id!)}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-2 p-3 hover:bg-muted/50 cursor-pointer">
                            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                            <CellIcon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 text-sm font-medium truncate">
                              {cell.content || getCellLabel(cell.type)}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Switch
                                checked={cell.is_active}
                                onCheckedChange={(checked) => updateCell(cell.id!, { is_active: checked })}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveCell(cell.id!, 'up');
                                }}
                                disabled={index === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveCell(cell.id!, 'down');
                                }}
                                disabled={index === cells.length - 1}
                              >
                                ↓
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCell(cell.id!);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="pt-0 pb-3 px-3 space-y-3 border-t">
                            {/* Typ komórki */}
                            <div className="space-y-1 pt-3">
                              <Label className="text-xs">Typ komórki</Label>
                              <Select
                                value={cell.type}
                                onValueChange={(value) => updateCell(cell.id!, { type: value as ContentCell['type'] })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CELL_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      <div className="flex items-center gap-2">
                                        <type.icon className="w-4 h-4" />
                                        {type.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Treść */}
                            <div className="space-y-1">
                              <Label className="text-xs">Treść</Label>
                              {cell.type === 'description' ? (
                                <Textarea
                                  value={cell.content}
                                  onChange={(e) => updateCell(cell.id!, { content: e.target.value })}
                                  placeholder="Wprowadź tekst..."
                                  className="min-h-[80px]"
                                />
                              ) : (
                                <Input
                                  value={cell.content}
                                  onChange={(e) => updateCell(cell.id!, { content: e.target.value })}
                                  placeholder={cell.type === 'header' ? 'Nagłówek...' : 'Tekst...'}
                                />
                              )}
                            </div>

                            {/* URL dla przycisków */}
                            {cell.type.includes('button') && (
                              <div className="space-y-1">
                                <Label className="text-xs">URL / Link</Label>
                                <Input
                                  value={cell.url || ''}
                                  onChange={(e) => updateCell(cell.id!, { url: e.target.value })}
                                  placeholder={
                                    cell.type === 'button_external' 
                                      ? 'https://...' 
                                      : cell.type === 'button_anchor'
                                      ? '#sekcja-id'
                                      : '/strona'
                                  }
                                />
                              </div>
                            )}

                            {/* Sekcja zagnieżdżona */}
                            {cell.type === 'section' && (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-xs">Tytuł sekcji</Label>
                                  <Input
                                    value={cell.section_title || ''}
                                    onChange={(e) => updateCell(cell.id!, { section_title: e.target.value })}
                                    placeholder="Tytuł sekcji..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Opis sekcji</Label>
                                  <Textarea
                                    value={cell.section_description || ''}
                                    onChange={(e) => updateCell(cell.id!, { section_description: e.target.value })}
                                    placeholder="Opis sekcji..."
                                    className="min-h-[60px]"
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Elementy w sekcji zagnieżdżonej można dodawać bezpośrednio w edytorze layoutu.
                                </p>
                              </>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })
              )}

              {/* Dodaj nową komórkę */}
              <div className="pt-3 border-t">
                <Label className="text-xs mb-2 block">Dodaj nową komórkę</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CELL_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant="outline"
                      size="sm"
                      onClick={() => addCell(type.value)}
                      className="justify-start h-auto py-2"
                    >
                      <type.icon className="w-4 h-4 mr-2 shrink-0" />
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="main" className="flex-1 overflow-auto mt-2">
          <div className="space-y-4 p-2">
            <div className="space-y-2">
              <Label>Tytuł elementu</Label>
              <Input
                value={formData.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Tytuł (wyświetlany jako nagłówek)"
              />
            </div>

            <div className="space-y-2">
              <Label>Opis elementu</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Opis (treść rozwijana po kliknięciu)"
                className="min-h-[100px]"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Element aktywny</Label>
              <Switch
                checked={formData.is_active !== false}
                onCheckedChange={(checked) => updateField('is_active', checked)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-auto mt-2">
          <AdvancedStyleTab 
            item={formData} 
            onUpdate={(updates) => setFormData(prev => ({ ...prev, ...updates }))} 
          />
        </TabsContent>

        <TabsContent value="visibility" className="flex-1 overflow-auto mt-2">
          <div className="p-2">
            <VisibilityEditor
              value={{
                visible_to_everyone: formData.visible_to_everyone ?? true,
                visible_to_clients: formData.visible_to_clients ?? false,
                visible_to_partners: formData.visible_to_partners ?? false,
                visible_to_specjalista: formData.visible_to_specjalista ?? false,
                visible_to_anonymous: formData.visible_to_anonymous ?? false,
              }}
              onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};