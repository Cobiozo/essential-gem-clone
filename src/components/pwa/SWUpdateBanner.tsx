import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    __swRegistration?: ServiceWorkerRegistration;
  }
}

const AUTO_RELOAD_SECONDS = 30;

export const SWUpdateBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_RELOAD_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(AUTO_RELOAD_SECONDS);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    const show = () => {
      if (!showBanner) {
        setShowBanner(true);
        startCountdown();
      }
    };

    window.addEventListener('swUpdateAvailable', show);
    window.addEventListener('appVersionChanged', show);
    return () => {
      window.removeEventListener('swUpdateAvailable', show);
      window.removeEventListener('appVersionChanged', show);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showBanner, startCountdown]);

  const handleRefresh = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const reg = window.__swRegistration;
    if (reg?.waiting) {
      reg.waiting.postMessage('SKIP_WAITING');
    }
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      window.location.reload();
    });
    setTimeout(() => window.location.reload(), 2000);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">Dostępna nowa wersja aplikacji</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatyczne odświeżenie za {countdown}s
          </p>
        </div>
        <Button size="sm" onClick={handleRefresh} className="shrink-0 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Odśwież
        </Button>
      </div>
    </div>
  );
};
