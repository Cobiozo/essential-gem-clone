import React, { useState, useCallback, useEffect } from 'react';
import { ParsedElement } from './types';
import { parseHtmlToElements } from './hooks/useHtmlParser';
import { serializeElementsToHtml } from './hooks/useHtmlSerializer';
import { HtmlElementRenderer } from './HtmlElementRenderer';
import { HtmlPropertiesPanel } from './HtmlPropertiesPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  
  // Parse HTML on mount and when htmlContent changes
  useEffect(() => {
    const parsed = parseHtmlToElements(htmlContent);
    setElements(parsed);
  }, [htmlContent]);
  
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
    onChange(newHtml);
  }, [elements, selectedElement, updateElementById, findElementById, onChange]);
  
  // Handle element deletion
  const handleDelete = useCallback(() => {
    if (!selectedElement) return;
    
    const updatedElements = deleteElementById(elements, selectedElement.id);
    setElements(updatedElements);
    setSelectedElement(null);
    
    const newHtml = serializeElementsToHtml(updatedElements);
    onChange(newHtml);
    
    toast({
      title: "Element usunięty",
      description: "Element został usunięty z dokumentu."
    });
  }, [elements, selectedElement, deleteElementById, onChange, toast]);
  
  // Handle element duplication
  const handleDuplicate = useCallback(() => {
    if (!selectedElement) return;
    
    const updatedElements = duplicateElementById(elements, selectedElement.id);
    setElements(updatedElements);
    
    const newHtml = serializeElementsToHtml(updatedElements);
    onChange(newHtml);
    
    toast({
      title: "Element zduplikowany",
      description: "Kopia elementu została dodana."
    });
  }, [elements, selectedElement, duplicateElementById, onChange, toast]);
  
  // Handle close panel
  const handleClosePanel = useCallback(() => {
    setSelectedElement(null);
  }, []);
  
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full min-h-[500px]">
      {/* Preview Panel */}
      <ResizablePanel defaultSize={selectedElement ? 65 : 100} minSize={40}>
        <ScrollArea className="h-full">
          <div className="p-4">
            {/* Custom CSS */}
            {customCss && <style>{customCss}</style>}
            
            {/* Render elements */}
            <div className="space-y-2 html-preview-container">
              {elements.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p>Brak elementów do wyświetlenia</p>
                  <p className="text-sm">Dodaj kod HTML w zakładce "Edytor"</p>
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
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
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
  );
};
