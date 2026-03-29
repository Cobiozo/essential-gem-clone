/**
 * DST-aware conversion: Warsaw local time → UTC Date
 * 
 * Uses Intl.DateTimeFormat to determine the correct UTC offset
 * for Europe/Warsaw on any given date, correctly handling
 * CET (UTC+1) ↔ CEST (UTC+2) transitions.
 * 
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @param timeStr - Time string in "HH:MM" format  
 * @returns Date object representing the correct UTC moment
 */
export function warsawLocalToUtc(dateStr: string, timeStr: string): Date {
  // Step 1: Parse the date/time components
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // Step 2: Create a "guess" UTC date to probe the offset
  // We use the local time as if it were UTC, then check what Warsaw shows
  const guessUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  // Step 3: Use Intl to find what Warsaw time corresponds to this UTC moment
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(guessUtc);
  const wHour = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
  const wMinute = parseInt(parts.find(p => p.type === 'minute')!.value, 10);

  // Step 4: Calculate the offset in minutes
  // If guessUtc = 20:00 UTC and Warsaw shows 21:00, offset = +60 (CET)
  // If guessUtc = 20:00 UTC and Warsaw shows 22:00, offset = +120 (CEST)
  let offsetMinutes = (wHour * 60 + wMinute) - (hour * 60 + minute);
  
  // Handle day boundary wrap
  if (offsetMinutes < -720) offsetMinutes += 1440;
  if (offsetMinutes > 720) offsetMinutes -= 1440;

  // Step 5: The actual UTC time is the local Warsaw time minus the offset
  // Warsaw local 20:00 with offset +120 (CEST) → UTC 18:00
  // Warsaw local 20:00 with offset +60 (CET) → UTC 19:00
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - (offsetMinutes * 60_000);

  return new Date(utcMs);
}
