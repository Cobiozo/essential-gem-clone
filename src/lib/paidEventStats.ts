import { supabase } from '@/integrations/supabase/client';

export interface PaidEventStats {
  guests: number;
  guestsPlc: number;
  partners: number;
  total: number;
}

const EMPTY: PaidEventStats = { guests: 0, guestsPlc: 0, partners: 0, total: 0 };
const ACTIVE_ORDER_STATUSES = ['paid', 'awaiting_transfer', 'pending'];

type OrderRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  quantity: number | null;
  paid_event_order_attendees: { id: string }[] | null;
};

function classify(role: string | undefined): keyof PaidEventStats {
  if (role === 'partner' || role === 'specjalista' || role === 'admin' || role === 'moderator') return 'partners';
  if (role === 'client') return 'guestsPlc';
  return 'guests';
}

export async function fetchPaidEventStats(eventIds: string[]): Promise<Record<string, PaidEventStats>> {
  const result: Record<string, PaidEventStats> = {};
  if (eventIds.length === 0) return result;
  for (const id of eventIds) result[id] = { ...EMPTY };

  const [submissionsRes, guestsRes, ordersRes] = await Promise.all([
    supabase
      .from('event_form_submissions')
      .select('event_id')
      .in('event_id', eventIds)
      .eq('status', 'active'),
    supabase
      .from('guest_event_registrations')
      .select('event_id')
      .in('event_id', eventIds)
      .eq('status', 'active'),
    supabase
      .from('paid_event_orders')
      .select('id, event_id, user_id, quantity, paid_event_order_attendees(id)')
      .in('event_id', eventIds)
      .in('status', ACTIVE_ORDER_STATUSES)
      .is('cancelled_at', null),
  ]);

  (submissionsRes.data ?? []).forEach((r: any) => {
    if (result[r.event_id]) result[r.event_id].guests += 1;
  });
  (guestsRes.data ?? []).forEach((r: any) => {
    if (result[r.event_id]) result[r.event_id].guests += 1;
  });

  const orders = (ordersRes.data ?? []) as OrderRow[];

  // Role lookup for logged-in orderers
  const userIds = Array.from(new Set(orders.map(o => o.user_id).filter(Boolean))) as string[];
  const rolesByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);
    // Priority: partner/specjalista > client > guest
    const priority: Record<string, number> = { admin: 4, moderator: 4, partner: 3, specjalista: 3, client: 2, guest: 1 };
    (roleRows ?? []).forEach((r: any) => {
      const current = rolesByUser.get(r.user_id);
      if (!current || (priority[r.role] ?? 0) > (priority[current] ?? 0)) {
        rolesByUser.set(r.user_id, r.role);
      }
    });
  }

  orders.forEach((o) => {
    const bucket = result[o.event_id];
    if (!bucket) return;
    const attendeeSeats = o.paid_event_order_attendees?.length ?? 0;
    const seats = attendeeSeats > 0 ? attendeeSeats : (o.quantity ?? 1);
    const key: keyof PaidEventStats = o.user_id
      ? classify(rolesByUser.get(o.user_id))
      : 'guests';
    bucket[key] += seats;
  });

  Object.keys(result).forEach((id) => {
    const s = result[id];
    s.total = s.guests + s.guestsPlc + s.partners;
  });

  return result;
}
