import { useEffect, useRef } from 'react';
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
  
  // Stable refs for callbacks to avoid re-creating timers
  const onLogoutRef = useRef(onLogout);
  const navigateRef = useRef(navigate);
  const toastRef = useRef(toast);
  
  // Update refs on each render
  onLogoutRef.current = onLogout;
  navigateRef.current = navigate;
  toastRef.current = toast;

  useEffect(() => {
    if (!enabled) return;

    const handleLogout = async () => {
      console.log('[useInactivityTimeout] Logging out due to inactivity');
      
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('[useInactivityTimeout] Error during signOut:', error);
      }
      
      onLogoutRef.current?.();
      navigateRef.current('/auth', { replace: true });
      
      toastRef.current({
        title: 'Sesja wygasła',
        description: 'Zostałeś wylogowany z powodu braku aktywności.',
        variant: 'default',
      });
    };

    const showWarning = () => {
      if (warningShownRef.current) return;
      warningShownRef.current = true;
      
      toastRef.current({
        title: 'Ostrzeżenie o sesji',
        description: 'Za 5 minut zostaniesz wylogowany z powodu braku aktywności. Kliknij gdziekolwiek, aby pozostać zalogowanym.',
        duration: 10000,
      });
    };

    const resetTimer = () => {
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
    };

    // Events that indicate user activity (no mousemove - only actual interactions)
    const activityEvents = [
      'mousedown',
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
  }, [enabled]);

  return {
    lastActivity: lastActivityRef.current,
  };
};

export default useInactivityTimeout;
