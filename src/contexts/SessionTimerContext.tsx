import React, { createContext, useContext } from 'react';

interface SessionTimerContextValue {
  timeRemaining: number;
  onRefreshTimer: () => void;
  isProtectedRoute: boolean;
}

const SessionTimerContext = createContext<SessionTimerContextValue | null>(null);

export const SessionTimerProvider: React.FC<{
  value: SessionTimerContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <SessionTimerContext.Provider value={value}>
    {children}
  </SessionTimerContext.Provider>
);

export const useSessionTimer = () => {
  const ctx = useContext(SessionTimerContext);
  if (!ctx) return null;
  return ctx;
};
