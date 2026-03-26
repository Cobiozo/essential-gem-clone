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
  guestEmail: string | null = null
) {
  const viewId = useRef<string | null>(null);
  // Persist sessionId in localStorage so returning guests are recognized
  const sessionId = useRef<string>('');
  if (!sessionId.current) {
    const storageKey = `aw_session_${guestEmail || 'user'}_${new Date().toISOString().slice(0, 10)}`;
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
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    // Look up guest_registration_id if we have an email
    let guestRegistrationId: string | null = null;
    if (guestEmail) {
      const { data: regData } = await supabase
        .from('guest_event_registrations')
        .select('id')
        .eq('email', guestEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (regData) {
        guestRegistrationId = regData.id;
      }
    }

    const { data, error } = await supabase
      .from('auto_webinar_views' as any)
      .insert({
        video_id: vid,
        user_id: userId,
        session_id: sessionId.current,
        is_guest: isGuest || !userId,
        guest_email: guestEmail || null,
        guest_registration_id: guestRegistrationId,
      })
      .select('id')
      .single();

    if (!error && data) {
      viewId.current = (data as any).id;
      startTime.current = Date.now();
    }
  }, [isGuest, guestEmail]);

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

  // Handle page unload
  useEffect(() => {
    const handleUnload = () => {
      if (viewId.current && startTime.current) {
        const seconds = Math.floor((Date.now() - startTime.current) / 1000);
        const payload = JSON.stringify({
          watch_duration_seconds: seconds,
          left_at: new Date().toISOString(),
        });
        // Use sendBeacon for reliable delivery on page close
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/auto_webinar_views?id=eq.${viewId.current}`,
          new Blob([payload], { type: 'application/json' })
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);
}
