import { useState, useEffect, useCallback } from 'react';

export const useBrowserNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('[BrowserNotifications] Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'default') {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        console.log('[BrowserNotifications] Permission result:', result);
        return result;
      } catch (error) {
        console.error('[BrowserNotifications] Permission request failed:', error);
        return 'denied';
      }
    }

    return Notification.permission;
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions): boolean => {
    if (!('Notification' in window)) {
      console.warn('[BrowserNotifications] Notifications not supported');
      return false;
    }

    if (Notification.permission !== 'granted') {
      console.log('[BrowserNotifications] Permission not granted:', Notification.permission);
      return false;
    }

    // Only show when tab is in background
    if (!document.hidden) {
      console.log('[BrowserNotifications] Tab is visible, skipping notification');
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      // Handle click - focus window
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Navigate to link if provided
        if (options?.data?.link) {
          window.location.href = options.data.link;
        }
      };

      console.log('[BrowserNotifications] Notification shown:', title);
      return true;
    } catch (error) {
      console.error('[BrowserNotifications] Failed to show notification:', error);
      return false;
    }
  }, []);

  return {
    permission,
    isSupported: 'Notification' in window,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    requestPermission,
    showNotification,
  };
};
