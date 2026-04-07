import React, { createContext, useContext, useState, useCallback } from 'react';

interface ChatSidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  openWithUser: (userId: string) => void;
  pendingUserId: string | null;
  clearPendingUser: () => void;
}

const ChatSidebarContext = createContext<ChatSidebarContextType | null>(null);

export const ChatSidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  
  const openWithUser = useCallback((userId: string) => {
    setPendingUserId(userId);
    setIsOpen(true);
  }, []);

  const clearPendingUser = useCallback(() => setPendingUserId(null), []);

  return (
    <ChatSidebarContext.Provider value={{ isOpen, toggle, open, close, openWithUser, pendingUserId, clearPendingUser }}>
      {children}
    </ChatSidebarContext.Provider>
  );
};

export const useChatSidebar = () => {
  const ctx = useContext(ChatSidebarContext);
  if (!ctx) throw new Error('useChatSidebar must be used within ChatSidebarProvider');
  return ctx;
};
