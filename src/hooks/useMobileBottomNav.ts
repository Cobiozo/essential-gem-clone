import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MobileBottomNavItem {
  id: string;
  label: string;
  icon_name: string;
  target_path: string;
  position: number;
  is_active: boolean;
  visible_to_client: boolean;
  visible_to_partner: boolean;
  visible_to_specjalista: boolean;
  visible_to_leader: boolean;
  visible_to_admin: boolean;
}

export const useMobileBottomNav = () => {
  const [items, setItems] = useState<MobileBottomNavItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('mobile_bottom_nav_items')
      .select('*')
      .order('position', { ascending: true });
    if (Array.isArray(data)) setItems(data as MobileBottomNavItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = (supabase as any)
      .channel('mobile_bottom_nav_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mobile_bottom_nav_items' }, () => fetchAll())
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [fetchAll]);

  return { items, loading, refetch: fetchAll };
};
