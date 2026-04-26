/**
 * Helpers for <input type="datetime-local"> ↔ ISO conversions
 * with a fixed source timezone (default Europe/Warsaw).
 *
 * Policy:
 * - Admins always type event datetimes in Polish time (CET/CEST).
 * - We convert that wall-clock to a correct UTC moment before saving.
 * - When loading back into the input, we display the same wall-clock
 *   (Europe/Warsaw), so admins always see what they typed.
 * - End-user displays use native `new Date(iso).toLocaleString(...)`,
 *   which converts the UTC moment to the viewer's local timezone.
 *
 * DST is handled automatically via Intl.DateTimeFormat.
 */

const DEFAULT_TZ = 'Europe/Warsaw';

/**
 * Returns the offset (in minutes) of the given UTC instant in the given IANA timezone.
 * Positive values mean the zone is ahead of UTC (e.g. +120 for CEST).
 */
function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
  // Format the UTC instant as wall-clock time in `timeZone`, then diff.
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUTC - date.getTime()) / 60000;
}

/**
 * Convert a "YYYY-MM-DDTHH:mm" string (from <input type="datetime-local">),
 * interpreted as wall-clock time in `timeZone`, into an ISO UTC string.
 *
 * Handles DST correctly (uses the offset that applies at that local instant).
 */
export function localInputToISO(
  value: string | null | undefined,
  timeZone: string = DEFAULT_TZ,
): string | null {
  if (!value) return null;
  // Accept "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  // First guess: treat the wall-clock as UTC.
  const utcGuessMs = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s ?? '0'),
  );
  // The actual UTC instant is shifted by the zone's offset at that wall-clock.
  // Iterate twice to settle around DST transitions.
  let offset = getTimezoneOffsetMinutes(new Date(utcGuessMs), timeZone);
  let actualUtcMs = utcGuessMs - offset * 60000;
  offset = getTimezoneOffsetMinutes(new Date(actualUtcMs), timeZone);
  actualUtcMs = utcGuessMs - offset * 60000;
  return new Date(actualUtcMs).toISOString();
}

/**
 * Convert an ISO/UTC datetime string from the database into a
 * "YYYY-MM-DDTHH:mm" string suitable for <input type="datetime-local">,
 * representing that instant as wall-clock time in `timeZone`.
 */
export function isoToLocalInput(
  iso: string | null | undefined,
  timeZone: string = DEFAULT_TZ,
): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const hh = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hh}:${parts.minute}`;
}
