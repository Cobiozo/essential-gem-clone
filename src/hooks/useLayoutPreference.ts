import { useState, useEffect, useCallback } from 'react';

export type LayoutMode = 'classic' | 'modern';

const STORAGE_KEY = 'ui-layout-mode';

export const useLayoutPreference = () => {
  const [layout, setLayoutState] = useState<LayoutMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored as LayoutMode) || 'classic';
    }
    return 'classic';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, layout);
  }, [layout]);

  const setLayout = useCallback((mode: LayoutMode) => {
    setLayoutState(mode);
  }, []);

  const toggleLayout = useCallback(() => {
    setLayoutState(prev => prev === 'classic' ? 'modern' : 'classic');
  }, []);

  return {
    layout,
    setLayout,
    toggleLayout,
    isModernLayout: layout === 'modern',
    isClassicLayout: layout === 'classic',
  };
};
