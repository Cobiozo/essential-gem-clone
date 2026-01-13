import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_LOGOUT_MS = 5 * 60 * 1000; // 5 minutes before logout

interface UseInactivityTimeoutOptions {
  enabled?: boolean;
  onLogout?: () => void;
}

export const useInactivityTimeout = (options: UseInactivityTimeoutOptions = {}) => {
  const { enabled = true, onLogout } = options;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    console.log('[useInactivityTimeout] Logging out due to inactivity');
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[useInactivityTimeout] Error during signOut:', error);
    }
    
    onLogout?.();
    navigate('/auth', { replace: true });
    
    toast({
      title: 'Sesja wygasła',
      description: 'Zostałeś wylogowany z powodu braku aktywności.',
      variant: 'default',
    });
  }, [navigate, toast, onLogout]);

  const showWarning = useCallback(() => {
    if (warningShownRef.current) return;
    warningShownRef.current = true;
    
    toast({
      title: 'Ostrzeżenie o sesji',
      description: 'Za 5 minut zostaniesz wylogowany z powodu braku aktywności. Kliknij gdziekolwiek, aby pozostać zalogowanym.',
      duration: 10000,
    });
  }, [toast]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timeout (5 min before logout)
    warningTimeoutRef.current = setTimeout(() => {
      showWarning();
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_LOGOUT_MS);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [handleLogout, showWarning]);

  useEffect(() => {
    if (!enabled) return;

    // Events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
    ];

    // Throttle activity detection to avoid too many timer resets
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledResetTimer = () => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
        resetTimer();
      }, 1000); // Only reset timer once per second max
    };

    // Initial timer setup
    resetTimer();

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, throttledResetTimer, { passive: true });
    });

    // Handle visibility change - reset timer when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        
        // If user was away longer than timeout, logout immediately
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
          handleLogout();
        } else {
          resetTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
      
      activityEvents.forEach((event) => {
        document.removeEventListener(event, throttledResetTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, resetTimer, handleLogout]);

  return {
    resetTimer,
    lastActivity: lastActivityRef.current,
  };
};

export default useInactivityTimeout;
