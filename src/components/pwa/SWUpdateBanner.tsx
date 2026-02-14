import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    __swRegistration?: ServiceWorkerRegistration;
  }
}

export const SWUpdateBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setShowBanner(true);
    window.addEventListener('swUpdateAvailable', handleUpdate);
    return () => window.removeEventListener('swUpdateAvailable', handleUpdate);
  }, []);

  const handleRefresh = () => {
    const reg = window.__swRegistration;
    if (reg?.waiting) {
      reg.waiting.postMessage('SKIP_WAITING');
    }
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      window.location.reload();
    });
    // Fallback reload after 2s if controllerchange doesn't fire
    setTimeout(() => window.location.reload(), 2000);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">Dostępna nowa wersja aplikacji</p>
          <p className="text-xs text-muted-foreground mt-0.5">Odśwież stronę, aby korzystać z najnowszej wersji.</p>
        </div>
        <Button size="sm" onClick={handleRefresh} className="shrink-0 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Odśwież
        </Button>
      </div>
    </div>
  );
};
