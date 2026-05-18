import React, { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import UserWorldMap from '@/components/admin/UserWorldMap';
import { useDashboardMapSettings } from '@/hooks/useDashboardMapSettings';
import { useAuth } from '@/contexts/AuthContext';

type CityRow = { city: string; country: string; count: number };

const widthClass = (w: 'full' | 'two_thirds' | 'half') => {
  if (w === 'full') return 'col-span-full';
  if (w === 'two_thirds') return 'col-span-full lg:max-w-[66%] lg:mx-auto w-full';
  return 'col-span-full lg:max-w-[50%] lg:mx-auto w-full';
};

const CITIES_CACHE_KEY = 'userWorldMap.cityCounts.v1';
const QUERY_KEY = ['user-city-counts'];

const readCitiesCache = (): CityRow[] => {
  try {
    const raw = localStorage.getItem(CITIES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.cities)) return parsed.cities as CityRow[];
  } catch {}
  return [];
};
const writeCitiesCache = (cities: CityRow[]) => {
  try { localStorage.setItem(CITIES_CACHE_KEY, JSON.stringify({ cities, ts: Date.now() })); } catch {}
};

const fetchCityCounts = async (): Promise<CityRow[]> => {
  const { data, error } = await (supabase as any).rpc('get_user_city_counts');
  if (error || !Array.isArray(data)) {
    console.warn('[UserWorldMapWidget] RPC failed, using cached cities', error);
    return readCitiesCache();
  }
  const rows: CityRow[] = data.map((r: any) => ({
    city: r.city, country: r.country, count: Number(r.count) || 0,
  }));
  if (rows.length > 0) writeCitiesCache(rows);
  return rows;
};

const UserWorldMapWidget: React.FC = () => {
  const { settings, loading: settingsLoading } = useDashboardMapSettings();
  const { userRole, profile } = useAuth();
  const qc = useQueryClient();

  const { data: cities = readCitiesCache(), isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchCityCounts,
    staleTime: 60_000,
    placeholderData: readCitiesCache(),
    refetchOnWindowFocus: false,
  });

  // Realtime: refetch when any profile gains/changes city or country.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const scheduleRefetch = () => {
      if (document.visibilityState !== 'visible') return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        qc.invalidateQueries({ queryKey: QUERY_KEY });
      }, 1500);
    };
    const channel = supabase
      .channel('profiles-map-counts')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        scheduleRefetch)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        scheduleRefetch)
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'profiles' },
        scheduleRefetch)
      .subscribe();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [qc]);

  if (settingsLoading || !settings) return null;
  if (!settings.is_enabled) return null;

  const role = (userRole?.role || (profile as any)?.role) as string | undefined;
  const canSee =
    (role === 'client' && settings.visible_to_client) ||
    (role === 'partner' && settings.visible_to_partner) ||
    (role === 'specjalista' && settings.visible_to_specjalista) ||
    (role === 'leader' && settings.visible_to_leader) ||
    (role === 'admin' && settings.visible_to_admin);
  if (!canSee) return null;

  if (isLoading && cities.length === 0) {
    return (
      <div className={widthClass(settings.width)}>
        <div className="rounded-lg bg-muted animate-pulse" style={{ height: settings.height_px }} />
      </div>
    );
  }

  return (
    <div className={widthClass(settings.width)}>
      <UserWorldMap
        cities={cities}
        initialMode={settings.default_mode}
        markerColor={settings.marker_color}
        showLogos={settings.show_logos}
        showTitle={settings.show_title}
        customTitle={settings.title}
        heightPx={settings.height_px}
        hideHeaderMeta
        logoLeftUrl={settings.logo_left_url?.trim() ? settings.logo_left_url : undefined}
        logoRightUrl={settings.logo_right_url?.trim() ? settings.logo_right_url : undefined}
      />
    </div>
  );
};

export default UserWorldMapWidget;
