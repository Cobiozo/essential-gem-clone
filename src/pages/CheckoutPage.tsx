import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Shield, Lock, BadgeCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePayUStatus } from '@/hooks/usePayUStatus';

type Method = 'transfer' | 'payu' | 'blik';

interface OrderInfo {
  id: string;
  event_id: string;
  total_amount: number;
  status: string;
  email: string;
  first_name: string;
  last_name: string;
  ticket_code: string;
  quantity: number;
  paid_events: {
    title: string; slug: string; event_date: string; location: string | null;
    payment_method_payu: boolean; payment_method_transfer: boolean;
    transfer_payment_details: string | null;
  };
  paid_event_tickets: { name: string; price_pln: number };
}

const formatPrice = (groszy: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(groszy / 100);

async function invokeWithError<T = any>(name: string, body: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let detail = error.message || 'Błąd serwera';
    try {
      const res = (error as any).context?.response;
      if (res && typeof res.json === 'function') {
        const j = await res.json();
        if (j?.error) detail = j.error;
      }
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

const CheckoutPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<Method | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [blikCode, setBlikCode] = useState('');
  const [polling, setPolling] = useState(false);
  const { payuReady, reason: payuReason, loading: payuLoading } = usePayUStatus();

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      const { data, error } = await supabase
        .from('paid_event_orders')
        .select(`id, event_id, total_amount, status, email, first_name, last_name, ticket_code, quantity,
                 paid_events ( title, slug, event_date, location, payment_method_payu, payment_method_transfer, transfer_payment_details ),
                 paid_event_tickets ( name, price_pln )`)
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
    if (order.paid_events.payment_method_transfer) list.push('transfer');
    if (order.paid_events.payment_method_payu) { list.push('payu'); list.push('blik'); }
    return list;
  }, [order]);

  useEffect(() => {
    if (payuLoading) return;
    const isPayuMethod = (m: Method | null) => m === 'payu' || m === 'blik';
    // Pick first non-PayU method if PayU not ready; otherwise first available.
    if (!method && availableMethods.length > 0) {
      const preferred = !payuReady
        ? (availableMethods.find((m) => !isPayuMethod(m)) ?? availableMethods[0])
        : availableMethods[0];
      setMethod(preferred);
      return;
    }
    // If a PayU method got auto-selected but PayU isn't ready, switch to a usable one.
    if (method && isPayuMethod(method) && !payuReady) {
      const fallback = availableMethods.find((m) => !isPayuMethod(m));
      if (fallback) setMethod(fallback);
    }
  }, [availableMethods, method, payuReady, payuLoading]);

  const handlePay = async () => {
    if (!order || !method) return;
    if (!acceptTerms) {
      toast({ title: 'Akceptacja regulaminu', description: 'Musisz zaakceptować warunki, aby kontynuować.', variant: 'destructive' });
      return;
    }

    if (method === 'transfer') {
      setBusy(true);
      try {
        await supabase
          .from('paid_event_orders')
          .update({ payment_method: 'transfer', payment_provider: 'transfer', status: 'awaiting_transfer' })
          .eq('id', order.id);
      } catch { /* non-blocking */ }
      navigate(`/ticket/${order.ticket_code}?status=transfer-pending`);
      return;
    }

    if (method === 'payu') {
      setBusy(true);
      try {
        const data = await invokeWithError<{ redirectUri?: string }>('payu-create-order', { orderId: order.id });
        if (data?.redirectUri) window.location.href = data.redirectUri;
        else throw new Error('Brak adresu przekierowania PayU');
      } catch (e: any) {
        toast({ title: 'Błąd PayU', description: e.message, variant: 'destructive' });
        setBusy(false);
      }
      return;
    }

    if (method === 'blik') {
      if (!/^\d{6}$/.test(blikCode)) {
        toast({ title: 'Wpisz 6-cyfrowy kod BLIK', variant: 'destructive' }); return;
      }
      setBusy(true); setPolling(true);
      try {
        await invokeWithError('payu-blik-charge', { orderId: order.id, blikCode });
        toast({ title: 'Potwierdź w aplikacji bankowej', description: 'Czekamy na potwierdzenie BLIK…' });
        const deadline = Date.now() + 60_000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 3000));
          try {
            const ck = await invokeWithError<{ status?: string; payuStatus?: string }>('payu-check-order', { orderId: order.id });
            if (ck?.status === 'paid' || ck?.payuStatus === 'COMPLETED') {
              toast({ title: 'Płatność zaksięgowana ✓' });
              navigate(`/ticket/${order.ticket_code}`); return;
            }
            if (ck?.status === 'cancelled' || ck?.payuStatus === 'CANCELED') {
              throw new Error('Płatność BLIK anulowana');
            }
          } catch { /* keep polling */ }
        }
        throw new Error('Upłynął czas oczekiwania na potwierdzenie BLIK');
      } catch (e: any) {
        toast({ title: 'BLIK nieudany', description: e.message, variant: 'destructive' });
      } finally { setBusy(false); setPolling(false); }
    }
  };

  if (loading || !order) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie zamówienia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="text-lg font-semibold">{order.paid_events.title}</div>
            <div className="text-muted-foreground">{order.paid_event_tickets.name} × {order.quantity}</div>
            <div className="text-muted-foreground">Kupujący: {order.first_name} {order.last_name} ({order.email})</div>
            <div className="flex justify-between items-baseline pt-3 border-t mt-3">
              <span className="text-sm text-muted-foreground">Do zapłaty</span>
              <span className="text-2xl font-bold text-primary">{formatPrice(order.total_amount)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Wybierz metodę płatności</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {availableMethods.length === 0 ? (
              <p className="text-sm text-destructive">Brak skonfigurowanych metod płatności dla tego wydarzenia.</p>
            ) : (
              <RadioGroup value={method ?? ''} onValueChange={(v) => setMethod(v as Method)} className="space-y-3">
                {availableMethods.includes('transfer') && (
                  <label htmlFor="m-transfer" className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${method === 'transfer' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem id="m-transfer" value="transfer" className="mt-1" />
                    <div className="flex-1">
                      <div className="font-medium">Przelew bankowy</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Prosimy o wpłatę bezpośrednio na nasze konto bankowe. Proszę użyć numeru zamówienia jako tytułu płatności. Twoje zamówienie zostanie zrealizowane po zaksięgowaniu wpłaty na naszym koncie.
                      </p>
                    </div>
                  </label>
                )}
                {availableMethods.includes('payu') && (
                  <label
                    htmlFor="m-payu"
                    title={!payuReady ? (payuReason ?? 'PayU jest tymczasowo niedostępne') : undefined}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
                      !payuReady
                        ? 'border-border opacity-50 cursor-not-allowed bg-muted/30'
                        : method === 'payu'
                          ? 'border-primary bg-primary/5 cursor-pointer'
                          : 'border-border hover:border-primary/50 cursor-pointer'
                    }`}
                  >
                    <RadioGroupItem id="m-payu" value="payu" disabled={!payuReady} />
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <span className="font-medium">PayU</span>
                      <span className="text-xs text-muted-foreground">karta · szybki przelew · Apple/Google Pay</span>
                      {!payuReady && (
                        <span className="text-xs text-destructive">Tymczasowo niedostępne</span>
                      )}
                    </div>
                  </label>
                )}
                {availableMethods.includes('blik') && (
                  <label
                    htmlFor="m-blik"
                    title={!payuReady ? (payuReason ?? 'BLIK przez PayU jest tymczasowo niedostępny') : undefined}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition ${
                      !payuReady
                        ? 'border-border opacity-50 cursor-not-allowed bg-muted/30'
                        : method === 'blik'
                          ? 'border-primary bg-primary/5 cursor-pointer'
                          : 'border-border hover:border-primary/50 cursor-pointer'
                    }`}
                  >
                    <RadioGroupItem id="m-blik" value="blik" className="mt-1" disabled={!payuReady} />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2 flex-wrap">
                        BLIK
                        {!payuReady && (
                          <span className="text-xs text-destructive font-normal">Tymczasowo niedostępne</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Wpisz 6-cyfrowy kod z aplikacji bankowej.</p>
                      {method === 'blik' && payuReady && (
                        <div className="mt-3 max-w-xs">
                          <Label className="text-xs">Kod BLIK</Label>
                          <Input
                            inputMode="numeric" maxLength={6} placeholder="123456"
                            value={blikCode}
                            onChange={(e) => setBlikCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="text-center text-2xl tracking-widest font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                )}
              </RadioGroup>
            )}

            {method === 'transfer' && order.paid_events.transfer_payment_details && (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs font-semibold mb-1">Dane do przelewu (zostaną też wysłane mailem):</div>
                <pre className="text-xs whitespace-pre-wrap font-mono">{order.paid_events.transfer_payment_details}</pre>
                <p className="text-xs text-muted-foreground mt-2">
                  Tytuł przelewu: <strong>{order.ticket_code} — {order.first_name} {order.last_name}</strong>
                </p>
              </div>
            )}

            <div className="pt-2 text-xs text-muted-foreground">
              Akceptuję warunki polityki prywatności. Zgadzam się na otrzymywanie informacji dotyczących zamówień w myśl ustawy z dnia 18 lipca 2002r. o świadczeniu usług drogą elektroniczną. Więcej na{' '}
              <a href="/page/polityka-prywatnosci" target="_blank" className="text-primary underline">polityka prywatności</a>.
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="accept" checked={acceptTerms} onCheckedChange={(c) => setAcceptTerms(c === true)} />
              <Label htmlFor="accept" className="text-sm cursor-pointer">
                Przeczytałem/am i akceptuję warunki i zasady *
              </Label>
            </div>

            {(method === 'payu' || method === 'blik') && !payuReady && !payuLoading && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {payuReason ?? 'PayU jest tymczasowo niedostępne.'} Wybierz inną metodę płatności
                  {availableMethods.includes('transfer') ? ' (np. przelew bankowy).' : '.'}
                </span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                size="lg"
                onClick={handlePay}
                disabled={
                  busy ||
                  !method ||
                  !acceptTerms ||
                  (method === 'blik' && blikCode.length !== 6) ||
                  ((method === 'payu' || method === 'blik') && !payuReady)
                }
                className="min-w-[200px]"
              >
                {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{polling ? 'Czekam…' : 'Przetwarzanie…'}</> : 'Kupuję i płacę'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 text-center text-xs text-muted-foreground pt-4">
          <div className="flex flex-col items-center gap-1"><Shield className="w-5 h-5 text-primary" /><span>Chronimy<br/>Twoje dane</span></div>
          <div className="flex flex-col items-center gap-1"><BadgeCheck className="w-5 h-5 text-primary" /><span>100%<br/>Satysfakcji</span></div>
          <div className="flex flex-col items-center gap-1"><Lock className="w-5 h-5 text-primary" /><span>Połączenie<br/>jest szyfrowane</span></div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
