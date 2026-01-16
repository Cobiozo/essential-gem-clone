import { useState, useCallback, useEffect } from 'react';

export interface WidgetConfig {
  id: string;
  position: number;
  isVisible: boolean;
}

const STORAGE_KEY = 'dashboard_widgets_order';
const WIDGET_ORDER_CHANGE_EVENT = 'dashboardWidgetOrderChange';

// Default widget order
const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'calendar', position: 0, isVisible: true },
  { id: 'myMeetings', position: 1, isVisible: true },
  { id: 'trainingProgress', position: 2, isVisible: true },
  { id: 'notifications', position: 3, isVisible: true },
  { id: 'activeOtpCodes', position: 4, isVisible: true },
  { id: 'resources', position: 5, isVisible: true },
  { id: 'teamContacts', position: 6, isVisible: true },
  { id: 'reflinks', position: 7, isVisible: true },
  { id: 'infoLinks', position: 8, isVisible: true },
  { id: 'activeUsers', position: 9, isVisible: true },
];

const loadWidgetsFromStorage = (): WidgetConfig[] => {
  if (typeof window === 'undefined') return DEFAULT_WIDGETS;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_WIDGETS;
    
    const parsed = JSON.parse(stored) as WidgetConfig[];
    
    // Validate and merge with defaults (handle new widgets)
    const storedIds = new Set(parsed.map(w => w.id));
    const missingWidgets = DEFAULT_WIDGETS.filter(w => !storedIds.has(w.id));
    
    // Add missing widgets at the end
    const merged = [...parsed, ...missingWidgets.map((w, i) => ({
      ...w,
      position: parsed.length + i
    }))];
    
    return merged.sort((a, b) => a.position - b.position);
  } catch {
    return DEFAULT_WIDGETS;
  }
};

export const useDashboardWidgets = () => {
  const [widgets, setWidgetsState] = useState<WidgetConfig[]>(loadWidgetsFromStorage);

  // Save to localStorage
  const setWidgets = useCallback((newWidgets: WidgetConfig[] | ((prev: WidgetConfig[]) => WidgetConfig[])) => {
    setWidgetsState(prev => {
      const resolved = typeof newWidgets === 'function' ? newWidgets(prev) : newWidgets;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
      window.dispatchEvent(new CustomEvent(WIDGET_ORDER_CHANGE_EVENT, { detail: resolved }));
      return resolved;
    });
  }, []);

  // Move widget to new position
  const moveWidget = useCallback((widgetId: string, newPosition: number) => {
    setWidgets(prev => {
      const widget = prev.find(w => w.id === widgetId);
      if (!widget) return prev;

      const oldPosition = widget.position;
      if (oldPosition === newPosition) return prev;

      return prev.map(w => {
        if (w.id === widgetId) {
          return { ...w, position: newPosition };
        }
        // Shift other widgets
        if (oldPosition < newPosition) {
          // Moving down - shift items up
          if (w.position > oldPosition && w.position <= newPosition) {
            return { ...w, position: w.position - 1 };
          }
        } else {
          // Moving up - shift items down
          if (w.position >= newPosition && w.position < oldPosition) {
            return { ...w, position: w.position + 1 };
          }
        }
        return w;
      }).sort((a, b) => a.position - b.position);
    });
  }, [setWidgets]);

  // Toggle widget visibility
  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    setWidgets(prev => 
      prev.map(w => 
        w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w
      )
    );
  }, [setWidgets]);

  // Reset to default order
  const resetToDefault = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
  }, [setWidgets]);

  // Reorder widgets (for drag & drop)
  const reorderWidgets = useCallback((activeId: string, overId: string) => {
    setWidgets(prev => {
      const oldIndex = prev.findIndex(w => w.id === activeId);
      const newIndex = prev.findIndex(w => w.id === overId);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      const newWidgets = [...prev];
      const [movedWidget] = newWidgets.splice(oldIndex, 1);
      newWidgets.splice(newIndex, 0, movedWidget);
      
      // Update positions
      return newWidgets.map((w, index) => ({ ...w, position: index }));
    });
  }, [setWidgets]);

  // Sync with localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setWidgetsState(JSON.parse(e.newValue));
        } catch { /* ignore parse errors */ }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync with custom event for same-tab changes
  useEffect(() => {
    const handleOrderChange = (e: CustomEvent<WidgetConfig[]>) => {
      setWidgetsState(e.detail);
    };
    window.addEventListener(WIDGET_ORDER_CHANGE_EVENT, handleOrderChange as EventListener);
    return () => window.removeEventListener(WIDGET_ORDER_CHANGE_EVENT, handleOrderChange as EventListener);
  }, []);

  // Get visible widgets sorted by position
  const visibleWidgets = widgets.filter(w => w.isVisible).sort((a, b) => a.position - b.position);
  
  // Get widget IDs in order for DnD
  const widgetIds = visibleWidgets.map(w => w.id);

  return {
    widgets,
    visibleWidgets,
    widgetIds,
    moveWidget,
    toggleWidgetVisibility,
    resetToDefault,
    reorderWidgets,
  };
};
