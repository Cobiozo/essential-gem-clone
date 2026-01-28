import { useEffect } from 'react';
import { useEditingSafe } from '@/contexts/EditingContext';

/**
 * Hook that automatically registers form editing state when a dialog/form is open.
 * This prevents page refreshes and navigation when switching browser tabs.
 * 
 * @param isOpen - Whether the dialog/form is currently open
 */
export const useFormProtection = (isOpen: boolean) => {
  const { setEditing } = useEditingSafe();

  useEffect(() => {
    if (isOpen) {
      setEditing(true);
      return () => setEditing(false);
    }
  }, [isOpen, setEditing]);
};

/**
 * Hook that registers multiple form states at once.
 * Useful when a component has multiple dialogs.
 * 
 * @param isOpenStates - Array of boolean states indicating open dialogs
 */
export const useMultiFormProtection = (...isOpenStates: boolean[]) => {
  const { setEditing } = useEditingSafe();
  const anyOpen = isOpenStates.some(Boolean);

  useEffect(() => {
    if (anyOpen) {
      setEditing(true);
      return () => setEditing(false);
    }
  }, [anyOpen, setEditing]);
};
