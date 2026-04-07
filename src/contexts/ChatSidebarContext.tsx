import React, { createContext, useContext, useState, useCallback } from 'react';

export type ChatMode = 'closed' | 'docked' | 'floating';

interface FloatingPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ChatSidebarContextType {
  mode: ChatMode;
  isOpen: boolean;
  isDocked: boolean;
  isFloating: boolean;
  openDocked: () => void;
  openFloating: () => void;
  toggleDocked: () => void;
  close: () => void;
  toggle: () => void;
  open: () => void;
  openWithUser: (userId: string, targetMode?: ChatMode) => void;
  pendingUserId: string | null;
  clearPendingUser: () => void;
  floatingPosition: FloatingPosition;
  setFloatingPosition: (pos: Partial<FloatingPosition>) => void;
  isMinimized: boolean;
  setMinimized: (v: boolean) => void;
}

const ChatSidebarContext = createContext<ChatSidebarContextType | null>(null);

const DEFAULT_FLOATING: FloatingPosition = {
  x: window.innerWidth - 420,
  y: window.innerHeight - 520,
  width: 380,
  height: 480,
};

export const ChatSidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ChatMode>('closed');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [floatingPosition, setFloatingPos] = useState<FloatingPosition>(DEFAULT_FLOATING);
  const [isMinimized, setMinimized] = useState(false);

  const openDocked = useCallback(() => { setMode('docked'); setMinimized(false); }, []);
  const openFloating = useCallback(() => { setMode('floating'); setMinimized(false); }, []);
  const close = useCallback(() => { setMode('closed'); setMinimized(false); }, []);
  
  const toggleDocked = useCallback(() => {
    setMode(prev => prev === 'docked' ? 'closed' : 'docked');
    setMinimized(false);
  }, []);

  // Legacy compat
  const toggle = toggleDocked;
  const open = openDocked;

  const openWithUser = useCallback((userId: string, targetMode?: ChatMode) => {
    setPendingUserId(userId);
    setMode(targetMode || 'docked');
    setMinimized(false);
  }, []);

  const clearPendingUser = useCallback(() => setPendingUserId(null), []);

  const setFloatingPosition = useCallback((pos: Partial<FloatingPosition>) => {
    setFloatingPos(prev => ({ ...prev, ...pos }));
  }, []);

  const isOpen = mode !== 'closed';
  const isDocked = mode === 'docked';
  const isFloating = mode === 'floating';

  return (
    <ChatSidebarContext.Provider value={{
      mode, isOpen, isDocked, isFloating,
      openDocked, openFloating, toggleDocked, close, toggle, open,
      openWithUser, pendingUserId, clearPendingUser,
      floatingPosition, setFloatingPosition,
      isMinimized, setMinimized,
    }}>
      {children}
    </ChatSidebarContext.Provider>
  );
};

export const useChatSidebar = () => {
  const ctx = useContext(ChatSidebarContext);
  if (!ctx) throw new Error('useChatSidebar must be used within ChatSidebarProvider');
  return ctx;
};
