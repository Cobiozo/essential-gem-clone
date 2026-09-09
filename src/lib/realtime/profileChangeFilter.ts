/**
 * Recovery 3B — filtr zdarzeń realtime dla tabeli `profiles`.
 *
 * Heartbeat obecności (`useLastSeenUpdater`) zapisuje `profiles.last_seen_at`
 * maksymalnie raz na 4 minuty na aktywnego użytkownika. Każdy taki UPDATE jest
 * rozgłaszany do wszystkich otwartych paneli admina i — bez filtra — wyzwala
 * kosztowne refetche (pełna lista profili, RPC drzewa organizacji).
 *
 * Zasada bezpieczeństwa: pomijamy WYŁĄCZNIE zdarzenie, o którym mamy pewność,
 * że jedyną zmianą jest `last_seen_at`. W każdej innej sytuacji (brak danych
 * porównawczych, niepełny rekord, jakakolwiek inna różnica) zwracamy `false`,
 * czyli wykonujemy normalny refetch. Lepiej odświeżyć nadmiarowo niż zgubić
 * realną zmianę profilu.
 */

export const LAST_SEEN_FIELD = 'last_seen_at';

type AnyRecord = Record<string, unknown>;

export interface ProfileRealtimePayload {
  eventType?: string;
  new?: AnyRecord | null;
  old?: AnyRecord | null;
}

function isPlainRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Zwraca `true` tylko wtedy, gdy zdarzenie realtime można bezpiecznie pominąć,
 * bo jedyną wykrytą różnicą względem posiadanej kopii rekordu jest
 * `last_seen_at`.
 *
 * Porównanie obejmuje CAŁY dostępny rekord z cache (bez ręcznej listy pól).
 * Jeżeli w `payload.new` brakuje któregokolwiek pola znanego z cache, rekord
 * uznajemy za niekompletny i nie pomijamy zdarzenia.
 */
export function isOnlyLastSeenChange(
  payload: ProfileRealtimePayload | null | undefined,
  cachedRow: AnyRecord | null | undefined,
): boolean {
  if (!payload) return false;
  if (payload.eventType && payload.eventType !== 'UPDATE') return false;

  const next = payload.new;
  if (!isPlainRecord(next)) return false;
  if (!(LAST_SEEN_FIELD in next)) return false;
  if (!isPlainRecord(cachedRow)) return false;

  const cachedKeys = Object.keys(cachedRow);
  if (cachedKeys.length === 0) return false;

  let sawLastSeenDifference = false;

  for (const key of cachedKeys) {
    if (!(key in next)) return false; // niepełny rekord → refetch
    if (sameValue(cachedRow[key], next[key])) continue;
    if (key === LAST_SEEN_FIELD) {
      sawLastSeenDifference = true;
      continue;
    }
    return false; // realna zmiana profilu
  }

  return sawLastSeenDifference;
}

/**
 * Pomocnik dla list profili trzymanych w cache: znajduje rekord odpowiadający
 * zdarzeniu po `id` lub `user_id`.
 */
export function findCachedProfile(
  rows: AnyRecord[] | null | undefined,
  payload: ProfileRealtimePayload | null | undefined,
): AnyRecord | null {
  const next = payload?.new;
  if (!Array.isArray(rows) || !isPlainRecord(next)) return null;
  const id = next.id;
  const userId = next.user_id;
  return (
    rows.find(row => (id != null && row.id === id) || (userId != null && row.user_id === userId)) ??
    null
  );
}

/**
 * Cache list widoków (np. struktura zespołu) zawiera tylko wybrane kolumny i
 * często nie ma w niej `last_seen_at` — samo porównanie z cache nigdy nie
 * potwierdziłoby wtedy, że zmienił się wyłącznie heartbeat. Dlatego filtr
 * pamięta dodatkowo poprzedni KOMPLETNY rekord otrzymany z realtime i używa go
 * jako drugiej podstawy porównania.
 *
 * Zdarzenie jest pomijane tylko wtedy, gdy JEDNOCZEŚNIE:
 *  - względem poprzedniego pełnego rekordu z realtime zmienił się wyłącznie
 *    `last_seen_at`, oraz
 *  - żadne pole znane z cache aplikacji nie różni się od nowego rekordu.
 * Pierwsze zdarzenie dla danego profilu zawsze przechodzi (brak podstawy
 * porównania), więc realna zmiana nie może zostać zgubiona.
 */
export function createProfileRealtimeFilter() {
  const lastRows = new Map<string, AnyRecord>();

  const keyOf = (row: AnyRecord): string | null => {
    const id = row.id ?? row.user_id;
    return typeof id === 'string' ? id : id != null ? String(id) : null;
  };

  return {
    /** `true` → zdarzenie to wyłącznie heartbeat `last_seen_at`, można pominąć. */
    shouldSkip(
      payload: ProfileRealtimePayload | null | undefined,
      cachedRow?: AnyRecord | null,
    ): boolean {
      const next = payload?.new;
      if (!payload || !isPlainRecord(next)) return false;
      const key = keyOf(next);
      const prev = key ? lastRows.get(key) : undefined;
      if (key) lastRows.set(key, { ...next });

      if (isOnlyLastSeenChange(payload, cachedRow)) return true;
      if (!prev) return false;
      if (!isOnlyLastSeenChange(payload, prev)) return false;

      // Dodatkowa asekuracja: nic, co widzi aplikacja, nie może się różnić.
      if (isPlainRecord(cachedRow)) {
        for (const k of Object.keys(cachedRow)) {
          if (k === LAST_SEEN_FIELD) continue;
          if (!(k in next)) return false;
          if (!sameValue(cachedRow[k], next[k])) return false;
        }
      }
      return true;
    },
    reset() {
      lastRows.clear();
    },
  };
}
