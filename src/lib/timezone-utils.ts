import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

// Mapping of timezone identifiers to human-readable labels
export const TIMEZONE_LABELS: Record<string, { short: string; full: string }> = {
  'Europe/Warsaw': { short: 'PL', full: 'Polska (CET)' },
  'Europe/London': { short: 'UK', full: 'Wielka Brytania (GMT)' },
  'Europe/Berlin': { short: 'DE', full: 'Niemcy (CET)' },
  'Europe/Paris': { short: 'FR', full: 'Francja (CET)' },
  'America/New_York': { short: 'NY', full: 'Nowy Jork (EST)' },
  'America/Los_Angeles': { short: 'LA', full: 'Los Angeles (PST)' },
  'America/Chicago': { short: 'CHI', full: 'Chicago (CST)' },
  'Asia/Tokyo': { short: 'JP', full: 'Tokio (JST)' },
  'Asia/Dubai': { short: 'UAE', full: 'Dubaj (GST)' },
  'Australia/Sydney': { short: 'SYD', full: 'Sydney (AEST)' },
  'UTC': { short: 'UTC', full: 'UTC' },
};

// List of timezone options for selectors
export const TIMEZONE_OPTIONS = [
  { value: 'Europe/Warsaw', label: 'Polska (CET)' },
  { value: 'Europe/London', label: 'Wielka Brytania (GMT)' },
  { value: 'Europe/Berlin', label: 'Niemcy (CET)' },
  { value: 'Europe/Paris', label: 'Francja (CET)' },
  { value: 'America/New_York', label: 'Nowy Jork (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokio (JST)' },
  { value: 'UTC', label: 'UTC' },
];

// Default timezone for events (Poland)
export const DEFAULT_EVENT_TIMEZONE = 'Europe/Warsaw';

/**
 * Get timezone label (short or full version)
 */
export function getTimezoneLabel(timezone: string, format: 'short' | 'full' = 'short'): string {
  const labels = TIMEZONE_LABELS[timezone];
  if (labels) {
    return format === 'short' ? labels.short : labels.full;
  }
  // Fallback: extract city name from timezone string
  const city = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
  return format === 'short' ? city.substring(0, 3).toUpperCase() : city;
}

/**
 * Convert event time from event timezone to user timezone
 * Returns the time as it should be displayed in the user's local timezone
 */
export function convertEventTime(
  eventTime: Date,
  eventTimezone: string,
  userTimezone: string
): Date {
  try {
    // The eventTime is stored as UTC in the database
    // Convert it to the user's timezone for display
    return toZonedTime(eventTime, userTimezone);
  } catch (error) {
    console.error('[timezone-utils] Error converting time:', error);
    return eventTime;
  }
}

/**
 * Format time with timezone label
 * Example: "10:00 (PL)" or "10:00 - 11:00 (Polska, CET)"
 */
export function formatTimeWithTimezone(
  time: Date,
  timezone: string,
  format: 'short' | 'full' = 'short'
): string {
  try {
    const timeStr = formatInTimeZone(time, timezone, 'HH:mm');
    const label = getTimezoneLabel(timezone, format);
    return `${timeStr} (${label})`;
  } catch (error) {
    console.error('[timezone-utils] Error formatting time:', error);
    return time.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Format time range with timezone label
 * Example: "10:00 - 11:00 (PL)"
 */
export function formatTimeRangeWithTimezone(
  startTime: Date,
  endTime: Date,
  timezone: string,
  format: 'short' | 'full' = 'short'
): string {
  try {
    const startStr = formatInTimeZone(startTime, timezone, 'HH:mm');
    const endStr = formatInTimeZone(endTime, timezone, 'HH:mm');
    const label = getTimezoneLabel(timezone, format);
    return `${startStr} - ${endStr} (${label})`;
  } catch (error) {
    console.error('[timezone-utils] Error formatting time range:', error);
    return `${startTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

/**
 * Check if two timezones are effectively the same
 * (They might have different names but same offset)
 */
export function areTimezonesEqual(tz1: string, tz2: string): boolean {
  if (tz1 === tz2) return true;
  
  try {
    // Compare current offsets
    const now = new Date();
    const time1 = formatInTimeZone(now, tz1, 'XXX');
    const time2 = formatInTimeZone(now, tz2, 'XXX');
    return time1 === time2;
  } catch {
    return false;
  }
}

/**
 * Get the browser's timezone
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Calculate timezone offset difference in hours between two timezones
 * Returns positive if userTz is ahead of eventTz
 */
export function getTimezoneOffsetDifference(eventTimezone: string, userTimezone: string): number {
  try {
    const now = new Date();
    const eventOffset = formatInTimeZone(now, eventTimezone, 'xxx');
    const userOffset = formatInTimeZone(now, userTimezone, 'xxx');
    
    // Parse offset strings like "+01:00" or "-05:00"
    const parseOffset = (offset: string): number => {
      const match = offset.match(/([+-])(\d{2}):(\d{2})/);
      if (!match) return 0;
      const sign = match[1] === '+' ? 1 : -1;
      const hours = parseInt(match[2], 10);
      const minutes = parseInt(match[3], 10);
      return sign * (hours + minutes / 60);
    };
    
    return parseOffset(userOffset) - parseOffset(eventOffset);
  } catch {
    return 0;
  }
}
