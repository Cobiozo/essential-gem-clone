import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSidebarMenuOrder() {
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await (supabase.from('sidebar_menu_order' as any) as any)
      .select('order').eq('id', true).maybeSingle();
    setOrder(Array.isArray(data?.order) ? (data.order as string[]) : []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel('sidebar_menu_order_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sidebar_menu_order' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  const save = useCallback(async (next: string[]) => {
    setOrder(next);
    const { error } = await (supabase.from('sidebar_menu_order' as any) as any)
      .upsert({ id: true, order: next, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) throw error;
  }, []);

  return { order, loading, save, refresh };
}

/**
 * Sort an array of items (with `id` field) based on a desired order of IDs.
 * Items not in the order list keep their original relative position at the end.
 */
export function sortByOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  if (!order || order.length === 0) return items;
  const indexMap = new Map(order.map((id, i) => [id, i]));
  const known: T[] = [];
  const unknown: T[] = [];
  for (const it of items) {
    if (indexMap.has(it.id)) known.push(it);
    else unknown.push(it);
  }
  known.sort((a, b) => (indexMap.get(a.id)! - indexMap.get(b.id)!));
  return [...known, ...unknown];
}
