import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { normalizeCountry } from '@/lib/countryFlags';
import { geocodeCities, keyOf, baseCityKeyOf, type GeocodeItem } from './geocodeCache';
import type { LocationGroup, UserLocationPoint } from './constants';

/**
 * Owns all data-shaping for the map: cleaning, geocoding requests, coordinate
 * grouping and per-country counters. Business rules are unchanged.
 */
export const useUserGroups = (users: UserLocationPoint[]) => {
  const cleanedUsers = useMemo(
    () =>
      (Array.isArray(users) ? users : []).filter(
        (u) => u && u.city && u.city.toLowerCase() !== 'nieznane' && u.city.toLowerCase() !== 'unknown',
      ),
    [users],
  );

  // One representative postal code per city|country (most frequent) — improves
  // geocoder accuracy while grouping stays at city level.
  const representativePostal = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();
    cleanedUsers.forEach((u) => {
      const postal = (u.postal_code || '').trim();
      if (!postal) return;
      const base = baseCityKeyOf(u);
      const m = counts.get(base) ?? new Map<string, number>();
      m.set(postal, (m.get(postal) || 0) + 1);
      counts.set(base, m);
    });
    const out = new Map<string, string>();
    counts.forEach((m, base) => {
      let best = '';
      let bestN = 0;
      m.forEach((n, postal) => {
        if (n > bestN) {
          bestN = n;
          best = postal;
        }
      });
      if (best) out.set(base, best);
    });
    return out;
  }, [cleanedUsers]);

  const items = useMemo<GeocodeItem[]>(() => {
    const seen = new Set<string>();
    const out: GeocodeItem[] = [];
    const push = (it: GeocodeItem) => {
      const k = keyOf(it);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(it);
    };
    cleanedUsers.forEach((u) => {
      push({ city: u.city, country: u.country, street: '', postalCode: '' });
      const postal = representativePostal.get(baseCityKeyOf(u)) || '';
      if (postal) push({ city: u.city, country: u.country, street: '', postalCode: postal });
    });
    return out;
  }, [cleanedUsers, representativePostal]);

  const queryKey = useMemo(
    () => ['geocode-cities-v3', items.map((i) => keyOf(i)).sort().join(',')],
    [items],
  );

  const pollAttemptsRef = useRef(0);
  const { data, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const r = await geocodeCities(items, false);
      pollAttemptsRef.current = r.pending > 0 ? pollAttemptsRef.current + 1 : 0;
      return r;
    },
    enabled: items.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => {
      const d = q.state.data as { pending: number } | undefined;
      if (!d || d.pending === 0) return false;
      if (pollAttemptsRef.current >= 30) return false;
      return 5000;
    },
  });

  const geo = useMemo(() => (Array.isArray(data?.results) ? data!.results : []), [data]);
  const pending = data?.pending ?? 0;

  const groups = useMemo<LocationGroup[]>(() => {
    const coordMap = new Map<string, { lat: number; lng: number }>();
    const cityOnlyMap = new Map<string, { lat: number; lng: number }>();
    geo.forEach((g) => {
      if (typeof g.lat === 'number' && typeof g.lng === 'number' && isFinite(g.lat) && isFinite(g.lng)) {
        coordMap.set(keyOf(g), { lat: g.lat, lng: g.lng });
        const cityKey = (g.city || '').toLowerCase().trim();
        if (cityKey && !cityOnlyMap.has(cityKey)) cityOnlyMap.set(cityKey, { lat: g.lat, lng: g.lng });
      }
    });

    const byCoord = new Map<string, LocationGroup>();
    cleanedUsers.forEach((u) => {
      const postal = representativePostal.get(baseCityKeyOf(u)) || '';
      const coord =
        (postal ? coordMap.get(keyOf({ city: u.city, country: u.country, postalCode: postal })) : undefined) ??
        coordMap.get(keyOf({ city: u.city, country: u.country, postalCode: '' })) ??
        cityOnlyMap.get((u.city || '').toLowerCase().trim());
      if (!coord) return;
      const ck = `${coord.lat.toFixed(5)}|${coord.lng.toFixed(5)}`;
      let grp = byCoord.get(ck);
      if (!grp) {
        grp = {
          key: ck,
          city: u.city,
          country: u.country,
          street: '',
          postalCode: postal,
          lat: coord.lat,
          lng: coord.lng,
          users: [],
        };
        byCoord.set(ck, grp);
      }
      grp.users.push(u);
    });
    return Array.from(byCoord.values());
  }, [geo, cleanedUsers, representativePostal]);

  /** Plotted vs. still-pending user counts per ISO-2 country code. */
  const countryCounts = useMemo(() => {
    const located: Record<string, number> = {};
    groups.forEach((g) => {
      const iso = normalizeCountry(g.country).iso;
      if (!iso) return;
      located[iso] = (located[iso] || 0) + g.users.length;
    });

    const total: Record<string, number> = {};
    cleanedUsers.forEach((u) => {
      const iso = normalizeCountry(u.country).iso;
      if (!iso) return;
      total[iso] = (total[iso] || 0) + 1;
    });

    const pendingByIso: Record<string, number> = {};
    Object.keys(total).forEach((iso) => {
      const diff = total[iso] - (located[iso] || 0);
      if (diff > 0) pendingByIso[iso] = diff;
    });

    return { located, pending: pendingByIso };
  }, [groups, cleanedUsers]);

  const stats = useMemo(
    () => ({
      totalUsers: cleanedUsers.length,
      locatedUsers: groups.reduce((n, g) => n + g.users.length, 0),
      uniqueCities: new Set(cleanedUsers.map((u) => baseCityKeyOf(u))).size,
    }),
    [cleanedUsers, groups],
  );

  return {
    cleanedUsers,
    items,
    groups,
    countryCounts,
    stats,
    pending,
    isFetching,
    refetch,
    resetPollAttempts: () => {
      pollAttemptsRef.current = 0;
    },
  };
};
