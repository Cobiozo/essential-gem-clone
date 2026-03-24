import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DIALOG_COUNTDOWN_S = 60; // 60 seconds to react

const PROTECTED_ROUTE_PATTERNS = [
  '/szkolenia/',
  '/skills-assessment',
  '/zdrowa-wiedza/',
  '/meeting-room/',
];

interface UseInactivityTimeoutOptions {
  enabled?: boolean;
  onLogout?: () => void;
  signOut?: () => Promise<void>;
  pathname?: string;
}

export const useInactivityTimeout = (options: UseInactivityTimeoutOptions = {}) => {
  const { enabled = true, onLogout, signOut, pathname = '' } = options;
  const navigate = useNavigate();

  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [dialogCountdown, setDialogCountdown] = useState(DIALOG_COUNTDOWN_S);
  const [timeRemaining, setTimeRemaining] = useState(INACTIVITY_TIMEOUT_MS / 1000);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const protectedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isMeetingActiveRef = useRef(false);

  const onLogoutRef = useRef(onLogout);
  const signOutRef = useRef(signOut);
  onLogoutRef.current = onLogout;
  signOutRef.current = signOut;

  const isProtectedRoute = PROTECTED_ROUTE_PATTERNS.some(p => pathname.includes(p));

  const handleLogout = useCallback(async () => {
    console.log('[useInactivityTimeout] Logging out due to inactivity');
    try {
      if (signOutRef.current) {
        await signOutRef.current();
      } else {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('[useInactivityTimeout] Error during signOut:', error);
    }
    onLogoutRef.current?.();
    sessionStorage.setItem('session_expired_message', 'true');
    window.location.href = '/auth';
  }, []);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    if (protectedIntervalRef.current) clearInterval(protectedIntervalRef.current);
    timeoutRef.current = null;
    countdownIntervalRef.current = null;
    tickIntervalRef.current = null;
    protectedIntervalRef.current = null;
  }, []);

  const startDialogCountdown = useCallback(() => {
    setShowSessionDialog(true);
    setDialogCountdown(DIALOG_COUNTDOWN_S);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setDialogCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [handleLogout]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setTimeRemaining(INACTIVITY_TIMEOUT_MS / 1000);
    setShowSessionDialog(false);
    setDialogCountdown(DIALOG_COUNTDOWN_S);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = null;

    timeoutRef.current = setTimeout(() => {
      if (isMeetingActiveRef.current) {
        console.log('[useInactivityTimeout] Meeting active, skipping dialog');
        resetTimer();
        return;
      }
      startDialogCountdown();
    }, INACTIVITY_TIMEOUT_MS);
  }, [startDialogCountdown]);

  const onContinueSession = useCallback(() => {
    console.log('[useInactivityTimeout] User chose to continue');
    resetTimer();
  }, [resetTimer]);

  const onConfirmLogout = useCallback(() => {
    console.log('[useInactivityTimeout] User chose to logout');
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    handleLogout();
  }, [handleLogout]);

  const onRefreshTimer = useCallback(() => {
    console.log('[useInactivityTimeout] Manual timer refresh');
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) return;

    // Tick interval to update timeRemaining display
    tickIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, Math.floor((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
      setTimeRemaining(remaining);
    }, 1000);

    const activityEvents = [
      'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel', 'mousemove',
    ];

    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledResetTimer = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
        resetTimer();
      }, 1000);
    };

    resetTimer();

    activityEvents.forEach(event => {
      document.addEventListener(event, throttledResetTimer, { passive: true });
    });

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (isMeetingActiveRef.current) {
          resetTimer();
          return;
        }
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
          startDialogCountdown();
        } else {
          resetTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleVideoActivity = () => {
      resetTimer();
    };
    window.addEventListener('video-activity', handleVideoActivity);

    const handleMeetingActive = () => {
      isMeetingActiveRef.current = true;
      resetTimer();
    };
    const handleMeetingEnded = () => {
      isMeetingActiveRef.current = false;
      resetTimer();
    };
    window.addEventListener('meeting-active', handleMeetingActive);
    window.addEventListener('meeting-ended', handleMeetingEnded);

    return () => {
      clearAllTimers();
      if (throttleTimeout) clearTimeout(throttleTimeout);
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledResetTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('video-activity', handleVideoActivity);
      window.removeEventListener('meeting-active', handleMeetingActive);
      window.removeEventListener('meeting-ended', handleMeetingEnded);
    };
  }, [enabled, resetTimer, startDialogCountdown, clearAllTimers]);

  // Protected route: auto-reset timer every 60s
  useEffect(() => {
    if (!enabled) return;
    if (protectedIntervalRef.current) {
      clearInterval(protectedIntervalRef.current);
      protectedIntervalRef.current = null;
    }
    if (isProtectedRoute) {
      console.log('[useInactivityTimeout] Protected route, auto-resetting timer');
      resetTimer();
      protectedIntervalRef.current = setInterval(() => {
        resetTimer();
      }, 60_000);
    }
    return () => {
      if (protectedIntervalRef.current) {
        clearInterval(protectedIntervalRef.current);
        protectedIntervalRef.current = null;
      }
    };
  }, [enabled, isProtectedRoute, resetTimer]);

  return {
    showSessionDialog,
    dialogCountdown,
    onContinueSession,
    onConfirmLogout,
    timeRemaining,
    onRefreshTimer,
    isProtectedRoute,
  };
};

export default useInactivityTimeout;
