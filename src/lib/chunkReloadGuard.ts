/**
 * Etap 7 — jedyne miejsce śledzące automatyczne reloady po błędzie ładowania chunku.
 *
 * Znaczniki są TRWAŁE pomiędzy pełnymi przeładowaniami strony (sessionStorage) i
 * NIE są kasowane przy starcie aplikacji. Wpisy starsze niż 60 s są uznawane za
 * wygasłe. Limit: maksymalnie 2 automatyczne reloady w oknie 60 sekund.
 */
const KEY = 'chunk_error_reload';
const WINDOW_MS = 60_000;
export const MAX_RELOADS = 2;

function read(): number[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === 'number');
  } catch {
    return [];
  }
}

function write(values: number[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(values));
  } catch {
    /* ignore */
  }
}

/** Reloady zarejestrowane w ostatnich 60 s. */
export function recentReloads(now = Date.now()): number[] {
  return read().filter(ts => now - ts < WINDOW_MS);
}

/**
 * Rejestruje próbę automatycznego reloadu.
 * @returns true, jeśli reload jest dozwolony (limit nieprzekroczony).
 */
export function registerReloadAttempt(now = Date.now()): boolean {
  const recent = recentReloads(now);
  if (recent.length >= MAX_RELOADS) {
    write(recent);
    return false;
  }
  write([...recent, now]);
  return true;
}

/** Czas ostatniego automatycznego reloadu (lub null). */
export function lastReloadAt(now = Date.now()): number | null {
  const recent = recentReloads(now);
  return recent.length ? recent[recent.length - 1] : null;
}
