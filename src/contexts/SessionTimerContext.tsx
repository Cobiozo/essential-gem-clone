import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { STAGE6_NO_CLOCKS } from '@/lib/stage6Flags';

type Listener = () => void;

interface SessionTimerContextValue {
  /** Stable getter for the current countdown (seconds). Does NOT trigger re-renders. */
  getTimeRemaining: () => number;
  /** Subscribe to countdown ticks. Used by leaf components only. */
  subscribeTimeRemaining: (listener: Listener) => () => void;
  onRefreshTimer: () => void;
  isProtectedRoute: boolean;
}

const SessionTimerContext = createContext<SessionTimerContextValue | null>(null);

export const SessionTimerProvider: React.FC<{
  timeRemaining: number;
  onRefreshTimer: () => void;
  isProtectedRoute: boolean;
  children: React.ReactNode;
}> = ({ timeRemaining, onRefreshTimer, isProtectedRoute, children }) => {
  const timeRef = useRef(timeRemaining);
  const listenersRef = useRef<Set<Listener>>(new Set());

  // Keep the ref in sync and notify only subscribed leaf components.
  useEffect(() => {
    timeRef.current = timeRemaining;
    listenersRef.current.forEach(l => l());
  }, [timeRemaining]);

  const getTimeRemaining = useCallback(() => timeRef.current, []);
  const subscribeTimeRemaining = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  // Value is stable across countdown ticks — it only changes when the reset
  // callback identity or the protected-route flag changes.
  const value = useMemo<SessionTimerContextValue>(
    () => ({ getTimeRemaining, subscribeTimeRemaining, onRefreshTimer, isProtectedRoute }),
    [getTimeRemaining, subscribeTimeRemaining, onRefreshTimer, isProtectedRoute]
  );

  return (
    <SessionTimerContext.Provider value={value}>
      {children}
    </SessionTimerContext.Provider>
  );
};

/** Stable API: reset function + protected-route flag. Never re-renders on ticks. */
export const useSessionTimer = () => {
  const ctx = useContext(SessionTimerContext);
  if (!ctx) return null;
  return ctx;
};

/** Subscribes to the 1s countdown. Use ONLY in leaf components that display it. */
export const useSessionTimeRemaining = (): number => {
  const ctx = useContext(SessionTimerContext);
  // STAGE6 DIAGNOSTIC: ?stage6NoClocks=1 stops the countdown subscription only.
  const subscribe = STAGE6_NO_CLOCKS
    ? (() => () => {})
    : ctx?.subscribeTimeRemaining ?? (() => () => {});
  const getSnapshot = ctx?.getTimeRemaining ?? (() => 0);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
