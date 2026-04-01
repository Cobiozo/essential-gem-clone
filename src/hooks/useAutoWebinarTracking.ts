import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Tracks auto-webinar view sessions.
 * Logs join time on mount, updates watch_duration periodically,
 * and sets left_at on unmount.
 */
export function useAutoWebinarTracking(
  videoId: string | null,
  isPlaying: boolean,
  isGuest: boolean = false,
  guestEmail: string | null = null,
  guestRegistrationId: string | null = null,
  category: string = 'business_opportunity'
) {
  const viewId = useRef<string | null>(null);
  const creatingRef = useRef(false);
  // Use refs for guest data to avoid stale closures
  const guestEmailRef = useRef(guestEmail);
  const guestRegistrationIdRef = useRef(guestRegistrationId);
  const isGuestRef = useRef(isGuest);

  // Keep refs in sync
  guestEmailRef.current = guestEmail;
  guestRegistrationIdRef.current = guestRegistrationId;
  isGuestRef.current = isGuest;

  // Persist sessionId in localStorage so returning guests are recognized
  const sessionId = useRef<string>('');
  if (!sessionId.current) {
    const storageKey = `aw_session_${category}_${guestEmail || 'user'}_${new Date().toISOString().slice(0, 10)}`;
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      sessionId.current = existing;
    } else {
      const newId = crypto.randomUUID();
      sessionId.current = newId;
      try { localStorage.setItem(storageKey, newId); } catch {}
    }
  }
  const startTime = useRef<number>(0);
  const updateInterval = useRef<ReturnType<typeof setInterval>>();

  const createView = useCallback(async (vid: string) => {
    // Prevent duplicate views in the same session (mutex for concurrent calls)
    if (viewId.current || creatingRef.current) return;
    creatingRef.current = true;

    try {
      // Skip getUser() for guests — they have no auth session
      let userId: string | null = null;
      if (!isGuestRef.current) {
        const { data: userData } = await supabase.auth.getUser();
        userId = userData?.user?.id || null;
      }

      const { data, error } = await supabase
        .from('auto_webinar_views' as any)
        .insert({
          video_id: vid,
          user_id: userId,
          session_id: sessionId.current,
          is_guest: isGuestRef.current || !userId,
          guest_email: guestEmailRef.current || null,
          guest_registration_id: guestRegistrationIdRef.current || null,
        })
        .select('id')
        .single();

      if (!error && data) {
        viewId.current = (data as any).id;
        startTime.current = Date.now();
        console.log('[AutoWebinarTracking] View created:', viewId.current, {
          isGuest: isGuestRef.current,
          guestEmail: guestEmailRef.current,
          guestRegistrationId: guestRegistrationIdRef.current,
        });

        // Retry linking guest_registration_id if it wasn't available at INSERT time
        if (!guestRegistrationIdRef.current) {
          setTimeout(() => {
            if (guestRegistrationIdRef.current && viewId.current) {
              console.log('[AutoWebinarTracking] Delayed linking guestRegistrationId:', guestRegistrationIdRef.current);
              supabase
                .from('auto_webinar_views' as any)
                .update({ guest_registration_id: guestRegistrationIdRef.current })
                .eq('id', viewId.current)
                .then(({ error: linkErr }) => {
                  if (linkErr) console.error('[AutoWebinarTracking] Delayed link failed:', linkErr);
                });
            }
          }, 3000);
        }
      } else if (error) {
        console.error('[AutoWebinarTracking] Failed to create view:', error);
      }
    } catch (err) {
      console.error('[AutoWebinarTracking] Exception in createView:', err);
    } finally {
      creatingRef.current = false;
    }
  }, []);

  // Update view with guestRegistrationId when it resolves after view creation
  useEffect(() => {
    if (!guestRegistrationId) return;

    const tryLink = () => {
      if (viewId.current) {
        console.log('[AutoWebinarTracking] Updating view with guestRegistrationId:', guestRegistrationId);
        supabase
          .from('auto_webinar_views' as any)
          .update({ guest_registration_id: guestRegistrationId })
          .eq('id', viewId.current)
          .then(({ error }) => {
            if (error) {
              console.error('[AutoWebinarTracking] Failed to update guest_registration_id:', error);
            }
          });
      } else {
        // viewId not ready yet — retry after short delay
        console.log('[AutoWebinarTracking] viewId not ready, retrying link in 2s...');
        setTimeout(tryLink, 2000);
      }
    };

    tryLink();
  }, [guestRegistrationId]);

  const updateDuration = useCallback(async () => {
    if (!viewId.current || !startTime.current) return;
    const seconds = Math.floor((Date.now() - startTime.current) / 1000);
    await supabase
      .from('auto_webinar_views' as any)
      .update({ watch_duration_seconds: seconds })
      .eq('id', viewId.current);
  }, []);

  const endView = useCallback(async () => {
    if (!viewId.current) return;
    const seconds = Math.floor((Date.now() - startTime.current) / 1000);
    await supabase
      .from('auto_webinar_views' as any)
      .update({
        left_at: new Date().toISOString(),
        watch_duration_seconds: seconds,
      })
      .eq('id', viewId.current);
    viewId.current = null;
  }, []);

  useEffect(() => {
    if (!videoId || !isPlaying) return;

    createView(videoId);

    // Update duration every 30s
    updateInterval.current = setInterval(updateDuration, 30000);

    return () => {
      clearInterval(updateInterval.current);
      endView();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, isPlaying]);

  // Handle page unload — use sendBeacon with proper Supabase headers
  useEffect(() => {
    const handleUnload = () => {
      if (viewId.current && startTime.current) {
        const seconds = Math.floor((Date.now() - startTime.current) / 1000);
        const payload = JSON.stringify({
          watch_duration_seconds: seconds,
          left_at: new Date().toISOString(),
        });
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/auto_webinar_views?id=eq.${viewId.current}`;
        // sendBeacon only supports POST, so we use the Supabase REST override header
        const headers = {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Prefer': 'return=minimal',
          'X-HTTP-Method-Override': 'PATCH',
        };
        const blob = new Blob([payload], { type: 'application/json' });
        // Try fetch keepalive first (supports PATCH), fallback to sendBeacon
        try {
          fetch(url, {
            method: 'PATCH',
            headers,
            body: payload,
            keepalive: true,
          });
        } catch {
          navigator.sendBeacon?.(url, blob);
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);
}
