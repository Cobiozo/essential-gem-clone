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

const UserWorldMapWidget: React.FC = () => {
  const { settings, loading: settingsLoading } = useDashboardMapSettings();
  const { userRole, profile } = useAuth();
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_user_city_counts');
      if (!mounted) return;
      if (!error && Array.isArray(data)) {
        setCities(data.map((r: any) => ({
          city: r.city, country: r.country, count: Number(r.count) || 0,
        })));
      }
      setLoading(false);
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
        logoLeftUrl={settings.logo_left_url ?? undefined}
        logoRightUrl={settings.logo_right_url ?? undefined}
      />
    </div>
  );
};

export default UserWorldMapWidget;
