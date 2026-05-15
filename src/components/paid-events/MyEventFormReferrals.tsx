import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Loader2, Ticket, Users } from 'lucide-react';

const formatPrice = (gr: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format((gr || 0) / 100);

interface MyEventFormReferralsProps {
  /** Limit results to a single form (when shown under a form card). */
  formId?: string;
  /** Limit results to a single paid event (all forms for that event). */
  eventId?: string;
}

/**
 * Lista osób, które zapisały się przez link partnerski bieżącego użytkownika.
 * Polityka SELECT na event_form_submissions: auth.uid() = partner_user_id
 * (gwarantuje, że partner widzi wyłącznie swoich poleconych).
 *
 * Partner widzi pełne dane swoich poleconych — RLS wymusza izolację.
 */
export const MyEventFormReferrals: React.FC<MyEventFormReferralsProps> = ({ formId, eventId }) => {
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['my-event-form-referrals', user?.id, formId ?? 'all', eventId ?? 'all'],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from('event_form_submissions')
        .select('id, first_name, last_name, email, phone, payment_status, status, email_confirmed_at, created_at, form_id, event_id')
        .eq('partner_user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (formId) q = q.eq('form_id', formId);
      if (eventId) q = q.eq('event_id', eventId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Buyer's own paid_event_orders (with attendees) for this event scope.
  const { data: myOrders = [] } = useQuery({
    queryKey: ['my-event-form-referrals-orders', user?.id, eventId ?? 'all'],
    enabled: !!user?.id && !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_orders')
        .select(`
          id, quantity, total_amount, status, created_at, first_name, last_name, email,
          ticket:paid_event_tickets!paid_event_orders_ticket_id_fkey(name, seats_per_ticket),
          attendees:paid_event_order_attendees(id, seat_index, first_name, last_name, email)
        `)
        .eq('user_id', user!.id)
        .eq('event_id', eventId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
        <Loader2 className="h-3 w-3 animate-spin" /> Ładowanie listy zapisanych…
      </div>
    );
  }

  if (rows.length === 0 && myOrders.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-3 flex items-center gap-2">
        <Users className="h-3 w-3" /> Brak zapisanych przez Twój link.
      </div>
    );
  }


  const paymentBadge = (s: string, status: string) => {
    if (status === 'cancelled') return <Badge variant="destructive">Anulowane</Badge>;
    if (s === 'paid') return <Badge className="bg-green-600 hover:bg-green-700">Opłacone</Badge>;
    if (s === 'refunded') return <Badge variant="outline">Zwrot</Badge>;
    return <Badge variant="secondary">Oczekuje płatności</Badge>;
  };

  return (
    <div className="space-y-4">
      {myOrders.length > 0 && (
        <div className="rounded-md border bg-primary/5 p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1">
            <Ticket className="h-3 w-3" /> Twoje zakupione bilety
          </div>
          {myOrders.map((o: any) => {
            const seatsPer = Math.max(1, Number(o.ticket?.seats_per_ticket) || 1);
            const qty = Math.max(1, Number(o.quantity) || 1);
            const totalSeats = qty * seatsPer;
            const attendees = [...(o.attendees || [])].sort((a: any, b: any) => a.seat_index - b.seat_index);
            return (
              <div key={o.id} className="text-xs space-y-1 border-l-2 border-primary/40 pl-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{o.ticket?.name || 'Bilet'}</span>
                  <Badge variant="outline" className="text-[10px]">{qty} × bilet</Badge>
                  <Badge variant="outline" className="text-[10px]">{totalSeats} uczestników</Badge>
                  <span className="text-primary font-bold">{formatPrice(o.total_amount)}</span>
                  {o.status === 'paid' || o.status === 'completed' ? (
                    <Badge className="bg-green-600 hover:bg-green-700 text-[10px]">Opłacone</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Oczekuje płatności</Badge>
                  )}
                </div>
                {attendees.length > 0 ? (
                  <ul className="text-muted-foreground space-y-0.5">
                    {attendees.map((a: any) => {
                      const isBuyer = a.seat_index === 1;
                      const isPlaceholder = !isBuyer && (a.first_name === 'Uczestnik' || a.first_name === 'Gość') && /^#\d+$/.test(a.last_name);
                      return (
                        <li key={a.id} className="flex flex-wrap items-center gap-1">
                          <span className={isPlaceholder ? 'italic' : 'text-foreground'}>
                            {a.seat_index}. {a.first_name} {a.last_name}
                          </span>
                          {isBuyer && <Badge variant="outline" className="text-[10px] border-primary text-primary">Ty</Badge>}
                          {isPlaceholder && <span className="text-amber-600">— uzupełnij dane</span>}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-muted-foreground italic">Brak danych uczestników.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rows.length > 0 && (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b">
            <th className="text-left py-2 pr-2 font-medium">Data</th>
            <th className="text-left py-2 pr-2 font-medium">Imię i nazwisko</th>
            <th className="text-left py-2 pr-2 font-medium">Email</th>
            <th className="text-left py-2 pr-2 font-medium">Telefon</th>
            <th className="text-left py-2 pr-2 font-medium">Email potw.</th>
            <th className="text-left py-2 pr-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2 pr-2 text-muted-foreground whitespace-nowrap">
                {new Date(r.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
              </td>
              <td className="py-2 pr-2 font-medium">
                {[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}
              </td>
              <td className="py-2 pr-2 text-muted-foreground break-all">{r.email || '—'}</td>
              <td className="py-2 pr-2 text-muted-foreground whitespace-nowrap">{r.phone || '—'}</td>
              <td className="py-2 pr-2">
                {r.email_confirmed_at ? (
                  <Badge variant="outline" className="border-green-600 text-green-700">Tak</Badge>
                ) : (
                  <Badge variant="outline">Czeka</Badge>
                )}
              </td>
              <td className="py-2 pr-2">{paymentBadge(r.payment_status, r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      )}
    </div>
  );
};

export default MyEventFormReferrals;
