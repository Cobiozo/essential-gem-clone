import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  enabled: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onDeselect?: () => void;
  onSave?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onToggleEditMode?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  selectedElement?: string | null;
}

export const useKeyboardShortcuts = ({
  enabled,
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  onDeselect,
  onSave,
  onCopy,
  onPaste,
  onMoveUp,
  onMoveDown,
  onToggleEditMode,
  canUndo = false,
  canRedo = false,
  selectedElement,
}: KeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const isCtrlOrCmd = event.ctrlKey || event.metaKey;

    // Ctrl/Cmd + Z - Undo
    if (isCtrlOrCmd && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      if (canUndo && onUndo) {
        onUndo();
      }
      return;
    }

    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y - Redo
    if ((isCtrlOrCmd && event.key === 'z' && event.shiftKey) || (isCtrlOrCmd && event.key === 'y')) {
      event.preventDefault();
      if (canRedo && onRedo) {
        onRedo();
      }
      return;
    }

    // Ctrl/Cmd + S - Save
    if (isCtrlOrCmd && event.key === 's') {
      event.preventDefault();
      onSave?.();
      return;
    }

    // Ctrl/Cmd + D - Duplicate (when element selected)
    if (isCtrlOrCmd && event.key === 'd' && selectedElement) {
      event.preventDefault();
      onDuplicate?.();
      return;
    }

    // Ctrl/Cmd + C - Copy
    if (isCtrlOrCmd && event.key === 'c' && selectedElement) {
      event.preventDefault();
      onCopy?.();
      return;
    }

    // Ctrl/Cmd + V - Paste
    if (isCtrlOrCmd && event.key === 'v') {
      event.preventDefault();
      onPaste?.();
      return;
    }

    // Delete or Backspace - Delete selected element
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedElement) {
      event.preventDefault();
      onDelete?.();
      return;
    }

    // Escape - Deselect
    if (event.key === 'Escape') {
      event.preventDefault();
      onDeselect?.();
      return;
    }

    // Arrow Up - Move element up
    if (event.key === 'ArrowUp' && isCtrlOrCmd && selectedElement) {
      event.preventDefault();
      onMoveUp?.();
      return;
    }

    // Arrow Down - Move element down
    if (event.key === 'ArrowDown' && isCtrlOrCmd && selectedElement) {
      event.preventDefault();
      onMoveDown?.();
      return;
    }

    // Ctrl/Cmd + E - Toggle edit mode
    if (isCtrlOrCmd && event.key === 'e') {
      event.preventDefault();
      onToggleEditMode?.();
      return;
    }
  }, [
    enabled,
    canUndo,
    canRedo,
    selectedElement,
    onUndo,
    onRedo,
    onDelete,
    onDuplicate,
    onDeselect,
    onSave,
    onCopy,
    onPaste,
    onMoveUp,
    onMoveDown,
    onToggleEditMode,
  ]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
};

// Keyboard shortcuts help data
export const keyboardShortcuts = [
  { key: 'Ctrl + Z', action: 'Cofnij' },
  { key: 'Ctrl + Shift + Z', action: 'Ponów' },
  { key: 'Ctrl + S', action: 'Zapisz' },
  { key: 'Ctrl + D', action: 'Duplikuj element' },
  { key: 'Ctrl + C', action: 'Kopiuj element' },
  { key: 'Ctrl + V', action: 'Wklej element' },
  { key: 'Delete', action: 'Usuń element' },
  { key: 'Escape', action: 'Odznacz' },
  { key: 'Ctrl + ↑', action: 'Przesuń w górę' },
  { key: 'Ctrl + ↓', action: 'Przesuń w dół' },
  { key: 'Ctrl + E', action: 'Tryb edycji' },
];
