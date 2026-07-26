import { supabase } from '@/integrations/supabase/client';

export type GeocodeItem = { city: string; country: string; street: string; postalCode?: string };
export type GeocodeResult = GeocodeItem & { lat: number | null; lng: number | null };

const GEOCODE_CACHE_KEY = 'userWorldMap.geocodeCache.v4';
type GeocodeCache = Record<string, { lat: number; lng: number; ts: number }>;

/** Precision key: city + country, plus postal code only when it is known. */
export const keyOf = (i: { city: string; country: string; postalCode?: string }) => {
  const city = (i.city || '').toLowerCase().trim();
  const country = (i.country || '').toLowerCase().trim();
  const postal = (i.postalCode || '').toLowerCase().replace(/\s+/g, '').trim();
  return postal ? `${city}|${country}|${postal}` : `${city}|${country}`;
};

export const baseCityKeyOf = (i: { city: string; country: string }) =>
  `${(i.city || '').toLowerCase().trim()}|${(i.country || '').toLowerCase().trim()}`;

function readGeocodeCache(): GeocodeCache {
  try {
    const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as GeocodeCache) : {};
  } catch {
    return {};
  }
}

function writeGeocodeCache(cache: GeocodeCache) {
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota / private mode — cache is best effort */
  }
}

const isCoord = (r: GeocodeResult) =>
  typeof r?.lat === 'number' && typeof r?.lng === 'number' && isFinite(r.lat!) && isFinite(r.lng!);

function mergeGeocodeCache(results: GeocodeResult[]) {
  if (!results?.length) return;
  const cache = readGeocodeCache();
  let changed = false;
  results.forEach((r) => {
    if (isCoord(r)) {
      cache[keyOf(r)] = { lat: r.lat as number, lng: r.lng as number, ts: Date.now() };
      changed = true;
    }
  });
  if (changed) writeGeocodeCache(cache);
}

function fromCacheResults(items: GeocodeItem[]): GeocodeResult[] {
  const cache = readGeocodeCache();
  return items.map((i) => {
    const hit = cache[keyOf(i)];
    return { ...i, lat: hit?.lat ?? null, lng: hit?.lng ?? null };
  });
}

export async function geocodeCities(
  items: GeocodeItem[],
  forceRetry = false,
): Promise<{ results: GeocodeResult[]; pending: number }> {
  if (items.length === 0) return { results: [], pending: 0 };
  try {
    const { data, error } = await supabase.functions.invoke('geocode-cities', {
      body: { items, forceRetry },
    });
    if (error) throw error;
    const results = (data?.results ?? []) as GeocodeResult[];
    mergeGeocodeCache(results);
    return { results, pending: (data?.pending ?? 0) as number };
  } catch {
    return { results: fromCacheResults(items), pending: 0 };
  }
}
