import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardMapSettings {
  id: string;
  is_enabled: boolean;
  visible_to_client: boolean;
  visible_to_partner: boolean;
  visible_to_specjalista: boolean;
  visible_to_leader: boolean;
  visible_to_admin: boolean;
  width: 'full' | 'two_thirds' | 'half';
  height_px: number;
  default_mode: 'classic' | 'satellite';
  marker_color: string;
  show_logos: boolean;
  show_title: boolean;
  title: string;
}

export const useDashboardMapSettings = () => {
  const [settings, setSettings] = useState<DashboardMapSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOnce = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('dashboard_map_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) setSettings(data as DashboardMapSettings);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOnce();
    const channel = (supabase as any)
      .channel('dashboard_map_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_map_settings' }, () => {
        fetchOnce();
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [fetchOnce]);

  const updateSettings = useCallback(async (updates: Partial<DashboardMapSettings>) => {
    if (!settings) return { success: false, error: 'no settings' };
    const { error } = await (supabase as any)
      .from('dashboard_map_settings')
      .update(updates)
      .eq('id', settings.id);
    if (error) return { success: false, error: error.message };
    setSettings({ ...settings, ...updates });
    return { success: true };
  }, [settings]);

  return { settings, loading, updateSettings, refetch: fetchOnce };
};
