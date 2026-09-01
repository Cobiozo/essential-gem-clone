import { useEffect, useRef } from 'react';

/**
 * Fallback version detection.
 *
 * The primary mechanism is the Service Worker `updatefound` event registered in
 * `main.tsx` (it dispatches `swUpdateAvailable`). `/version.json` polling stays
 * only as a safety net for browsers/sessions without an active SW, so it runs
 * at a low frequency and is paused while the tab is hidden (Etap 3 — idle network).
 */
const POLL_INTERVAL = 5 * 60_000; // 5 minutes (fallback only)

export function useVersionPolling() {
  const localVersion = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    const checkVersion = async () => {
      lastCheckRef.current = Date.now();
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const remote = data.version as string;

        if (!localVersion.current) {
          localVersion.current = remote;
          return;
        }

        if (remote !== localVersion.current) {
          console.log('[VersionPolling] New version detected:', remote, '(was:', localVersion.current, ')');
          localVersion.current = remote; // prevent repeated events
          window.dispatchEvent(new CustomEvent('appVersionChanged'));
        }
      } catch {
        // network error — ignore silently
      }
    };

    // Initial check
    checkVersion();

    // Start polling
    intervalRef.current = setInterval(checkVersion, POLL_INTERVAL);

    // Pause/resume on visibility change
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Avoid an extra request when the tab is toggled frequently
        if (Date.now() - lastCheckRef.current > POLL_INTERVAL) checkVersion();
        if (!intervalRef.current) intervalRef.current = setInterval(checkVersion, POLL_INTERVAL);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
