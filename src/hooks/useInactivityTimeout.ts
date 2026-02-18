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
  const isMeetingActiveRef = useRef(false);
  
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
      if (isMeetingActiveRef.current) {
        console.log('[useInactivityTimeout] Meeting active, skipping logout');
        resetTimer();
        return;
      }
      console.log('[useInactivityTimeout] Logging out due to inactivity');
      
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('[useInactivityTimeout] Error during signOut:', error);
      }
      
      onLogoutRef.current?.();
      
      // Zapisz komunikat o wygaśnięciu sesji do wyświetlenia po przeładowaniu
      sessionStorage.setItem('session_expired_message', 'true');
      
      // Użyj twardego przeładowania zamiast React Router navigate
      // To gwarantuje pełny reset stanu aplikacji i pewne przekierowanie
      window.location.href = '/auth';
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
        // Never logout during an active meeting
        if (isMeetingActiveRef.current) {
          resetTimer();
          return;
        }
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        
        // Add 1-minute buffer to prevent immediate logout on tab return
        const timeoutWithBuffer = INACTIVITY_TIMEOUT_MS + 60000;
        
        // If user was away longer than timeout + buffer, logout immediately
        if (timeSinceLastActivity >= timeoutWithBuffer) {
          handleLogout();
        } else {
          resetTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle video activity events (emitted by SecureMedia during video playback)
    const handleVideoActivity = () => {
      console.log('[useInactivityTimeout] Video activity detected, resetting timer');
      resetTimer();
    };
    window.addEventListener('video-activity', handleVideoActivity);

    // Handle meeting active/ended events
    const handleMeetingActive = () => {
      console.log('[useInactivityTimeout] Meeting active, disabling logout');
      isMeetingActiveRef.current = true;
      resetTimer();
    };
    const handleMeetingEnded = () => {
      console.log('[useInactivityTimeout] Meeting ended, re-enabling logout');
      isMeetingActiveRef.current = false;
      resetTimer();
    };
    window.addEventListener('meeting-active', handleMeetingActive);
    window.addEventListener('meeting-ended', handleMeetingEnded);

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
      window.removeEventListener('video-activity', handleVideoActivity);
      window.removeEventListener('meeting-active', handleMeetingActive);
      window.removeEventListener('meeting-ended', handleMeetingEnded);
    };
  }, [enabled]);

  return {
    lastActivity: lastActivityRef.current,
  };
};

export default useInactivityTimeout;
