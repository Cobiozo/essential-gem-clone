import { useState, useCallback } from 'react';
import { getBrowserTimezone } from '@/lib/timezone-utils';

export interface UseUserTimezoneReturn {
  timezone: string;
  setTimezone: (tz: string) => void;
  isAutoDetected: boolean;
  browserTimezone: string;
  resetToAuto: () => void;
}

/**
 * Hook to manage user's timezone preference
 * Defaults to browser's detected timezone, allows manual override
 */
export function useUserTimezone(): UseUserTimezoneReturn {
  const browserTimezone = getBrowserTimezone();
  const [selectedTimezone, setSelectedTimezone] = useState<string>(browserTimezone);
  
  const setTimezone = useCallback((tz: string) => {
    setSelectedTimezone(tz);
  }, []);
  
  const resetToAuto = useCallback(() => {
    setSelectedTimezone(browserTimezone);
  }, [browserTimezone]);
  
  return {
    timezone: selectedTimezone,
    setTimezone,
    isAutoDetected: selectedTimezone === browserTimezone,
    browserTimezone,
    resetToAuto,
  };
}
