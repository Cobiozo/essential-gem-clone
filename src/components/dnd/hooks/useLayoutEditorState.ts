import { useState, useCallback, useRef } from 'react';
import { CMSSection, CMSItem } from '@/types/cms';

interface Column {
  id: string;
  items: CMSItem[];
  width?: number;
}

interface HistoryState {
  sections: CMSSection[];
  items: CMSItem[];
}

export interface LayoutEditorState {
  sections: CMSSection[];
  items: CMSItem[];
  loading: boolean;
  editMode: boolean;
  activeId: string | null;
  selectedElement: string | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  autoSaveStatus: 'saved' | 'saving' | 'error';
  layoutMode: 'single' | 'columns' | 'grid';
  columnCount: number;
  expandedItemId: string | null;
  panelMode: 'elements' | 'properties';
  sectionColumns: { [sectionId: string]: Column[] };
  openSections: Record<string, boolean>;
  history: HistoryState[];
  historyIndex: number;
}

export interface LayoutEditorActions {
  setSections: (sections: CMSSection[] | ((prev: CMSSection[]) => CMSSection[])) => void;
  setItems: (items: CMSItem[] | ((prev: CMSItem[]) => CMSItem[])) => void;
  setLoading: (loading: boolean) => void;
  setEditMode: (editMode: boolean) => void;
  setActiveId: (id: string | null) => void;
  setSelectedElement: (id: string | null) => void;
  setIsSaving: (saving: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setAutoSaveStatus: (status: 'saved' | 'saving' | 'error') => void;
  setLayoutMode: (mode: 'single' | 'columns' | 'grid') => void;
  setColumnCount: (count: number) => void;
  setExpandedItemId: (id: string | null) => void;
  setPanelMode: (mode: 'elements' | 'properties') => void;
  setSectionColumns: (columns: { [sectionId: string]: Column[] }) => void;
  setOpenSections: (sections: Record<string, boolean>) => void;
  saveToHistory: (sections: CMSSection[], items: CMSItem[]) => void;
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  canUndo: boolean;
  canRedo: boolean;
}

export const useLayoutEditorState = (): [LayoutEditorState, LayoutEditorActions] => {
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [layoutMode, setLayoutMode] = useState<'single' | 'columns' | 'grid'>('single');
  const [columnCount, setColumnCount] = useState(2);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'elements' | 'properties'>('elements');
  const [sectionColumns, setSectionColumns] = useState<{ [sectionId: string]: Column[] }>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = useCallback((newSections: CMSSection[], newItems: CMSItem[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ sections: newSections, items: newItems });
      return newHistory.slice(-20);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const undo = useCallback((): HistoryState | null => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [history, historyIndex]);

  const redo = useCallback((): HistoryState | null => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [history, historyIndex]);

  const state: LayoutEditorState = {
    sections,
    items,
    loading,
    editMode,
    activeId,
    selectedElement,
    isSaving,
    hasUnsavedChanges,
    autoSaveStatus,
    layoutMode,
    columnCount,
    expandedItemId,
    panelMode,
    sectionColumns,
    openSections,
    history,
    historyIndex,
  };

  const actions: LayoutEditorActions = {
    setSections,
    setItems,
    setLoading,
    setEditMode,
    setActiveId,
    setSelectedElement,
    setIsSaving,
    setHasUnsavedChanges,
    setAutoSaveStatus,
    setLayoutMode,
    setColumnCount,
    setExpandedItemId,
    setPanelMode,
    setSectionColumns,
    setOpenSections,
    saveToHistory,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };

  return [state, actions];
};
