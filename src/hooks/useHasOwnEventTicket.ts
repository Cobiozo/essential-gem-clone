import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns true when the currently logged-in user already holds an ACTIVE
 * (non-cancelled) reservation for the given paid event.
 *
 * Hardened with an 8s hard timeout — if the RPC + fallbacks can't answer in
 * time we assume "no reservation" so the CTA stays enabled. Backend
 * create-event-order still enforces the one-ticket-per-user rule.
 */
export const HAS_OWN_EVENT_TICKET_KEY = 'has-own-event-ticket';

const INACTIVE_STATUSES = new Set(['cancelled', 'refunded', 'failed', 'expired']);
const TIMEOUT_MS = 8000;

export function useHasOwnEventTicket(eventId: string | null | undefined) {
  const { user, profile, rolesReady } = useAuth();
  const profileEmail = (profile as any)?.email?.toLowerCase?.() ?? null;
  const authEmail = user?.email?.toLowerCase() ?? null;
  const emails = Array.from(new Set([authEmail, profileEmail].filter(Boolean) as string[]));

  const query = useQuery({
    queryKey: [HAS_OWN_EVENT_TICKET_KEY, user?.id, eventId, emails.join('|')],
    enabled: !!user?.id && !!eventId && rolesReady,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async () => {
      const withTimeout = <T,>(p: Promise<T>) => Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
      ]);
      try {
        return await withTimeout(checkOwnTicket(user!.id, eventId!, emails));
      } catch (e) {
        console.warn('[useHasOwnEventTicket] check timed out / failed — assuming no reservation', e);
        return false;
      }
    },
  });

  return {
    hasTicket: !!query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

async function checkOwnTicket(userId: string, eventId: string, emails: string[]): Promise<boolean> {
  // PRIMARY: RPC (bypasses RLS, matches by user_id OR email)
  try {
    const { data, error } = await (supabase as any).rpc('get_my_event_orders', {
      p_event_id: eventId,
    });
    if (!error && Array.isArray(data)) {
      const activeRow = data.find((r: any) => !INACTIVE_STATUSES.has(r.status));
      if (activeRow) return true;
    }
  } catch (e) {
    console.warn('[useHasOwnEventTicket] RPC failed, falling back to direct queries', e);
  }

  const notCancelled = '("cancelled","refunded","failed","expired")';

  // 1. Own paid_event_orders by user_id
  const { data: ownOrders, error: ownErr } = await supabase
    .from('paid_event_orders')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .is('account_deleted_at', null)
    .not('status', 'in', notCancelled)
    .limit(1);
  if (!ownErr && (ownOrders?.length ?? 0) > 0) return true;

  if (emails.length > 0) {
    // 2. Guest orders matched by email (user_id IS NULL only)
    const { data: emailOrders, error: emailErr } = await supabase
      .from('paid_event_orders')
      .select('id')
      .eq('event_id', eventId)
      .is('user_id', null)
      .is('account_deleted_at', null)
      .in('email', emails)
      .not('status', 'in', notCancelled)
      .limit(1);
    if (!emailErr && (emailOrders?.length ?? 0) > 0) return true;

    // 3. Group order seat
    const { data: seats, error: seatsErr } = await supabase
      .from('paid_event_order_attendees')
      .select('id, paid_event_orders!inner(event_id, status, account_deleted_at)')
      .eq('paid_event_orders.event_id', eventId)
      .is('paid_event_orders.account_deleted_at', null)
      .is('account_deleted_at', null)
      .not('paid_event_orders.status', 'in', notCancelled)
      .in('email', emails)
      .limit(1);
    if (!seatsErr && (seats?.length ?? 0) > 0) return true;

    // 4. event_form_submissions mirror
    const { data: subs, error: subsErr } = await supabase
      .from('event_form_submissions')
      .select('id')
      .eq('event_id', eventId)
      .in('email', emails)
      .eq('status', 'active')
      .is('account_deleted_at', null)
      .limit(1);
    if (!subsErr && (subs?.length ?? 0) > 0) return true;
  }

  return false;
}
