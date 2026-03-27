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
    // Prevent duplicate views in the same session
    if (viewId.current) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const { data, error } = await supabase
      .from('auto_webinar_views' as any)
      .insert({
        video_id: vid,
        user_id: userId,
        session_id: sessionId.current,
        is_guest: isGuest || !userId,
        guest_email: guestEmail || null,
        guest_registration_id: guestRegistrationId || null,
      })
      .select('id')
      .single();

    if (!error && data) {
      viewId.current = (data as any).id;
      startTime.current = Date.now();
    }
  }, [isGuest, guestEmail, guestRegistrationId]);

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
