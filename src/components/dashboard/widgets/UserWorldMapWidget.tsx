import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import UserWorldMap from '@/components/admin/UserWorldMap';

type CityRow = { city: string; country: string; count: number };

const UserWorldMapWidget: React.FC = () => {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_user_city_counts');
      if (!mounted) return;
      if (!error && Array.isArray(data)) {
        setCities(data.map((r: any) => ({
          city: r.city,
          country: r.country,
          count: Number(r.count) || 0,
        })));
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="h-[420px] rounded-lg bg-muted animate-pulse" />;
  }

  return <UserWorldMap cities={cities} />;
};

export default UserWorldMapWidget;
