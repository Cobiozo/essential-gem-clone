import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ParsedElement } from './types';
import { parseHtmlToElements } from './hooks/useHtmlParser';
import { serializeElementsToHtml } from './hooks/useHtmlSerializer';
import { DraggableHtmlElement } from './DraggableHtmlElement';
import { HtmlPropertiesPanel } from './HtmlPropertiesPanel';
import { HtmlElementToolbar } from './HtmlElementToolbar';
import { HtmlFormattingToolbar } from './HtmlFormattingToolbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Code, Globe, Info, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';

interface HtmlHybridEditorProps {
  htmlContent: string;
  customCss?: string;
  onChange: (html: string) => void;
}

export const HtmlHybridEditor: React.FC<HtmlHybridEditorProps> = ({
  htmlContent,
  customCss,
  onChange
}) => {
  const [elements, setElements] = useState<ParsedElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<ParsedElement | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showOutlines, setShowOutlines] = useState(true);
  const [isEditMode, setIsEditMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'preview'>('visual');
  const [codeValue, setCodeValue] = useState(htmlContent);
  const editableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // Parse HTML on mount and when htmlContent changes externally
  useEffect(() => {
    const parsed = parseHtmlToElements(htmlContent);
    setElements(parsed);
    setCodeValue(htmlContent);
    
    if (history.length === 0) {
      setHistory([htmlContent]);
      setHistoryIndex(0);
    }
  }, [htmlContent]);
  
  // Sync code view with visual changes
  useEffect(() => {
    if (activeTab === 'visual' && elements.length > 0) {
      const html = serializeElementsToHtml(elements);
      setCodeValue(html);
    }
  }, [elements, activeTab]);
  
  // Save to history
  const saveToHistory = useCallback((html: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(html);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);
  
  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const html = history[newIndex];
      setElements(parseHtmlToElements(html));
      setCodeValue(html);
      onChange(html);
    }
  }, [historyIndex, history, onChange]);
  
  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const html = history[newIndex];
      setElements(parseHtmlToElements(html));
      setCodeValue(html);
      onChange(html);
    }
  }, [historyIndex, history, onChange]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            handleUndo();
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'Escape') {
        setEditingElementId(null);
        setSelectedElement(null);
      }
      if (e.key === 'Delete' && selectedElement && !editingElementId) {
        e.preventDefault();
        handleDelete();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedElement, editingElementId]);
  
  // Find element by ID recursively
  const findElementById = useCallback((elements: ParsedElement[], id: string): ParsedElement | null => {
    for (const el of elements) {
      if (el.id === id) return el;
      if (el.children.length > 0) {
        const found = findElementById(el.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);
  
  // Find parent element
  const findParentElement = useCallback((elements: ParsedElement[], childId: string, parent: ParsedElement | null = null): ParsedElement | null => {
    for (const el of elements) {
      if (el.id === childId) return parent;
      if (el.children.length > 0) {
        const found = findParentElement(el.children, childId, el);
        if (found !== null) return found;
      }
    }
    return null;
  }, []);
  
  // Update element by ID recursively
  const updateElementById = useCallback((
    elements: ParsedElement[], 
    id: string, 
    updates: Partial<ParsedElement>
  ): ParsedElement[] => {
    return elements.map(el => {
      if (el.id === id) {
        return { ...el, ...updates };
      }
      if (el.children.length > 0) {
        return {
          ...el,
          children: updateElementById(el.children, id, updates)
        };
      }
      return el;
    });
  }, []);
  
  // Delete element by ID
  const deleteElementById = useCallback((elements: ParsedElement[], id: string): ParsedElement[] => {
    return elements
      .filter(el => el.id !== id)
      .map(el => ({
        ...el,
        children: deleteElementById(el.children, id)
      }));
  }, []);
  
  // Duplicate element by ID
  const duplicateElementById = useCallback((elements: ParsedElement[], id: string): ParsedElement[] => {
    const result: ParsedElement[] = [];
    
    for (const el of elements) {
      result.push({
        ...el,
        children: duplicateElementById(el.children, id)
      });
      
      if (el.id === id) {
        const duplicate = JSON.parse(JSON.stringify(el));
        const regenerateIds = (element: ParsedElement): ParsedElement => ({
          ...element,
          id: `el-${Math.random().toString(36).substr(2, 9)}`,
          children: element.children.map(regenerateIds)
        });
        result.push(regenerateIds(duplicate));
      }
    }
    
    return result;
  }, []);
  
  // Sync and save
  const syncAndSave = useCallback((newElements: ParsedElement[]) => {
    setElements(newElements);
    const newHtml = serializeElementsToHtml(newElements);
    saveToHistory(newHtml);
    onChange(newHtml);
  }, [saveToHistory, onChange]);
  
  // Handle drag end for reordering (including nested elements)
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Helper to find element and its parent
    const findElementAndParent = (
      elements: ParsedElement[], 
      id: string, 
      parent: ParsedElement | null = null
    ): { element: ParsedElement | null; parent: ParsedElement | null; siblings: ParsedElement[] } => {
      for (const el of elements) {
        if (el.id === id) {
          return { element: el, parent, siblings: parent ? parent.children : elements };
        }
        if (el.children.length > 0) {
          const found = findElementAndParent(el.children, id, el);
          if (found.element) return found;
        }
      }
      return { element: null, parent: null, siblings: [] };
    };
    
    const activeResult = findElementAndParent(elements, activeId);
    const overResult = findElementAndParent(elements, overId);
    
    if (!activeResult.element || !overResult.element) return;
    
    // Only allow reordering within the same parent
    if (activeResult.parent?.id !== overResult.parent?.id) {
      toast({
        title: "Niedozwolona operacja",
        description: "Można przenosić elementy tylko w obrębie tego samego kontenera.",
        variant: "destructive"
      });
      return;
    }
    
    const oldIndex = activeResult.siblings.findIndex(el => el.id === activeId);
    const newIndex = overResult.siblings.findIndex(el => el.id === overId);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const reorderedSiblings = arrayMove(activeResult.siblings, oldIndex, newIndex);
    
    let updatedElements: ParsedElement[];
    
    if (activeResult.parent) {
      // Nested element - update parent's children
      updatedElements = updateElementById(elements, activeResult.parent.id, {
        children: reorderedSiblings
      });
    } else {
      // Top-level element
      updatedElements = reorderedSiblings;
    }
    
    syncAndSave(updatedElements);
    
    toast({
      title: "Elementy posortowane",
      description: "Kolejność elementów została zmieniona."
    });
  }, [elements, syncAndSave, toast, updateElementById]);
  
  // Add new element
  const addElement = useCallback((html: string, position: 'before' | 'after' | 'inside' = 'after') => {
    const newElements = parseHtmlToElements(html);
    if (newElements.length === 0) return;
    
    let updatedElements: ParsedElement[];
    
    if (!selectedElement) {
      updatedElements = [...elements, ...newElements];
    } else if (position === 'inside') {
      updatedElements = updateElementById(elements, selectedElement.id, {
        children: [...selectedElement.children, ...newElements]
      });
    } else {
      const parent = findParentElement(elements, selectedElement.id);
      
      if (parent) {
        const childIndex = parent.children.findIndex(c => c.id === selectedElement.id);
        const insertIndex = position === 'before' ? childIndex : childIndex + 1;
        const newChildren = [...parent.children];
        newChildren.splice(insertIndex, 0, ...newElements);
        updatedElements = updateElementById(elements, parent.id, { children: newChildren });
      } else {
        const index = elements.findIndex(el => el.id === selectedElement.id);
        const insertIndex = position === 'before' ? index : index + 1;
        updatedElements = [...elements];
        updatedElements.splice(insertIndex, 0, ...newElements);
      }
    }
    
    syncAndSave(updatedElements);
    setSelectedElement(newElements[0]);
    
    toast({
      title: "Element dodany",
      description: "Nowy element został dodany do dokumentu."
    });
  }, [elements, selectedElement, updateElementById, findParentElement, syncAndSave, toast]);
  
  // Handle element selection
  const handleSelect = useCallback((element: ParsedElement) => {
    setSelectedElement(element);
    setEditingElementId(null);
  }, []);
  
  // Handle double-click for inline editing
  const handleStartInlineEdit = useCallback((elementId: string) => {
    setEditingElementId(elementId);
  }, []);
  
  // Handle inline edit end
  const handleEndInlineEdit = useCallback((elementId: string, newContent: string) => {
    const updatedElements = updateElementById(elements, elementId, { 
      textContent: newContent 
    });
    syncAndSave(updatedElements);
    setEditingElementId(null);
    
    // Update selected element reference
    const updatedSelected = findElementById(updatedElements, elementId);
    setSelectedElement(updatedSelected);
  }, [elements, updateElementById, syncAndSave, findElementById]);
  
  // Handle element update from properties panel
  const handleUpdate = useCallback((updates: Partial<ParsedElement>) => {
    if (!selectedElement) return;
    
    const updatedElements = updateElementById(elements, selectedElement.id, updates);
    syncAndSave(updatedElements);
    
    const updatedSelected = findElementById(updatedElements, selectedElement.id);
    setSelectedElement(updatedSelected);
  }, [elements, selectedElement, updateElementById, syncAndSave, findElementById]);
  
  // Handle element deletion
  const handleDelete = useCallback(() => {
    if (!selectedElement) return;
    
    const updatedElements = deleteElementById(elements, selectedElement.id);
    syncAndSave(updatedElements);
    setSelectedElement(null);
    setEditingElementId(null);
    
    toast({
      title: "Element usunięty",
      description: "Element został usunięty z dokumentu."
    });
  }, [elements, selectedElement, deleteElementById, syncAndSave, toast]);
  
  // Handle element duplication
  const handleDuplicate = useCallback(() => {
    if (!selectedElement) return;
    
    const updatedElements = duplicateElementById(elements, selectedElement.id);
    syncAndSave(updatedElements);
    
    toast({
      title: "Element zduplikowany",
      description: "Kopia elementu została dodana."
    });
  }, [elements, selectedElement, duplicateElementById, syncAndSave, toast]);
  
  // Handle close panel
  const handleClosePanel = useCallback(() => {
    setSelectedElement(null);
    setEditingElementId(null);
  }, []);
  
  // Handle code changes
  const handleCodeChange = useCallback((newCode: string) => {
    setCodeValue(newCode);
  }, []);
  
  // Apply code changes
  const applyCodeChanges = useCallback(() => {
    const parsed = parseHtmlToElements(codeValue);
    setElements(parsed);
    saveToHistory(codeValue);
    onChange(codeValue);
    toast({
      title: "Zmiany zastosowane",
      description: "Kod HTML został zaktualizowany."
    });
  }, [codeValue, saveToHistory, onChange, toast]);
  
  // Handle formatting commands (for inline editing)
  const handleFormat = useCallback((command: string, value?: string) => {
    if (!editingElementId) return;
    
    if (command === 'formatBlock') {
      document.execCommand('formatBlock', false, value);
    } else if (command === 'fontSize') {
      document.execCommand('styleWithCSS', false, 'true');
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = value || '16px';
        range.surroundContents(span);
      }
    } else {
      document.execCommand(command, false, value);
    }
    
    // Sync changes back
    if (editableRef.current) {
      const editingEl = editableRef.current.querySelector(`[data-element-id="${editingElementId}"]`);
      if (editingEl) {
        const newContent = editingEl.innerHTML;
        handleEndInlineEdit(editingElementId, newContent);
      }
    }
  }, [editingElementId, handleEndInlineEdit]);
  
  return (
    <div className="h-full flex flex-col min-h-[600px] max-h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-background">
      {/* Formatting Toolbar */}
      <HtmlFormattingToolbar
        onFormat={handleFormat}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        isInlineEditMode={!!editingElementId}
      />
      
      {/* Element Toolbar */}
      <HtmlElementToolbar
        onAddElement={addElement}
        hasSelection={!!selectedElement}
      />
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-2 bg-muted/20 shrink-0">
          <TabsList className="h-9 bg-transparent">
            <TabsTrigger value="visual" className="text-xs gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Edytor wizualny
            </TabsTrigger>
            <TabsTrigger value="code" className="text-xs gap-1.5">
              <Code className="h-3.5 w-3.5" />
              Kod HTML
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Pełny podgląd
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {elements.length} elementów • Historia: {historyIndex + 1}/{history.length}
            </span>
            {activeTab === 'visual' && (
              <>
                <Button
                  variant={isEditMode ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs"
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  <GripVertical className="w-3.5 h-3.5" />
                  {isEditMode ? 'Sortowanie' : 'Sortowanie wył.'}
                </Button>
                <Button
                  variant={showOutlines ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs"
                  onClick={() => setShowOutlines(!showOutlines)}
                >
                  {showOutlines ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  Kontury
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Visual Editor Tab */}
        <TabsContent value="visual" className="flex-1 m-0 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={selectedElement ? 60 : 100} minSize={40} className="h-full">
              <div className="h-full overflow-y-auto">
                <div className="p-4 pl-8 min-h-full" ref={editableRef}>
                  {customCss && <style>{customCss}</style>}
                  
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={elements.map(el => el.id)} 
                      strategy={verticalListSortingStrategy}
                    >
                      <div 
                        className={`space-y-1 html-preview-container ${showOutlines ? 'show-outlines' : ''}`}
                      >
                        {elements.length === 0 ? (
                          <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                            <Code className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium mb-2">Brak elementów do wyświetlenia</p>
                            <p className="text-sm mb-4">Użyj paska narzędzi powyżej, aby dodać elementy</p>
                            <p className="text-xs">
                              Kliknij element, aby go edytować • Kliknij dwukrotnie, aby edytować tekst
                            </p>
                          </div>
                        ) : (
                          elements.map((element) => (
                            <DraggableHtmlElement
                              key={element.id}
                              element={element}
                              isEditMode={isEditMode}
                              selectedId={selectedElement?.id || null}
                              hoveredId={hoveredId}
                              editingId={editingElementId}
                              onSelect={handleSelect}
                              onHover={setHoveredId}
                              onStartEdit={handleStartInlineEdit}
                              onEndEdit={handleEndInlineEdit}
                              showOutlines={showOutlines}
                            />
                          ))
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </ResizablePanel>
            
            {selectedElement && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={30} maxSize={50}>
                  <HtmlPropertiesPanel
                    element={selectedElement}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onClose={handleClosePanel}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </TabsContent>
        
        {/* Code Editor Tab */}
        <TabsContent value="code" className="flex-1 m-0 p-4 overflow-hidden">
          <div className="h-full flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5" />
                Edytuj kod HTML bezpośrednio
              </div>
              <Button size="sm" onClick={applyCodeChanges}>
                Zastosuj zmiany
              </Button>
            </div>
            <Textarea
              value={codeValue}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="flex-1 font-mono text-sm resize-none"
              placeholder="Wpisz kod HTML..."
            />
          </div>
        </TabsContent>
        
        {/* Full Preview Tab */}
        <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
          <div className="h-full bg-white border-t">
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <script src="https://cdn.tailwindcss.com"></script>
                  <script src="https://unpkg.com/lucide@latest"></script>
                  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Open+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                  <style>
                    body { 
                      font-family: 'Open Sans', sans-serif; 
                      margin: 0; 
                      padding: 24px;
                    }
                    h1, h2, h3, h4, h5, h6 { 
                      font-family: 'Montserrat', sans-serif; 
                    }
                    ${customCss || ''}
                  </style>
                </head>
                <body>
                  ${codeValue}
                  <script>
                    if (window.lucide) {
                      lucide.createIcons();
                    }
                  </script>
                </body>
                </html>
              `}
              className="w-full h-full border-0"
              title="Podgląd strony"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
