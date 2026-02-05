import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to update user's last_seen_at timestamp every 2 minutes when app is active.
 * Used to determine if user is online for notification delivery.
 */
export const useLastSeenUpdater = () => {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const updateLastSeen = async () => {
      // Only update when tab is visible
      if (document.hidden) return;

      try {
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch (error) {
        console.warn('[LastSeenUpdater] Failed to update:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible - update immediately
        updateLastSeen();
      }
    };

    // Initial update
    updateLastSeen();

    // Update every 2 minutes
    intervalRef.current = setInterval(updateLastSeen, 2 * 60 * 1000);

    // Also update when tab becomes visible
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);
};
