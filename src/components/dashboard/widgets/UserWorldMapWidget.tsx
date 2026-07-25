import React, { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import UserWorldMap, { UserLocationPoint } from '@/components/admin/UserWorldMap';
import { useDashboardMapSettings } from '@/hooks/useDashboardMapSettings';
import { useAuth } from '@/contexts/AuthContext';

const widthClass = (w: 'full' | 'two_thirds' | 'half') => {
  if (w === 'full') return 'col-span-full';
  if (w === 'two_thirds') return 'col-span-full lg:max-w-[66%] lg:mx-auto w-full';
  return 'col-span-full lg:max-w-[50%] lg:mx-auto w-full';
};

const CACHE_KEY = 'userWorldMap.userPoints.v2';
try { localStorage.removeItem('userWorldMap.userPoints.v1'); } catch {}
const QUERY_KEY = ['user-location-points'];

const readCache = (): UserLocationPoint[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.points)) return parsed.points as UserLocationPoint[];
  } catch {}
  return [];
};
const writeCache = (points: UserLocationPoint[]) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ points, ts: Date.now() })); } catch {}
};

const fetchUserPoints = async (): Promise<UserLocationPoint[]> => {
  const { data, error } = await (supabase as any).rpc('get_user_location_points');
  if (error || !Array.isArray(data)) {
    console.warn('[UserWorldMapWidget] RPC failed, using cache', error);
    return readCache();
  }
  const rows: UserLocationPoint[] = data.map((r: any) => ({
    user_id: r.user_id,
    first_name: r.first_name || '',
    last_initial: r.last_initial || '',
    city: r.city,
    country: r.country,
    street: r.street || '',
    postal_code: r.postal_code || '',
  }));
  if (rows.length > 0) writeCache(rows);
  return rows;
};

const UserWorldMapWidget: React.FC = () => {
  const { settings, loading: settingsLoading } = useDashboardMapSettings();
  const { userRole, profile } = useAuth();
  const qc = useQueryClient();

  const { data: points = readCache(), isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchUserPoints,
    staleTime: 60_000,
    placeholderData: readCache(),
    refetchOnWindowFocus: false,
  });

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
      .channel('profiles-map-points')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, scheduleRefetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, scheduleRefetch)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'profiles' }, scheduleRefetch)
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

  if (isLoading && points.length === 0) {
    return (
      <div className={widthClass(settings.width)}>
        <div className="rounded-lg bg-muted animate-pulse" style={{ height: settings.height_px }} />
      </div>
    );
  }

  return (
    <div className={widthClass(settings.width)}>
      <UserWorldMap
        users={points}
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
