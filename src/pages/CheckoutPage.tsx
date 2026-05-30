import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Smartphone, Banknote, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Method = 'payu' | 'blik' | 'transfer';

interface OrderInfo {
  id: string;
  event_id: string;
  total_amount: number;
  status: string;
  email: string;
  first_name: string;
  last_name: string;
  ticket_code: string;
  paid_events: {
    title: string; slug: string; event_date: string; location: string | null;
    payment_method_payu: boolean; payment_method_transfer: boolean;
    transfer_payment_details: string | null;
  };
  paid_event_tickets: { name: string };
}

const formatPrice = (groszy: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(groszy / 100);

const CheckoutPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<Method | null>(null);
  const [busy, setBusy] = useState(false);
  const [blikCode, setBlikCode] = useState('');
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      const { data, error } = await supabase
        .from('paid_event_orders')
        .select(`id, event_id, total_amount, status, email, first_name, last_name, ticket_code,
                 paid_events ( title, slug, event_date, location, payment_method_payu, payment_method_transfer, transfer_payment_details ),
                 paid_event_tickets ( name )`)
        .eq('id', orderId).maybeSingle();
      if (error || !data) {
        toast({ title: 'Nie znaleziono zamówienia', variant: 'destructive' });
        navigate('/paid-events'); return;
      }
      setOrder(data as any);
      if ((data as any).status === 'paid' || (data as any).status === 'completed') {
        navigate(`/ticket/${(data as any).ticket_code}`);
      }
      setLoading(false);
    })();
  }, [orderId, navigate, toast]);

  const availableMethods = useMemo<Method[]>(() => {
    if (!order) return [];
    const list: Method[] = [];
    if (order.paid_events.payment_method_payu) { list.push('payu'); list.push('blik'); }
    if (order.paid_events.payment_method_transfer) list.push('transfer');
    return list;
  }, [order]);

  useEffect(() => {
    if (!method && availableMethods.length > 0) setMethod(availableMethods[0]);
  }, [availableMethods, method]);

  const startPayU = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('payu-create-order', { body: { orderId: order.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.redirectUri) window.location.href = data.redirectUri;
      else throw new Error('Brak adresu przekierowania PayU');
    } catch (e: any) {
      toast({ title: 'Błąd PayU', description: e.message, variant: 'destructive' });
      setBusy(false);
    }
  };

  const startBlik = async () => {
    if (!order || !/^\d{6}$/.test(blikCode)) {
      toast({ title: 'Wpisz 6-cyfrowy kod BLIK', variant: 'destructive' }); return;
    }
    setBusy(true); setPolling(true);
    try {
      const { data, error } = await supabase.functions.invoke('payu-blik-charge', {
        body: { orderId: order.id, blikCode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Potwierdź w aplikacji bankowej', description: 'Czekamy na potwierdzenie BLIK…' });
      // Poll for 60s
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3000));
        const { data: ck } = await supabase.functions.invoke('payu-check-order', { body: { orderId: order.id } });
        if (ck?.status === 'paid' || ck?.payuStatus === 'COMPLETED') {
          toast({ title: 'Płatność zaksięgowana ✓' });
          navigate(`/ticket/${order.ticket_code}`); return;
        }
        if (ck?.status === 'cancelled' || ck?.payuStatus === 'CANCELED') {
          throw new Error('Płatność BLIK anulowana');
        }
      }
      throw new Error('Upłynął czas oczekiwania na potwierdzenie BLIK');
    } catch (e: any) {
      toast({ title: 'BLIK nieudany', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); setPolling(false); }
  };

  const confirmTransfer = () => {
    if (!order) return;
    navigate(`/ticket/${order.ticket_code}?status=transfer-pending`);
  };

  if (loading || !order) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie zamówienia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div><strong>{order.paid_events.title}</strong></div>
            <div className="text-muted-foreground">{order.paid_event_tickets.name}</div>
            <div className="text-muted-foreground">Kupujący: {order.first_name} {order.last_name} ({order.email})</div>
            <div className="text-2xl font-bold text-primary pt-2">{formatPrice(order.total_amount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Wybierz metodę płatności</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {availableMethods.length === 0 && (
              <p className="text-sm text-destructive">Brak skonfigurowanych metod płatności dla tego wydarzenia.</p>
            )}

            {availableMethods.includes('payu') && (
              <button onClick={() => setMethod('payu')}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${method === 'payu' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                <div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-primary" />
                  <div><div className="font-medium">PayU — karta / szybki przelew</div>
                    <div className="text-xs text-muted-foreground">Przekierowanie do PayU.</div></div></div>
              </button>
            )}

            {availableMethods.includes('blik') && (
              <button onClick={() => setMethod('blik')}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${method === 'blik' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                <div className="flex items-center gap-3"><Smartphone className="w-5 h-5 text-primary" />
                  <div><div className="font-medium">BLIK</div>
                    <div className="text-xs text-muted-foreground">Wpisz 6-cyfrowy kod z aplikacji bankowej.</div></div></div>
              </button>
            )}

            {availableMethods.includes('transfer') && (
              <button onClick={() => setMethod('transfer')}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${method === 'transfer' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                <div className="flex items-center gap-3"><Banknote className="w-5 h-5 text-primary" />
                  <div><div className="font-medium">Przelew tradycyjny</div>
                    <div className="text-xs text-muted-foreground">Dostaniesz dane do przelewu, bilet po zaksięgowaniu wpłaty.</div></div></div>
              </button>
            )}
          </CardContent>
        </Card>

        {method === 'payu' && (
          <Button size="lg" className="w-full" onClick={startPayU} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Przejdź do PayU <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {method === 'blik' && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Label>Kod BLIK</Label>
              <Input
                inputMode="numeric" maxLength={6} placeholder="123456"
                value={blikCode} onChange={(e) => setBlikCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest font-mono"
              />
              <Button size="lg" className="w-full" onClick={startBlik} disabled={busy || blikCode.length !== 6}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {polling ? 'Czekam na potwierdzenie…' : 'Zapłać BLIK'}
              </Button>
            </CardContent>
          </Card>
        )}

        {method === 'transfer' && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Dane do przelewu</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap font-mono">
                {order.paid_events.transfer_payment_details || 'Brak danych do przelewu — skontaktuj się z organizatorem.'}
              </pre>
              <p className="text-xs text-muted-foreground">
                Tytuł przelewu: <strong>{order.ticket_code} — {order.first_name} {order.last_name}</strong>
              </p>
              <Button size="lg" className="w-full" onClick={confirmTransfer}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Wykonałem przelew
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Bilet z kodem QR wyślemy mailem po zaksięgowaniu wpłaty.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
