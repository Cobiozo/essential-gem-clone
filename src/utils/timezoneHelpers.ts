/**
 * Timezone helper utilities for consistent timezone display across the application.
 * 
 * Policy: "Fixed-timezone display" - events are displayed in their creation timezone
 * with explicit timezone suffix (e.g., "21:00 (CET)"), not converted to user's local time.
 */

export const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  // Central European Time
  'Europe/Warsaw': 'CET',
  'Europe/Berlin': 'CET',
  'Europe/Paris': 'CET',
  'Europe/Amsterdam': 'CET',
  'Europe/Brussels': 'CET',
  'Europe/Vienna': 'CET',
  'Europe/Rome': 'CET',
  'Europe/Madrid': 'CET',
  'Europe/Prague': 'CET',
  'Europe/Budapest': 'CET',
  'Europe/Stockholm': 'CET',
  'Europe/Oslo': 'CET',
  'Europe/Copenhagen': 'CET',
  
  // Greenwich Mean Time / Western European Time
  'Europe/London': 'GMT',
  'Europe/Dublin': 'GMT',
  'Europe/Lisbon': 'WET',
  
  // Eastern European Time
  'Europe/Helsinki': 'EET',
  'Europe/Athens': 'EET',
  'Europe/Bucharest': 'EET',
  'Europe/Kiev': 'EET',
  'Europe/Kyiv': 'EET',
  
  // Americas
  'America/New_York': 'EST',
  'America/Chicago': 'CST',
  'America/Denver': 'MST',
  'America/Los_Angeles': 'PST',
  'America/Toronto': 'EST',
  'America/Vancouver': 'PST',
  'America/Sao_Paulo': 'BRT',
  
  // Asia
  'Asia/Tokyo': 'JST',
  'Asia/Shanghai': 'CST',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Singapore': 'SGT',
  'Asia/Dubai': 'GST',
  'Asia/Kolkata': 'IST',
  
  // Pacific
  'Australia/Sydney': 'AEST',
  'Australia/Melbourne': 'AEST',
  'Australia/Perth': 'AWST',
  'Pacific/Auckland': 'NZST',
  
  // UTC
  'UTC': 'UTC',
  'Etc/UTC': 'UTC',
};

/**
 * Get a short abbreviation for a timezone (e.g., "CET", "GMT")
 */
export const getTimezoneAbbr = (timezone: string): string => {
  if (!timezone) return 'CET';
  return TIMEZONE_ABBREVIATIONS[timezone] || timezone.split('/').pop() || 'UTC';
};

/**
 * Get the user's current timezone from the browser
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Europe/Warsaw';
  }
};

/**
 * Check if user's timezone differs from event timezone
 */
export const areTimezonesDifferent = (eventTimezone: string): boolean => {
  const userTimezone = getUserTimezone();
  const eventTz = eventTimezone || 'Europe/Warsaw';
  return userTimezone !== eventTz;
};

/**
 * Default timezone for events (Poland)
 */
export const DEFAULT_EVENT_TIMEZONE = 'Europe/Warsaw';

/**
 * Common timezones for selector dropdowns
 */
export const COMMON_TIMEZONES = [
  { value: 'Europe/Warsaw', label: 'Polska (CET)' },
  { value: 'Europe/London', label: 'Wielka Brytania (GMT)' },
  { value: 'Europe/Berlin', label: 'Niemcy (CET)' },
  { value: 'Europe/Paris', label: 'Francja (CET)' },
  { value: 'Europe/Amsterdam', label: 'Holandia (CET)' },
  { value: 'Europe/Brussels', label: 'Belgia (CET)' },
  { value: 'Europe/Vienna', label: 'Austria (CET)' },
  { value: 'Europe/Rome', label: 'Włochy (CET)' },
  { value: 'Europe/Madrid', label: 'Hiszpania (CET)' },
  { value: 'Europe/Prague', label: 'Czechy (CET)' },
  { value: 'Europe/Budapest', label: 'Węgry (CET)' },
  { value: 'Europe/Stockholm', label: 'Szwecja (CET)' },
  { value: 'Europe/Helsinki', label: 'Finlandia (EET)' },
  { value: 'Europe/Athens', label: 'Grecja (EET)' },
  { value: 'America/New_York', label: 'Nowy Jork (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'Asia/Tokyo', label: 'Tokio (JST)' },
];
