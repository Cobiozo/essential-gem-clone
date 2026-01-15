import { useState, useCallback, useEffect } from 'react';

type DashboardView = 'classic' | 'modern';

const STORAGE_KEY = 'dashboard_view_preference';
const VIEW_CHANGE_EVENT = 'dashboardViewChange';

export const useDashboardPreference = () => {
  const [viewMode, setViewModeState] = useState<DashboardView>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored === 'classic' || stored === 'modern') ? stored : 'modern';
    }
    return 'modern';
  });

  const setViewMode = useCallback((mode: DashboardView) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    // Dispatch custom event for same-tab sync
    window.dispatchEvent(new CustomEvent(VIEW_CHANGE_EVENT, { detail: mode }));
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(viewMode === 'modern' ? 'classic' : 'modern');
  }, [viewMode, setViewMode]);

  // Sync with localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setViewModeState(e.newValue as DashboardView);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync with custom event for same-tab changes
  useEffect(() => {
    const handleViewChange = (e: CustomEvent<DashboardView>) => {
      setViewModeState(e.detail);
    };
    window.addEventListener(VIEW_CHANGE_EVENT, handleViewChange as EventListener);
    return () => window.removeEventListener(VIEW_CHANGE_EVENT, handleViewChange as EventListener);
  }, []);

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
    isModern: viewMode === 'modern',
    isClassic: viewMode === 'classic',
  };
};
