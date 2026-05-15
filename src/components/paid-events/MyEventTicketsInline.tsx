import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ticket, Pencil, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Attendee {
  id: string;
  seat_index: number;
  first_name: string;
  last_name: string;
  email: string | null;
}

const formatPrice = (gr: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format((gr || 0) / 100);

interface Props {
  eventId: string;
}

/**
 * Compact "Twoje bilety na to wydarzenie" panel rendered inline beneath
 * a paid event card. Only renders when the logged-in user has at least
 * one order for this event. Shows attendees (Ty / Gość — uzupełnij dane)
 * with inline editing for guest seats.
 */
export const MyEventTicketsInline: React.FC<Props> = ({ eventId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editAttendee, setEditAttendee] = useState<Attendee | null>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '' });
  const [saving, setSaving] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-event-tickets-inline', user?.id, eventId],
    enabled: !!user?.id && !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_orders')
        .select(`
          id, quantity, total_amount, status, created_at, email,
          ticket:paid_event_tickets!paid_event_orders_ticket_id_fkey(name, seats_per_ticket),
          attendees:paid_event_order_attendees(id, seat_index, first_name, last_name, email)
        `)
        .eq('user_id', user!.id)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  if (!user) return null;

  const INACTIVE = new Set(['cancelled', 'refunded', 'failed', 'expired']);
  const activeOrders = orders.filter((o: any) => !INACTIVE.has(o.status));
  const activeTickets = activeOrders
    .reduce((sum: number, o: any) => sum + (Number(o.quantity) || 0), 0);
  const inactiveTickets = orders
    .filter((o: any) => INACTIVE.has(o.status))
    .reduce((sum: number, o: any) => sum + (Number(o.quantity) || 0), 0);
  const activeSeats = activeOrders.reduce(
    (sum: number, o: any) =>
      sum + (Number(o.quantity) || 0) * Math.max(1, Number(o.ticket?.seats_per_ticket) || 1),
    0,
  );
  const activeOrdersCount = activeOrders.length;

  const pluralPL = (n: number, forms: [string, string, string]) => {
    const abs = Math.abs(n);
    if (abs === 1) return forms[0];
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
    return forms[2];
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-600 hover:bg-green-700 text-[10px]">Opłacone</Badge>;
      case 'completed':
        return <Badge className="bg-green-700 hover:bg-green-800 text-[10px]">Potwierdzone</Badge>;
      case 'awaiting_transfer':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] text-white">Oczekuje przelewu</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-[10px]">Zarezerwowane</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-[10px]">Anulowane</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="text-[10px]">Zwrócone</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-[10px]">Płatność nieudana</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-[10px]">Rezerwacja wygasła</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status || 'Nieznany'}</Badge>;
    }
  };

  const openEdit = (a: Attendee) => {
    setEditAttendee(a);
    setEditForm({ first_name: a.first_name, last_name: a.last_name, email: a.email || '' });
  };

  const saveEdit = async () => {
    if (!editAttendee) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('paid_event_order_attendees')
        .update({
          first_name: editForm.first_name.trim() || 'Gość',
          last_name: editForm.last_name.trim() || `#${editAttendee.seat_index}`,
          email: editForm.email.trim() || null,
        })
        .eq('id', editAttendee.id);
      if (error) throw error;
      toast({ title: 'Zaktualizowano dane uczestnika' });
      setEditAttendee(null);
      qc.invalidateQueries({ queryKey: ['my-event-tickets-inline'] });
      qc.invalidateQueries({ queryKey: ['my-ticket-orders'] });
    } catch (e: any) {
      toast({ title: 'Błąd zapisu', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border bg-primary/5 p-3 space-y-3" data-testid="my-event-tickets-inline">
      {!isLoading && (
        activeOrdersCount > 0 ? (
          <div
            className="rounded-md border border-primary/30 bg-primary/10 p-2 flex items-center justify-between gap-2 text-xs"
            data-testid="my-event-registration-summary"
          >
            <div className="flex items-start gap-2 min-w-0">
              <Ticket className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-primary">Jesteś zarejestrowany na to wydarzenie</div>
                <div className="text-muted-foreground">
                  Zarezerwowałeś {activeSeats} {pluralPL(activeSeats, ['miejsce', 'miejsca', 'miejsc'])}
                  {' '}w {activeOrdersCount} {pluralPL(activeOrdersCount, ['rezerwacji', 'rezerwacjach', 'rezerwacjach'])}
                  {inactiveTickets > 0 && (
                    <span className="text-muted-foreground/80"> (+{inactiveTickets} anulowanych)</span>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              {statusBadge(activeOrders[0].status)}
            </div>
          </div>
        ) : (
          <div
            className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground italic flex items-center gap-2"
            data-testid="my-event-registration-summary"
          >
            <Ticket className="h-4 w-4 shrink-0" />
            Nie jesteś jeszcze zarejestrowany na to wydarzenie.
          </div>
        )
      )}

      <div className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          <Ticket className="h-3 w-3" /> Twoje bilety na to wydarzenie
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px]">{activeTickets} {activeTickets === 1 ? 'bilet' : 'biletów'}</Badge>
          {inactiveTickets > 0 && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">+{inactiveTickets} anulowanych</Badge>
          )}
        </span>
      </div>

      {isLoading && (
        <div className="text-xs text-muted-foreground italic flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Ładowanie biletów…
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="text-xs text-muted-foreground italic">
          Nie masz jeszcze biletów na to wydarzenie.
        </div>
      )}

      {orders.map((o: any) => {
        const seatsPer = Math.max(1, Number(o.ticket?.seats_per_ticket) || 1);
        const qty = Math.max(1, Number(o.quantity) || 1);
        const totalSeats = qty * seatsPer;
        const attendees: Attendee[] = [...(o.attendees || [])].sort((a: any, b: any) => a.seat_index - b.seat_index);
        const isInactive = INACTIVE.has(o.status);
        const canEdit = !isInactive;

        return (
          <div key={o.id} className={`text-xs space-y-1.5 border-l-2 pl-2 ${isInactive ? 'border-muted-foreground/30 opacity-60' : 'border-primary/40'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-medium ${isInactive ? 'line-through' : ''}`}>{o.ticket?.name || 'Bilet'}</span>
              <Badge variant="outline" className="text-[10px]">{qty} × bilet</Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <Users className="h-2.5 w-2.5" /> {totalSeats}
              </Badge>
              <span className="text-primary font-bold">{formatPrice(o.total_amount)}</span>
              {statusBadge(o.status)}
              {o.checked_in && (
                <Badge className="bg-green-700 hover:bg-green-800 text-[10px]">Zameldowany</Badge>
              )}
            </div>

            {attendees.length > 0 ? (
              <ul className="space-y-1">
                {attendees.map((a) => {
                  const isBuyer = a.seat_index === 1;
                  const isPlaceholder =
                    !isBuyer && (a.first_name === 'Uczestnik' || a.first_name === 'Gość') && /^#\d+$/.test(a.last_name);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-2 py-0.5">
                      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1">
                        <span className={isPlaceholder ? 'italic text-muted-foreground' : 'text-foreground'}>
                          {a.seat_index}. {a.first_name} {a.last_name}
                        </span>
                        {isBuyer && (
                          <Badge variant="outline" className="text-[10px] border-primary text-primary">Ty</Badge>
                        )}
                        {isPlaceholder && <span className="text-amber-600">— uzupełnij dane</span>}
                      </div>
                      {!isBuyer && canEdit && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => openEdit(a)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edytuj
                        </Button>
                      )}
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

      <Dialog open={!!editAttendee} onOpenChange={(o) => !o && setEditAttendee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj dane uczestnika #{editAttendee?.seat_index}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="eai_first">Imię</Label>
                <Input id="eai_first" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="eai_last">Nazwisko</Label>
                <Input id="eai_last" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="eai_email">Email (opcjonalnie)</Label>
              <Input id="eai_email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditAttendee(null)} disabled={saving}>Anuluj</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Zapisywanie...</> : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyEventTicketsInline;
