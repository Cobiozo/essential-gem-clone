import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isEdge: boolean;
  isFirefox: boolean;
  isOpera: boolean;
  isSamsungBrowser: boolean;
  promptInstall: () => Promise<boolean>;
}

export function usePWAInstall(): PWAInstallState {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Platform detection
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isOpera = /OPR\/|Opera/.test(ua);
  const isEdge = /Edg\//.test(ua);
  const isSamsungBrowser = /SamsungBrowser/.test(ua);
  const isChrome = /Chrome/.test(ua) && !isEdge && !isOpera && !isSamsungBrowser;
  const isFirefox = /Firefox/.test(ua) && !/Seamonkey/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  // Check if already installed
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (navigator as any).standalone === true; // iOS Safari
      setIsInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for display mode changes
    const mql = window.matchMedia('(display-mode: standalone)');
    const handler = () => checkInstalled();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Capture beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
      console.log('[PWA] beforeinstallprompt captured');
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      deferredPrompt.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt.current) return false;

    try {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      console.log('[PWA] Install prompt outcome:', outcome);
      
      if (outcome === 'accepted') {
        deferredPrompt.current = null;
        setCanInstall(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[PWA] Install prompt error:', err);
      return false;
    }
  }, []);

  return { canInstall, isInstalled, isIOS, isAndroid, isSafari, isChrome, isEdge, isFirefox, isOpera, isSamsungBrowser, promptInstall };
}
