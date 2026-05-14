import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ticket, Calendar, MapPin, Users, Pencil, Banknote, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Attendee {
  id: string;
  seat_index: number;
  first_name: string;
  last_name: string;
  email: string | null;
  ticket_code: string;
}

interface OrderRow {
  id: string;
  quantity: number | null;
  total_amount: number;
  status: string;
  payment_provider: string | null;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket: { name: string; price_pln: number; seats_per_ticket: number | null } | null;
  event: { title: string; slug: string; event_date: string; location: string | null; transfer_payment_details: string | null } | null;
  attendees: Attendee[];
}

const formatPrice = (gr: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format((gr || 0) / 100);

const statusBadge = (status: string) => {
  switch (status) {
    case 'paid':
    case 'completed':
      return <Badge className="bg-green-600 hover:bg-green-700">Opłacone</Badge>;
    case 'awaiting_transfer':
    case 'pending':
      return <Badge variant="secondary">Oczekuje płatności</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Anulowane</Badge>;
    case 'refunded':
      return <Badge variant="outline">Zwrot</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

interface MyTicketOrdersProps {
  /** When provided, only show orders for this specific event. */
  eventId?: string;
}

export const MyTicketOrders: React.FC<MyTicketOrdersProps> = ({ eventId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editAttendee, setEditAttendee] = useState<Attendee | null>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [showTransferOrderId, setShowTransferOrderId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-ticket-orders', user?.id, eventId ?? null],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from('paid_event_orders')
        .select(`
          id, quantity, total_amount, status, payment_provider, created_at,
          first_name, last_name, email, event_id,
          ticket:paid_event_tickets!paid_event_orders_ticket_id_fkey(name, price_pln, seats_per_ticket),
          event:paid_events!paid_event_orders_event_id_fkey(title, slug, event_date, location, transfer_payment_details),
          attendees:paid_event_order_attendees(id, seat_index, first_name, last_name, email, ticket_code)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      if (eventId) q = q.eq('event_id', eventId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) as OrderRow[];
    },
  });

  if (!user || isLoading || orders.length === 0) return null;

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
          first_name: editForm.first_name.trim() || 'Uczestnik',
          last_name: editForm.last_name.trim() || `#${editAttendee.seat_index}`,
          email: editForm.email.trim() || null,
        })
        .eq('id', editAttendee.id);
      if (error) throw error;
      toast({ title: 'Zaktualizowano dane uczestnika' });
      setEditAttendee(null);
      qc.invalidateQueries({ queryKey: ['my-ticket-orders'] });
    } catch (e: any) {
      toast({ title: 'Błąd zapisu', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const transferOrder = orders.find(o => o.id === showTransferOrderId);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Ticket className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Moje bilety</h2>
        <Badge variant="outline" className="text-xs">{orders.length}</Badge>
      </div>

      <div className="space-y-3">
        {orders.map((o) => {
          const seatsPer = Math.max(1, Number(o.ticket?.seats_per_ticket) || 1);
          const qty = Math.max(1, Number(o.quantity) || 1);
          const totalSeats = qty * seatsPer;
          const isPending = o.status === 'awaiting_transfer' || o.status === 'pending';
          const isTransfer = o.payment_provider === 'transfer';
          const attendees = [...(o.attendees || [])].sort((a, b) => a.seat_index - b.seat_index);

          return (
            <Card key={o.id}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      {o.event?.title || '—'}
                    </h3>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {o.event?.event_date && (
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
                          {new Date(o.event.event_date).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      )}
                      {o.event?.location && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{o.event.location}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(o.status)}
                    <Badge variant="outline" className="gap-1">
                      {isTransfer ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                      {isTransfer ? 'Przelew' : 'PayU'}
                    </Badge>
                  </div>
                </div>

                <div className="bg-muted/40 rounded-md p-3 text-sm grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Bilet</div>
                    <div className="font-medium truncate">{o.ticket?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Liczba biletów</div>
                    <div className="font-medium">{qty}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Uczestnicy</div>
                    <div className="font-medium flex items-center gap-1"><Users className="h-3 w-3" />{totalSeats}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Kwota</div>
                    <div className="font-bold text-primary">{formatPrice(o.total_amount)}</div>
                  </div>
                </div>

                {/* Attendees list */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Uczestnicy ({attendees.length}/{totalSeats})
                  </div>
                  {attendees.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">
                      Brak danych uczestników. Skontaktuj się z administratorem, aby uzupełnić listę.
                    </div>
                  ) : (
                    <ol className="space-y-1.5">
                      {attendees.map((a) => {
                        const isBuyer = a.seat_index === 1;
                        const isPlaceholder = !isBuyer && a.first_name === 'Uczestnik' && /^#\d+$/.test(a.last_name);
                        const fullName = `${a.first_name} ${a.last_name}`.trim();
                        return (
                          <li key={a.id} className="flex items-center justify-between gap-3 text-sm border-l-2 border-primary/40 pl-3 py-1">
                            <div className="min-w-0 flex-1">
                              <div className={isPlaceholder ? 'text-muted-foreground italic' : 'font-medium'}>
                                {a.seat_index}. {fullName}
                                {isBuyer && <span className="ml-2 text-xs text-muted-foreground font-normal">(kupujący)</span>}
                                {isPlaceholder && <span className="ml-2 text-xs text-amber-600 font-normal">— uzupełnij dane</span>}
                              </div>
                              {a.email && !isPlaceholder && (
                                <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                              )}
                            </div>
                            {!isBuyer && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(a)}>
                                <Pencil className="h-3 w-3 mr-1" /> Edytuj
                              </Button>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                {isPending && isTransfer && o.event?.transfer_payment_details && (
                  <Button size="sm" variant="outline" onClick={() => setShowTransferOrderId(o.id)}>
                    <Banknote className="h-4 w-4 mr-2" /> Pokaż dane do przelewu
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit attendee dialog */}
      <Dialog open={!!editAttendee} onOpenChange={(o) => !o && setEditAttendee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj dane uczestnika #{editAttendee?.seat_index}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ea_first">Imię</Label>
                <Input id="ea_first" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ea_last">Nazwisko</Label>
                <Input id="ea_last" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="ea_email">Email (opcjonalnie)</Label>
              <Input id="ea_email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
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

      {/* Transfer details dialog */}
      <Dialog open={!!showTransferOrderId} onOpenChange={(o) => !o && setShowTransferOrderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dane do przelewu</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted/50 border-l-4 border-primary p-4 rounded text-xs whitespace-pre-wrap font-mono">
            {transferOrder?.event?.transfer_payment_details || ''}
          </pre>
          <p className="text-xs text-muted-foreground">
            Kwota do zapłaty: <strong className="text-primary">{transferOrder ? formatPrice(transferOrder.total_amount) : ''}</strong>
          </p>
          <DialogFooter>
            <Button onClick={() => setShowTransferOrderId(null)}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default MyTicketOrders;
