import { useEffect, useRef } from 'react';

/**
 * Etap 3 — fallback version detection.
 *
 * Podstawowym mechanizmem wykrywania nowej wersji jest Service Worker
 * (`updatefound` rejestrowany w `main.tsx`, emituje `swUpdateAvailable`).
 * Ten hook to WYŁĄCZNIE fallback dla sesji/przeglądarek bez działającego SW:
 *
 * - jeżeli po krótkim oknie startowym istnieje aktywny, kontrolujący stronę SW,
 *   polling `/version.json` NIE jest w ogóle uruchamiany,
 * - w przeciwnym razie odpytujemy co 10 minut,
 * - polling jest zatrzymywany, gdy karta jest ukryta (`document.hidden`),
 * - po powrocie do widoczności wykonujemy kontrolę tylko, jeśli minął interwał.
 */
const POLL_INTERVAL = 10 * 60_000; // 10 minut (tylko fallback)
const SW_GRACE_MS = 5_000; // czas na przejęcie kontroli przez SW po starcie

export function useVersionPolling() {
  const localVersion = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    let stopped = false;

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
          localVersion.current = remote; // zapobiega powtarzaniu eventu
          window.dispatchEvent(new CustomEvent('appVersionChanged'));
        }
      } catch {
        // błąd sieci — ignorujemy po cichu
      }
    };

    const startPolling = () => {
      if (stopped || intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        if (!document.hidden) checkVersion();
      }, POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        if (Date.now() - lastCheckRef.current > POLL_INTERVAL) checkVersion();
        startPolling();
      }
    };

    /** SW aktywny i kontrolujący stronę => fallback niepotrzebny. */
    const hasWorkingServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) return false;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        return !!reg?.active && !!navigator.serviceWorker.controller;
      } catch {
        return false;
      }
    };

    const init = async () => {
      // Daj SW chwilę na aktywację/przejęcie kontroli po pierwszym załadowaniu.
      await new Promise(resolve => setTimeout(resolve, SW_GRACE_MS));
      if (stopped) return;
      if (await hasWorkingServiceWorker()) return; // SW = mechanizm podstawowy

      await checkVersion(); // ustala wersję bazową dla fallbacku
      if (stopped) return;
      if (!document.hidden) startPolling();
      document.addEventListener('visibilitychange', handleVisibility);
    };

    init();

    return () => {
      stopped = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
