import React, { useState, useCallback, useEffect } from 'react';
import { ParsedElement } from './types';
import { parseHtmlToElements } from './hooks/useHtmlParser';
import { serializeElementsToHtml } from './hooks/useHtmlSerializer';
import { HtmlElementRenderer } from './HtmlElementRenderer';
import { HtmlPropertiesPanel } from './HtmlPropertiesPanel';
import { HtmlElementToolbar } from './HtmlElementToolbar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, Eye, EyeOff, Code } from 'lucide-react';

interface HtmlVisualEditorProps {
  htmlContent: string;
  customCss?: string;
  onChange: (html: string) => void;
}

export const HtmlVisualEditor: React.FC<HtmlVisualEditorProps> = ({
  htmlContent,
  customCss,
  onChange
}) => {
  const [elements, setElements] = useState<ParsedElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<ParsedElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showOutlines, setShowOutlines] = useState(true);
  const { toast } = useToast();
  
  // Parse HTML on mount and when htmlContent changes
  useEffect(() => {
    const parsed = parseHtmlToElements(htmlContent);
    setElements(parsed);
    
    // Initialize history
    if (history.length === 0) {
      setHistory([htmlContent]);
      setHistoryIndex(0);
    }
  }, [htmlContent]);
  
  // Save to history
  const saveToHistory = useCallback((html: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(html);
      // Limit history to 50 entries
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
      onChange(html);
    }
  }, [historyIndex, history, onChange]);
  
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
        // Create a deep copy with new IDs
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
  
  // Move element up/down
  const moveElement = useCallback((elements: ParsedElement[], id: string, direction: 'up' | 'down'): ParsedElement[] => {
    const result = [...elements];
    const index = result.findIndex(el => el.id === id);
    
    if (index !== -1) {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < result.length) {
        [result[index], result[newIndex]] = [result[newIndex], result[index]];
      }
    } else {
      // Check in children
      return result.map(el => ({
        ...el,
        children: moveElement(el.children, id, direction)
      }));
    }
    
    return result;
  }, []);
  
  // Add new element
  const addElement = useCallback((html: string, position: 'before' | 'after' | 'inside' = 'after') => {
    const newElements = parseHtmlToElements(html);
    if (newElements.length === 0) return;
    
    let updatedElements: ParsedElement[];
    
    if (!selectedElement) {
      // No selection - add at the end
      updatedElements = [...elements, ...newElements];
    } else if (position === 'inside') {
      // Add inside selected element
      updatedElements = updateElementById(elements, selectedElement.id, {
        children: [...selectedElement.children, ...newElements]
      });
    } else {
      // Add before/after selected element
      const parent = findParentElement(elements, selectedElement.id);
      
      if (parent) {
        // Element has a parent - insert into parent's children
        const childIndex = parent.children.findIndex(c => c.id === selectedElement.id);
        const insertIndex = position === 'before' ? childIndex : childIndex + 1;
        const newChildren = [...parent.children];
        newChildren.splice(insertIndex, 0, ...newElements);
        
        updatedElements = updateElementById(elements, parent.id, { children: newChildren });
      } else {
        // Top-level element
        const index = elements.findIndex(el => el.id === selectedElement.id);
        const insertIndex = position === 'before' ? index : index + 1;
        updatedElements = [...elements];
        updatedElements.splice(insertIndex, 0, ...newElements);
      }
    }
    
    setElements(updatedElements);
    const newHtml = serializeElementsToHtml(updatedElements);
    saveToHistory(newHtml);
    onChange(newHtml);
    
    // Select the new element
    setSelectedElement(newElements[0]);
    
    toast({
      title: "Element dodany",
      description: "Nowy element został dodany do dokumentu."
    });
  }, [elements, selectedElement, updateElementById, findParentElement, saveToHistory, onChange, toast]);
  
  // Handle element selection
  const handleSelect = useCallback((element: ParsedElement) => {
    setSelectedElement(element);
  }, []);
  
  // Handle element update
  const handleUpdate = useCallback((updates: Partial<ParsedElement>) => {
    if (!selectedElement) return;
    
    const updatedElements = updateElementById(elements, selectedElement.id, updates);
    setElements(updatedElements);
    
    // Update selected element reference
    const updatedSelected = findElementById(updatedElements, selectedElement.id);
    setSelectedElement(updatedSelected);
    
    // Serialize and emit change
    const newHtml = serializeElementsToHtml(updatedElements);
    saveToHistory(newHtml);
    onChange(newHtml);
  }, [elements, selectedElement, updateElementById, findElementById, saveToHistory, onChange]);
  
  // Handle element deletion
  const handleDelete = useCallback(() => {
    if (!selectedElement) return;
    
    const updatedElements = deleteElementById(elements, selectedElement.id);
    setElements(updatedElements);
    setSelectedElement(null);
    
    const newHtml = serializeElementsToHtml(updatedElements);
    saveToHistory(newHtml);
    onChange(newHtml);
    
    toast({
      title: "Element usunięty",
      description: "Element został usunięty z dokumentu."
    });
  }, [elements, selectedElement, deleteElementById, saveToHistory, onChange, toast]);
  
  // Handle element duplication
  const handleDuplicate = useCallback(() => {
    if (!selectedElement) return;
    
    const updatedElements = duplicateElementById(elements, selectedElement.id);
    setElements(updatedElements);
    
    const newHtml = serializeElementsToHtml(updatedElements);
    saveToHistory(newHtml);
    onChange(newHtml);
    
    toast({
      title: "Element zduplikowany",
      description: "Kopia elementu została dodana."
    });
  }, [elements, selectedElement, duplicateElementById, saveToHistory, onChange, toast]);
  
  // Handle move up
  const handleMoveUp = useCallback(() => {
    if (!selectedElement) return;
    
    const updatedElements = moveElement(elements, selectedElement.id, 'up');
    setElements(updatedElements);
    
    const newHtml = serializeElementsToHtml(updatedElements);
    saveToHistory(newHtml);
    onChange(newHtml);
  }, [elements, selectedElement, moveElement, saveToHistory, onChange]);
  
  // Handle move down
  const handleMoveDown = useCallback(() => {
    if (!selectedElement) return;
    
    const updatedElements = moveElement(elements, selectedElement.id, 'down');
    setElements(updatedElements);
    
    const newHtml = serializeElementsToHtml(updatedElements);
    saveToHistory(newHtml);
    onChange(newHtml);
  }, [elements, selectedElement, moveElement, saveToHistory, onChange]);
  
  // Handle close panel
  const handleClosePanel = useCallback(() => {
    setSelectedElement(null);
  }, []);
  
  return (
    <div className="h-full flex flex-col min-h-[600px]">
      {/* Top toolbar */}
      <div className="border-b">
        <div className="flex items-center justify-between p-2 bg-muted/30">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Cofnij</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo2 className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Ponów</span>
            </Button>
            <div className="h-6 w-px bg-border mx-1" />
            <Button
              variant={showOutlines ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2 gap-1"
              onClick={() => setShowOutlines(!showOutlines)}
            >
              {showOutlines ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden sm:inline text-xs">Kontury</span>
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {elements.length} elementów • Historia: {historyIndex + 1}/{history.length}
          </div>
        </div>
        
        {/* Element toolbar */}
        <HtmlElementToolbar
          onAddElement={addElement}
          hasSelection={!!selectedElement}
        />
      </div>
      
      {/* Main content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Preview Panel */}
        <ResizablePanel defaultSize={selectedElement ? 60 : 100} minSize={40}>
          <ScrollArea className="h-full">
            <div className="p-4">
              {/* Custom CSS */}
              {customCss && <style>{customCss}</style>}
              
              {/* Render elements */}
              <div 
                className={`space-y-1 html-preview-container ${showOutlines ? 'show-outlines' : ''}`}
                style={{ 
                  // Add outline styles when showOutlines is true
                  ...(showOutlines && {
                    '--outline-color': 'hsl(var(--primary) / 0.3)',
                    '--outline-hover-color': 'hsl(var(--primary) / 0.5)',
                    '--outline-selected-color': 'hsl(var(--primary))',
                  } as React.CSSProperties)
                }}
              >
                {elements.length === 0 ? (
                  <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                    <Code className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">Brak elementów do wyświetlenia</p>
                    <p className="text-sm mb-4">Użyj paska narzędzi powyżej, aby dodać elementy</p>
                    <p className="text-xs text-muted-foreground">
                      lub dodaj kod HTML w zakładce "Edytor"
                    </p>
                  </div>
                ) : (
                  elements.map((element) => (
                    <HtmlElementRenderer
                      key={element.id}
                      element={element}
                      selectedId={selectedElement?.id || null}
                      hoveredId={hoveredId}
                      onSelect={handleSelect}
                      onHover={setHoveredId}
                      showOutlines={showOutlines}
                    />
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </ResizablePanel>
        
        {/* Properties Panel */}
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
    </div>
  );
};
