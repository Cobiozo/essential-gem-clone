import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface EditingContextType {
  isEditing: boolean;
  setEditing: (editing: boolean) => void;
  registerEdit: () => () => void;
}

const EditingContext = createContext<EditingContextType | null>(null);

// Global ref accessible for components outside the Provider (e.g., AuthContext, useNotifications)
// This allows checking editing state without using hooks
export const globalEditingStateRef = { current: false };

export const useEditing = () => {
  const context = useContext(EditingContext);
  if (!context) {
    throw new Error('useEditing must be used within EditingProvider');
  }
  return context;
};

// Safe hook that returns defaults when outside provider (for components that may render before provider)
export const useEditingSafe = () => {
  const context = useContext(EditingContext);
  if (!context) {
    return { isEditing: false, setEditing: () => {}, registerEdit: () => () => {} };
  }
  return context;
};

export const EditingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const editCountRef = useRef(0);
  const [isEditing, setIsEditing] = useState(false);

  // Sync global ref with state for components outside the provider
  useEffect(() => {
    globalEditingStateRef.current = isEditing;
  }, [isEditing]);

  const registerEdit = useCallback(() => {
    editCountRef.current += 1;
    setIsEditing(true);
    
    return () => {
      editCountRef.current -= 1;
      if (editCountRef.current <= 0) {
        editCountRef.current = 0;
        setIsEditing(false);
      }
    };
  }, []);

  const setEditing = useCallback((editing: boolean) => {
    if (editing) {
      editCountRef.current += 1;
    } else {
      editCountRef.current = Math.max(0, editCountRef.current - 1);
    }
    setIsEditing(editCountRef.current > 0);
  }, []);

  return (
    <EditingContext.Provider value={{ isEditing, setEditing, registerEdit }}>
      {children}
    </EditingContext.Provider>
  );
};
