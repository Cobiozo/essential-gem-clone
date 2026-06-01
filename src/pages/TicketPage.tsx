import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Download, CheckCircle2, Clock, XCircle, Calendar, MapPin,
  Ticket as TicketIcon, RefreshCw, Mail, AlertTriangle, Building,
} from 'lucide-react';

interface Attendee {
  id: string;
  seat_index: number;
  first_name: string;
  last_name: string;
  email: string | null;
  ticket_code: string;
  ticket_pdf_url: string | null;
  checked_in: boolean;
}

interface OrderInfo {
  id: string;
  status: string;
  email: string;
  first_name: string;
  last_name: string;
  total_amount: number;
  ticket_code: string;
  ticket_pdf_url: string | null;
  payment_method: string | null;
  payment_provider: string | null;
  created_at: string;
  paid_events: {
    id: string;
    title: string;
    slug: string;
    event_date: string;
    location: string | null;
    is_online: boolean;
    banner_url: string | null;
    transfer_payment_details: string | null;
  };
  paid_event_tickets: { name: string };
}

const formatPrice = (groszy: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(groszy / 100);

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('pl-PL', {
      dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Warsaw',
    });
  } catch { return iso; }
};

const TicketPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [params] = useSearchParams();
  const fromTransfer = params.get('status') === 'transfer-pending';

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!code) return;
    const orderSelect = `id, status, email, first_name, last_name, total_amount, ticket_code, ticket_pdf_url, payment_method, payment_provider, created_at,
               paid_events ( id, title, slug, event_date, location, is_online, banner_url, transfer_payment_details ),
               paid_event_tickets ( name )`;
    // Primary lookup: order-level ticket_code.
    let { data, error } = await supabase
      .from('paid_event_orders')
      .select(orderSelect)
      .eq('ticket_code', code)
      .maybeSingle();
    // Fallback: per-attendee ticket_code (this is the code embedded in the QR / e-mailed PDF).
    if (!data) {
      const { data: att } = await supabase
        .from('paid_event_order_attendees')
        .select('order_id')
        .eq('ticket_code', code)
        .maybeSingle();
      if (att?.order_id) {
        const res = await supabase
          .from('paid_event_orders')
          .select(orderSelect)
          .eq('id', att.order_id)
          .maybeSingle();
        data = res.data as any;
        error = res.error as any;
      }
    }
    if (error || !data) { setError('Nie znaleziono biletu o podanym kodzie.'); setLoading(false); return; }
    setOrder(data as unknown as OrderInfo);
    const { data: att } = await supabase
      .from('paid_event_order_attendees')
      .select('id, seat_index, first_name, last_name, email, ticket_code, ticket_pdf_url, checked_in')
      .eq('order_id', (data as any).id)
      .order('seat_index', { ascending: true });
    setAttendees((att as Attendee[]) || []);
    setLoading(false);
  }, [code]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh while processing / pending PayU completion
  useEffect(() => {
    if (!order) return;
    if (['paid', 'completed', 'cancelled', 'failed', 'refunded'].includes(order.status)) return;
    const t = setInterval(() => load(), 10_000);
    return () => clearInterval(t);
  }, [order, load]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center space-y-3">
            <XCircle className="w-12 h-12 mx-auto text-destructive" />
            <h2 className="text-lg font-semibold">Bilet niedostępny</h2>
            <p className="text-sm text-muted-foreground">{error || 'Nie znaleziono.'}</p>
            <Button asChild variant="outline"><Link to="/paid-events">Wróć do wydarzeń</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = order.status === 'paid' || order.status === 'completed';
  const isTransferPending = order.status === 'awaiting_transfer' || (fromTransfer && order.status === 'pending');
  const isCancelled = ['cancelled', 'failed', 'refunded'].includes(order.status);
  const isProcessing = !isPaid && !isCancelled && !isTransferPending;

  const statusBadge = isPaid ? { label: 'Opłacony', icon: <CheckCircle2 className="w-3.5 h-3.5" />, variant: 'default' as const }
    : isTransferPending ? { label: 'Oczekuje na wpłatę', icon: <Clock className="w-3.5 h-3.5" />, variant: 'secondary' as const }
    : isCancelled ? { label: 'Anulowane', icon: <XCircle className="w-3.5 h-3.5" />, variant: 'destructive' as const }
    : { label: 'Przetwarzanie', icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, variant: 'secondary' as const };

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {order.paid_events.banner_url && (
          <img src={order.paid_events.banner_url} alt={order.paid_events.title} className="w-full rounded-lg object-cover max-h-56" />
        )}

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-xl">{order.paid_events.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{order.paid_event_tickets.name}</p>
              </div>
              <Badge variant={statusBadge.variant} className="gap-1">{statusBadge.icon}{statusBadge.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> {formatDate(order.paid_events.event_date)}</div>
            {order.paid_events.location && (
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> {order.paid_events.location}</div>
            )}
            <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-2">
              <span className="text-muted-foreground">Kod zamówienia:</span>
              <span className="font-mono font-semibold">{order.ticket_code}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">Kwota:</span>
              <span className="text-lg font-bold text-primary">{formatPrice(order.total_amount)}</span>
            </div>
          </CardContent>
        </Card>

        {isProcessing && (
          <Card>
            <CardContent className="py-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Czekamy na potwierdzenie płatności. Strona odświeży się automatycznie.
              </p>
              <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1" />Odśwież teraz</Button>
            </CardContent>
          </Card>
        )}

        {isTransferPending && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Building className="w-5 h-5" />Dane do przelewu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="text-xs bg-background p-3 rounded border whitespace-pre-wrap font-mono">
                {order.paid_events.transfer_payment_details || 'Brak danych — skontaktuj się z organizatorem.'}
              </pre>
              <div className="text-xs space-y-1">
                <div><strong>Tytuł przelewu:</strong> {order.ticket_code} — {order.first_name} {order.last_name}</div>
                <div><strong>Kwota:</strong> {formatPrice(order.total_amount)}</div>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Bilet PDF z kodem QR zostanie wysłany na <strong className="text-foreground">{order.email}</strong> po zaksięgowaniu wpłaty przez administratora.
              </p>
            </CardContent>
          </Card>
        )}

        {isCancelled && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-6 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
              <p className="text-sm">Płatność nie powiodła się lub zamówienie zostało anulowane.</p>
              <Button asChild variant="outline"><Link to={`/events/${order.paid_events.slug}`}>Spróbuj ponownie</Link></Button>
            </CardContent>
          </Card>
        )}

        {isPaid && attendees.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TicketIcon className="w-5 h-5 text-primary" />Bilety ({attendees.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {attendees.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/30 gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium">{a.first_name} {a.last_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{a.ticket_code}</div>
                    {a.checked_in && <Badge variant="outline" className="mt-1 text-xs">Check-in ✓</Badge>}
                  </div>
                  {a.ticket_pdf_url ? (
                    <Button asChild size="sm" variant="default">
                      <a href={a.ticket_pdf_url} target="_blank" rel="noreferrer"><Download className="w-3.5 h-3.5 mr-1" />Pobierz PDF</a>
                    </Button>
                  ) : (
                    <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generowanie…</Badge>
                  )}
                </div>
              ))}
              {!attendees.some((a) => a.ticket_pdf_url) && (
                <Button variant="outline" size="sm" onClick={load} className="w-full">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />Sprawdź ponownie
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {isPaid && attendees.length === 0 && order.ticket_pdf_url && (
          <Card>
            <CardContent className="py-4 flex items-center justify-between gap-3">
              <span className="text-sm">Twój bilet PDF jest gotowy.</span>
              <Button asChild><a href={order.ticket_pdf_url} target="_blank" rel="noreferrer"><Download className="w-4 h-4 mr-1" />Pobierz</a></Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-2">
          <Button asChild variant="ghost" size="sm"><Link to="/paid-events">Wróć do wydarzeń</Link></Button>
        </div>
      </div>
    </div>
  );
};

export default TicketPage;
