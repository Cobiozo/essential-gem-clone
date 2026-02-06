import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ParsedElement } from './types';
import { parseHtmlToElements } from './hooks/useHtmlParser';
import { serializeElementsToHtml } from './hooks/useHtmlSerializer';
import { DraggableHtmlElement } from './DraggableHtmlElement';
import { SimplifiedPropertiesPanel } from './SimplifiedPropertiesPanel';
import { HtmlElementToolbar } from './HtmlElementToolbar';
import { HtmlFormattingToolbar } from './HtmlFormattingToolbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Code, Globe, Info, GripVertical, ExternalLink, Monitor, Tablet, Smartphone, MousePointer } from 'lucide-react';
import { HtmlElementRenderer } from './HtmlElementRenderer';
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
  // Use stable ID instead of full element object to prevent panel closing
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showOutlines, setShowOutlines] = useState(true);
  const [isEditMode, setIsEditMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'preview'>('visual');
  const [codeValue, setCodeValue] = useState(htmlContent);
  const [previewWidth, setPreviewWidth] = useState<'100%' | '768px' | '375px'>('100%');
  const [previewClickToSelect, setPreviewClickToSelect] = useState(true);
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
  
  // REAL-TIME PREVIEW - computed directly from elements state
  const previewHtml = useMemo(() => {
    return serializeElementsToHtml(elements);
  }, [elements]);
  
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
  
  // Sync code view ONLY when switching to code tab
  useEffect(() => {
    if (activeTab === 'code') {
      setCodeValue(previewHtml);
    }
  }, [activeTab, previewHtml]);
  
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
  
  // Open real preview in new window - uses real-time previewHtml
  const openRealPreview = useCallback(() => {
    const fullHtml = `
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
  ${previewHtml}
  <script>
    if (window.lucide) {
      lucide.createIcons();
    }
  </script>
</body>
</html>
    `.trim();
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }, [previewHtml, customCss]);

  // NOTE: Keyboard shortcuts moved after handleDelete declaration (see below)
  
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
  
  // MEMOIZED selected element - prevents panel closing during state updates
  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null;
    return findElementById(elements, selectedElementId);
  }, [elements, selectedElementId, findElementById]);
  
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
    
    // Check if over element is a container (can accept children)
    const containerTags = ['div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav', 'figure'];
    const isOverContainer = containerTags.includes(overResult.element.tagName.toLowerCase());
    
    // CASE 1: Moving BETWEEN different containers
    if (activeResult.parent?.id !== overResult.parent?.id) {
      // Step 1: Remove element from old location
      let updatedElements = deleteElementById(elements, activeId);
      
      // Step 2: Determine where to insert
      if (isOverContainer && overResult.element.id !== activeResult.parent?.id) {
        // Drop into the container (as first child)
        const targetContainer = findElementById(updatedElements, overId);
        if (targetContainer) {
          updatedElements = updateElementById(updatedElements, overId, {
            children: [activeResult.element, ...targetContainer.children]
          });
        }
      } else {
        // Drop beside the over element (in its parent)
        if (overResult.parent) {
          // Re-find the parent in updated elements (after deletion)
          const freshParent = findElementById(updatedElements, overResult.parent.id);
          if (freshParent) {
            const overIndex = freshParent.children.findIndex(c => c.id === overId);
            const newChildren = [...freshParent.children];
            newChildren.splice(overIndex + 1, 0, activeResult.element);
            updatedElements = updateElementById(updatedElements, overResult.parent.id, {
              children: newChildren
            });
          }
        } else {
          // Over is at root level
          const overIndex = updatedElements.findIndex(el => el.id === overId);
          updatedElements.splice(overIndex + 1, 0, activeResult.element);
        }
      }
      
      syncAndSave(updatedElements);
      toast({
        title: "Element przeniesiony",
        description: "Element został przeniesiony do innego kontenera."
      });
      return;
    }
    
    // CASE 2: Reordering within SAME container (existing logic)
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
  }, [elements, syncAndSave, toast, updateElementById, deleteElementById, findElementById]);
  
  // Add new element
  const addElement = useCallback((html: string, position: 'before' | 'after' | 'inside' = 'after') => {
    const newElements = parseHtmlToElements(html);
    if (newElements.length === 0) return;
    
    let updatedElements: ParsedElement[];
    const selectedElement = selectedElementId ? findElementById(elements, selectedElementId) : null;
    
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
    setSelectedElementId(newElements[0].id);
    
    toast({
      title: "Element dodany",
      description: "Nowy element został dodany do dokumentu."
    });
  }, [elements, selectedElementId, updateElementById, findParentElement, syncAndSave, toast, findElementById]);
  
  // Handle element selection - use stable ID
  const handleSelect = useCallback((element: ParsedElement) => {
    setSelectedElementId(element.id);
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
    // Keep selection stable - don't reset selectedElementId
  }, [elements, updateElementById, syncAndSave]);
  
  // Handle element update from properties panel - stable ID prevents panel closing
  const handleUpdate = useCallback((updates: Partial<ParsedElement>) => {
    if (!selectedElementId) return;
    
    const updatedElements = updateElementById(elements, selectedElementId, updates);
    syncAndSave(updatedElements);
    // DON'T reset selectedElementId - keep panel open
  }, [elements, selectedElementId, updateElementById, syncAndSave]);
  
  // Handle element deletion - clear ID only on delete
  const handleDelete = useCallback(() => {
    if (!selectedElementId) return;
    
    const updatedElements = deleteElementById(elements, selectedElementId);
    syncAndSave(updatedElements);
    setSelectedElementId(null); // Clear only on explicit delete
    setEditingElementId(null);
    
    toast({
      title: "Element usunięty",
      description: "Element został usunięty z dokumentu."
    });
  }, [elements, selectedElementId, deleteElementById, syncAndSave, toast]);
  
  // Handle element duplication
  const handleDuplicate = useCallback(() => {
    if (!selectedElementId) return;
    
    const updatedElements = duplicateElementById(elements, selectedElementId);
    syncAndSave(updatedElements);
    
    toast({
      title: "Element zduplikowany",
      description: "Kopia elementu została dodana."
    });
  }, [elements, selectedElementId, duplicateElementById, syncAndSave, toast]);
  
  // Handle keyboard shortcuts (moved here after handleDelete declaration)
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
        setSelectedElementId(null);
      }
      if (e.key === 'Delete' && selectedElementId && !editingElementId) {
        e.preventDefault();
        handleDelete();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedElementId, editingElementId, handleDelete]);
  
  // Handle inserting child element into a container
  const handleInsertChild = useCallback((parentId: string, childHtml: string) => {
    const parent = findElementById(elements, parentId);
    if (!parent) return;
    
    const newChildren = parseHtmlToElements(childHtml);
    if (newChildren.length === 0) return;
    
    const updatedElements = updateElementById(elements, parentId, {
      children: [...parent.children, ...newChildren]
    });
    
    syncAndSave(updatedElements);
    
    // Select the newly inserted child
    const updatedParent = findElementById(updatedElements, parentId);
    if (updatedParent && updatedParent.children.length > 0) {
      setSelectedElementId(updatedParent.children[updatedParent.children.length - 1].id);
    }
    
    toast({
      title: "Element dodany",
      description: "Element wideo został wstawiony do kontenera."
    });
  }, [elements, findElementById, updateElementById, syncAndSave, toast]);
  
  // Handle close panel
  const handleClosePanel = useCallback(() => {
    setSelectedElementId(null);
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
    <div className="h-full flex flex-col border rounded-lg overflow-hidden bg-background">
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
        hasSelection={!!selectedElementId}
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
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1 text-xs ml-2"
              onClick={openRealPreview}
              title="Otwórz w nowym oknie"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Podgląd rzeczywisty
            </Button>
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
        <TabsContent value="visual" className="flex-1 h-0 min-h-0 m-0 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={selectedElementId ? 60 : 100} minSize={40} className="h-full">
              <div className="h-full overflow-y-auto">
                <div className="p-4 pl-10 min-h-full" ref={editableRef}>
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
                              selectedId={selectedElementId}
                              hoveredId={hoveredId}
                              editingId={editingElementId}
                              onSelect={handleSelect}
                              onHover={setHoveredId}
                              onStartEdit={handleStartInlineEdit}
                              onEndEdit={handleEndInlineEdit}
                              onUpdate={(elementId, updates) => {
                                const updatedElements = updateElementById(elements, elementId, updates);
                                syncAndSave(updatedElements);
                                // Don't reset selection - keep it stable
                              }}
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
            
            {selectedElementId && selectedElement && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={35} minSize={28} maxSize={50}>
                  <SimplifiedPropertiesPanel
                    element={selectedElement}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onClose={handleClosePanel}
                    onInsertChild={handleInsertChild}
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
        
        {/* Full Preview Tab - uses real-time previewHtml */}
        <TabsContent value="preview" className="flex-1 m-0 overflow-hidden flex flex-col">
          {/* Responsive Preview Controls */}
          <div className="flex items-center justify-center gap-1 py-2 bg-muted/30 border-b shrink-0">
            <span className="text-xs text-muted-foreground mr-2">Widok:</span>
            <Button
              variant={previewWidth === '100%' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => setPreviewWidth('100%')}
              title="Desktop (pełna szerokość)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="text-xs hidden sm:inline">Desktop</span>
            </Button>
            <Button
              variant={previewWidth === '768px' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => setPreviewWidth('768px')}
              title="Tablet (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="text-xs hidden sm:inline">Tablet</span>
            </Button>
            <Button
              variant={previewWidth === '375px' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => setPreviewWidth('375px')}
              title="Mobile (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-xs hidden sm:inline">Mobile</span>
            </Button>
            
            <div className="h-4 w-px bg-border mx-2" />
            
            {/* Toggle: click to select element */}
            <Button
              variant={previewClickToSelect ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => setPreviewClickToSelect(!previewClickToSelect)}
              title="Kliknij element, aby go edytować"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span className="text-xs">Edytuj kliknięciem</span>
            </Button>
          </div>
          
          {/* Preview container - full height */}
          <div className="flex-1 bg-muted/20 flex justify-center overflow-auto">
            <div 
              className="bg-white shadow-lg h-full"
              style={{ 
                width: previewWidth,
                maxWidth: '100%',
              }}
            >
              {previewClickToSelect ? (
                // Interactive preview - click to select element
                <div className="p-6 min-h-full">
                  {customCss && <style>{customCss}</style>}
                  {elements.map((element) => (
                    <HtmlElementRenderer
                      key={element.id}
                      element={element}
                      selectedId={selectedElementId}
                      hoveredId={hoveredId}
                      onSelect={(el) => {
                        handleSelect(el);
                        setActiveTab('visual'); // Switch to visual editor
                      }}
                      onHover={setHoveredId}
                      isEditMode={false}
                      showOutlines={false}
                    />
                  ))}
                </div>
              ) : (
                // Clean iframe preview
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
                      ${previewHtml}
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
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
