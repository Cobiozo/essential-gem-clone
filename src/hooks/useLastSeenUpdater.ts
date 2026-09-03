import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Etap 3 — utrzymuje `profiles.last_seen_at` dla statusu online/offline.
 *
 * Próg "online" używany w aplikacji (UserStatistics, fallback e-mail czatu) to
 * 5 minut, dlatego zapis następuje maksymalnie raz na 4 minuty — bezpiecznie
 * poniżej progu, ale bez ślepego timera piszącego do bazy co minutę.
 *
 * Zasady:
 * - zapis jest wyzwalany REALNĄ aktywnością użytkownika (pointer, klawiatura,
 *   scroll, powrót do karty) + throttle 4 min,
 * - rzadki heartbeat (co 4 min) działa tylko wtedy, gdy karta jest widoczna
 *   ORAZ użytkownik był aktywny w ciągu ostatnich 15 minut — dzięki temu
 *   np. oglądanie wideo nie wypada offline, a karta zostawiona bezczynnie
 *   przestaje generować UPDATE-y,
 * - przy ukrytej karcie nie ma żadnych zapisów.
 */
const WRITE_THROTTLE_MS = 4 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000;
const ACTIVITY_WINDOW_MS = 15 * 60 * 1000;

export const useLastSeenUpdater = () => {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastWriteRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const write = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch (error) {
        if (!cancelled) console.warn('[LastSeenUpdater] Failed to update:', error);
      }
    };

    const maybeWrite = (force = false) => {
      if (document.hidden) return;
      const now = Date.now();
      if (!force && now - lastWriteRef.current < WRITE_THROTTLE_MS) return;
      lastWriteRef.current = now;
      void write();
    };

    // Realna aktywność użytkownika — throttlowana, więc listener jest tani.
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      maybeWrite();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) return;
      lastActivityRef.current = Date.now();
      maybeWrite();
    };

    // Fallback heartbeat: tylko przy widocznej karcie i niedawnej aktywności.
    const heartbeat = () => {
      if (document.hidden) return;
      if (Date.now() - lastActivityRef.current > ACTIVITY_WINDOW_MS) return;
      maybeWrite();
    };

    // Pierwszy zapis po zamontowaniu (wejście do aplikacji = aktywność).
    maybeWrite(true);

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll', 'focus'];
    activityEvents.forEach(evt =>
      window.addEventListener(evt, handleActivity, { passive: true } as AddEventListenerOptions),
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);
    intervalRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);
};
