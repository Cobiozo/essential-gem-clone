import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

function generateDeviceHash(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth?.toString() || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency?.toString() || '',
  ];
  
  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'dh_' + Math.abs(hash).toString(36);
}

export function useLoginTracking() {
  const trackLogin = useCallback(async () => {
    try {
      const deviceHash = generateDeviceHash();
      
      await supabase.functions.invoke('track-login', {
        body: {
          device_hash: deviceHash,
          user_agent: navigator.userAgent,
        },
      });
    } catch (error) {
      // Silent fail — tracking should never block login
      console.warn('[LoginTracking] Failed to track login:', error);
    }
  }, []);

  return { trackLogin };
}
