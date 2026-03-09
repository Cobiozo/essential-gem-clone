import { useEffect, useRef } from 'react';

const POLL_INTERVAL = 60_000; // 60 seconds

export function useVersionPolling() {
  const localVersion = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const checkVersion = async () => {
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
        checkVersion(); // immediate check on return
        intervalRef.current = setInterval(checkVersion, POLL_INTERVAL);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
