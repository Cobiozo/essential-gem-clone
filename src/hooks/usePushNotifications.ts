import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BrowserInfo {
  name: string;
  version: string | null;
}

interface OSInfo {
  name: string;
  version: string | null;
}

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  isLoading: boolean;
  error: string | null;
  browserInfo: BrowserInfo | null;
  osInfo: OSInfo | null;
  isPWA: boolean;
}

interface PushConfig {
  enabled: boolean;
  publicKey?: string;
  icon?: string;
  badge?: string;
  defaultTitle?: string;
}

// Convert base64 URL to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'unsupported',
    isLoading: true,
    error: null,
    browserInfo: null,
    osInfo: null,
    isPWA: false,
  });
  const [pushConfig, setPushConfig] = useState<PushConfig | null>(null);

  // Detect browser (extended for Brave, Opera, Edge, etc.)
  const detectBrowser = useCallback((): BrowserInfo => {
    const ua = navigator.userAgent;
    
    // Check Brave first (async check not available in sync context, use feature detection)
    // Brave doesn't always expose itself in UA, but we can try
    if ((navigator as any).brave?.isBrave) {
      return { name: 'brave', version: extractVersion(ua, /Chrome\/(\d+)/) };
    }
    
    // Order matters - check more specific browsers first (based on Chromium)
    if (ua.includes('OPR') || ua.includes('Opera')) {
      return { name: 'opera', version: extractVersion(ua, /(?:OPR|Opera)\/(\d+)/) };
    }
    if (ua.includes('Edg')) {
      return { name: 'edge', version: extractVersion(ua, /Edg\/(\d+)/) };
    }
    if (ua.includes('Firefox')) {
      return { name: 'firefox', version: extractVersion(ua, /Firefox\/(\d+)/) };
    }
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      return { name: 'safari', version: extractVersion(ua, /Version\/(\d+)/) };
    }
    if (ua.includes('Chrome')) {
      return { name: 'chrome', version: extractVersion(ua, /Chrome\/(\d+)/) };
    }
    
    return { name: 'unknown', version: null };
  }, []);

  // Detect OS
  const detectOS = useCallback((): OSInfo => {
    const ua = navigator.userAgent;
    
    if (ua.includes('Windows NT 10')) return { name: 'Windows', version: '10' };
    if (ua.includes('Windows NT 11')) return { name: 'Windows', version: '11' };
    if (ua.includes('Windows')) return { name: 'Windows', version: extractVersion(ua, /Windows NT (\d+\.\d+)/) };
    if (ua.includes('Mac OS X')) return { name: 'macOS', version: extractVersion(ua, /Mac OS X (\d+[._]\d+)/)?.replace('_', '.') || null };
    if (ua.includes('Android')) return { name: 'Android', version: extractVersion(ua, /Android (\d+)/) };
    if (ua.includes('iPhone') || ua.includes('iPad')) return { name: 'iOS', version: extractVersion(ua, /OS (\d+)/) };
    if (ua.includes('Linux')) return { name: 'Linux', version: null };
    
    return { name: 'unknown', version: null };
  }, []);

  // Helper to extract version from UA string
  function extractVersion(ua: string, regex: RegExp): string | null {
    const match = ua.match(regex);
    return match ? match[1] : null;
  }

  // Check if running as PWA
  const checkIsPWA = useCallback((): boolean => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }, []);

  // Get device type
  const getDeviceType = useCallback((): string => {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) {
      return /iPad/.test(ua) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }, []);

  // Fetch push configuration from server
  const fetchPushConfig = useCallback(async (): Promise<PushConfig | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[usePushNotifications] Error fetching config:', err);
      return null;
    }
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState(prev => ({
        ...prev,
        isSupported: false,
        isLoading: false,
        permission: 'unsupported',
      }));
      return;
    }

    try {
      const browserInfo = detectBrowser();
      const osInfo = detectOS();
      const isPWA = checkIsPWA();
      
      // Get current permission
      const permission = Notification.permission;
      
      // Check if we have an active subscription
      const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
      let isSubscribed = false;
      
      if (registration) {
        const subscription = await (registration as any).pushManager?.getSubscription();
        isSubscribed = !!subscription;
      }

      setState(prev => ({
        ...prev,
        isSupported: true,
        isSubscribed,
        permission,
        isLoading: false,
        browserInfo,
        osInfo,
        isPWA,
        error: null,
      }));
    } catch (err: any) {
      console.error('[usePushNotifications] Error checking subscription:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message,
      }));
    }
  }, [detectBrowser, detectOS, checkIsPWA]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch push config if not already loaded
      let config = pushConfig;
      if (!config) {
        config = await fetchPushConfig();
        setPushConfig(config);
      }

      if (!config?.enabled || !config?.publicKey) {
        throw new Error('Push notifications are not configured');
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          permission,
          error: 'Notification permission denied',
        }));
        return false;
      }

      // Register Service Worker
      const registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/',
      });
      await navigator.serviceWorker.ready;
      console.log('[usePushNotifications] Service Worker registered');

      // Subscribe to push
      const applicationServerKeyArray = urlBase64ToUint8Array(config.publicKey);
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        // Cast to avoid TypeScript issues with Uint8Array buffer type
        applicationServerKey: applicationServerKeyArray as unknown as BufferSource,
      });

      console.log('[usePushNotifications] Push subscription created');

      // Get device metadata
      const browserInfo = detectBrowser();
      const osInfo = detectOS();
      const deviceType = getDeviceType();
      const isPWA = checkIsPWA();

      // Save subscription to database
      const subscriptionJSON = subscription.toJSON();
      console.log('[usePushNotifications] Subscription details:', {
        endpoint: subscription.endpoint,
        hasP256dh: !!subscriptionJSON.keys?.p256dh,
        hasAuth: !!subscriptionJSON.keys?.auth,
        browser: browserInfo.name,
      });
      const { error: dbError } = await supabase
        .from('user_push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscriptionJSON.keys?.p256dh || '',
          auth: subscriptionJSON.keys?.auth || '',
          browser: browserInfo.name,
          browser_version: browserInfo.version,
          os: osInfo.name,
          os_version: osInfo.version,
          device_type: deviceType,
          is_pwa: isPWA,
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (dbError) {
        console.error('[usePushNotifications] Error saving subscription:', dbError);
        throw dbError;
      }

      console.log('[usePushNotifications] Subscription saved to database');

      // Send test notification to verify delivery
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: user.id,
            title: 'Powiadomienia włączone!',
            body: 'Będziesz otrzymywać powiadomienia o nowych wiadomościach.',
            url: '/dashboard',
            tag: 'subscription-confirmed',
          },
        });
        console.log('[usePushNotifications] Test notification sent after subscription');
      } catch (testErr) {
        console.warn('[usePushNotifications] Failed to send test notification:', testErr);
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        permission: 'granted',
        browserInfo,
        osInfo,
        isPWA,
        error: null,
      }));

      return true;
    } catch (err: any) {
      console.error('[usePushNotifications] Subscribe error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to subscribe',
      }));
      return false;
    }
  }, [user, pushConfig, fetchPushConfig, detectBrowser, detectOS, getDeviceType, checkIsPWA]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (registration) {
        const subscription = await (registration as any).pushManager?.getSubscription();
        if (subscription) {
          // Remove from database first
          await supabase
            .from('user_push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint);

          // Unsubscribe from push
          await subscription.unsubscribe();
          console.log('[usePushNotifications] Unsubscribed successfully');
        }
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (err: any) {
      console.error('[usePushNotifications] Unsubscribe error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to unsubscribe',
      }));
      return false;
    }
  }, [user]);

  // Clear all notifications
  const clearNotifications = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('CLEAR_NOTIFICATIONS');
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    checkSubscription();
    fetchPushConfig().then(setPushConfig);
  }, [checkSubscription, fetchPushConfig]);

  // Re-check when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user, checkSubscription]);

  return {
    ...state,
    pushConfig,
    subscribe,
    unsubscribe,
    clearNotifications,
    checkSubscription,
  };
};
