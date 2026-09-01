import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Keeps `profiles.last_seen_at` fresh for online-status detection.
 *
 * Online threshold used across the app (UserStatistics, chat e-mail fallback)
 * is 5 minutes, so writes are throttled to one every 4 minutes — safely below
 * the threshold while halving the DB writes vs. the previous 2-minute timer.
 * Writes only happen while the tab is visible and are skipped entirely when
 * nothing changed since the last successful update within the throttle window.
 */
const WRITE_THROTTLE_MS = 4 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

export const useLastSeenUpdater = () => {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastWriteRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const updateLastSeen = async (force = false) => {
      if (document.hidden) return;
      const now = Date.now();
      if (!force && now - lastWriteRef.current < WRITE_THROTTLE_MS) return;
      lastWriteRef.current = now;

      try {
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch (error) {
        if (!cancelled) console.warn('[LastSeenUpdater] Failed to update:', error);
      }
    };

    const handleVisibilityChange = () => {
      // Coming back to the tab: refresh only if the throttle window elapsed
      if (!document.hidden) updateLastSeen();
    };

    // Initial write on mount
    updateLastSeen(true);

    intervalRef.current = setInterval(() => updateLastSeen(), CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);
};
