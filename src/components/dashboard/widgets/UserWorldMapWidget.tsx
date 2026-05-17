import React, { useEffect, useState } from 'react';
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

const UserWorldMapWidget: React.FC = () => {
  const { settings, loading: settingsLoading } = useDashboardMapSettings();
  const { userRole, profile } = useAuth();
  const [cities, setCities] = useState<CityRow[]>(() => readCitiesCache());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc('get_user_city_counts');
        if (!mounted) return;
        if (!error && Array.isArray(data)) {
          const rows: CityRow[] = data.map((r: any) => ({
            city: r.city, country: r.country, count: Number(r.count) || 0,
          }));
          setCities(rows);
          if (rows.length > 0) writeCitiesCache(rows);
        } else {
          // RPC error: keep whatever we already loaded from cache (set in initial state)
          console.warn('[UserWorldMapWidget] RPC failed, using cached cities', error);
        }
      } catch (e) {
        // Never crash the widget — keep cached cities
        console.warn('[UserWorldMapWidget] city counts failed', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

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

  if (loading) {
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
