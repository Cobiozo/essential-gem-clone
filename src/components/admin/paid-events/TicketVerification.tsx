import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, CheckCircle, XCircle, User, Calendar, Ticket, Search, Camera, Users, RefreshCw, Loader2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Scanner } from '@yudiel/react-qr-scanner';

interface VerificationResult {
  valid: boolean;
  message: string;
  ticket?: {
    ticket_code: string;
    buyer_name: string;
    buyer_email: string;
    event_title: string;
    event_date: string;
    is_checked_in: boolean;
    checked_in_at: string | null;
  };
  checked_in?: boolean;
  checkInStartsAt?: string | null;
  eventId?: string | null;
}

interface EventOption {
  id: string;
  title: string;
  event_date: string;
}

interface OrderRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  email_confirmed_at: string | null;
  ticket_code: string | null;
  ticket_sent_at: string | null;
  checked_in: boolean | null;
  checked_in_at: string | null;
  created_at: string;
}

export const TicketVerification: React.FC = () => {
  const { toast } = useToast();
  const [ticketCode, setTicketCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [search, setSearch] = useState('');

  const extractCode = (raw: string): string => {
    const trimmed = raw.trim();
    const m = trimmed.match(/\/ticket\/([A-Z0-9-]+)/i);
    return (m ? m[1] : trimmed).toUpperCase();
  };

  // Load events
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('paid_events')
        .select('id, title, event_date')
        .order('event_date', { ascending: false });
      if (error) {
        toast({ title: 'Błąd ładowania wydarzeń', description: error.message, variant: 'destructive' });
        return;
      }
      setEvents((data as EventOption[]) || []);
    })();
  }, []);

  const loadOrders = async (eventId: string) => {
    if (!eventId) { setOrders([]); return; }
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-event-orders', {
        body: { event_id: eventId },
      });
      if (error) throw error;
      setOrders((data?.orders || []) as OrderRow[]);
    } catch (e: any) {
      toast({ title: 'Błąd listy uczestników', description: e.message, variant: 'destructive' });
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(selectedEventId);
  }, [selectedEventId]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const eligible = orders.filter(o => o.email_confirmed_at || o.ticket_sent_at || (o.status && ['paid', 'completed', 'confirmed'].includes(o.status)));
    if (!q) return eligible;
    return eligible.filter(o => {
      const name = `${o.first_name || ''} ${o.last_name || ''}`.toLowerCase();
      const email = (o.email || '').toLowerCase();
      const code = (o.ticket_code || '').toLowerCase();
      return name.includes(q) || email.includes(q) || code.includes(q);
    });
  }, [orders, search]);

  const counts = useMemo(() => {
    const eligible = orders.filter(o => o.email_confirmed_at || o.ticket_sent_at || (o.status && ['paid', 'completed', 'confirmed'].includes(o.status)));
    return {
      total: eligible.length,
      checkedIn: eligible.filter(o => o.checked_in).length,
    };
  }, [orders]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const verifyTicket = async (code: string, mode: 'verify' | 'check_in' | 'check_out' = 'verify') => {
    if (!code.trim()) return;

    setIsVerifying(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = 'https://xzlhssqqbajqhnsmbucf.supabase.co';

      const response = await fetch(
        `${supabaseUrl}/functions/v1/verify-event-ticket`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            ticketCode: code.trim(),
            markAsCheckedIn: mode === 'check_in',
            action: mode === 'check_out' ? 'check_out' : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.valid === false) {
        setResult({ valid: false, message: data.error || 'Błąd weryfikacji biletu' });
        toast({ title: 'Bilet nieprawidłowy', description: data.error, variant: 'destructive' });
      } else {
        const buyerName = [data.attendee?.firstName, data.attendee?.lastName].filter(Boolean).join(' ').trim()
          || [data.buyer?.firstName, data.buyer?.lastName].filter(Boolean).join(' ').trim()
          || '—';
        const verifiedEventId: string | null = data.event?.id || null;
        const mapped = {
          ticket_code: data.order?.ticketCode || code.trim(),
          buyer_name: buyerName,
          buyer_email: data.attendee?.email || data.buyer?.email || '',
          event_title: data.event?.title || '',
          event_date: data.event?.date || '',
          is_checked_in: !!data.checkedIn,
          checked_in_at: data.checkedInAt || null,
        };
        setResult({
          valid: true,
          message: 'Bilet prawidłowy',
          ticket: mapped,
          checked_in: !!data.checkedIn,
          checkInStartsAt: data.checkInStartsAt || null,
          eventId: verifiedEventId,
        });

        // Warn if ticket belongs to different event than selected
        if (selectedEventId && verifiedEventId && verifiedEventId !== selectedEventId) {
          toast({
            title: 'Uwaga: inny event',
            description: `Bilet dotyczy: „${data.event?.title || '—'}", a wybrane jest inne wydarzenie.`,
            variant: 'destructive',
          });
        }

        if (data.action === 'check_in') {
          toast({ title: 'Check-in wykonany!', description: `Zarejestrowano wejście dla: ${buyerName}` });
        } else if (data.action === 'check_out') {
          toast({ title: 'Cofnięto check-in', description: buyerName });
        }

        // Sync list on any state-changing action
        if (data.action === 'check_in' || data.action === 'check_out') {
          const newCheckedIn = data.action === 'check_in';
          setOrders(prev => prev.map(o =>
            (o.ticket_code || '').toUpperCase() === mapped.ticket_code.toUpperCase()
              ? { ...o, checked_in: newCheckedIn, checked_in_at: newCheckedIn ? (data.checkedInAt || new Date().toISOString()) : null }
              : o
          ));
          if (selectedEventId && verifiedEventId === selectedEventId) {
            loadOrders(selectedEventId);
          }
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setResult({ valid: false, message: 'Błąd połączenia z serwerem' });
      toast({ title: 'Błąd', description: 'Nie udało się zweryfikować biletu', variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyTicket(ticketCode, 'verify');
  };

  const handleCheckIn = () => {
    if (result?.ticket?.ticket_code) {
      verifyTicket(result.ticket.ticket_code, 'check_in');
    }
  };

  const handleCheckOut = () => {
    if (result?.ticket?.ticket_code) {
      verifyTicket(result.ticket.ticket_code, 'check_out');
    }
  };

  const handleRowCheckIn = (code: string) => {
    setTicketCode(code);
    verifyTicket(code, 'check_in');
  };

  const handleRowCheckOut = (code: string) => {
    setTicketCode(code);
    verifyTicket(code, 'check_out');
  };

  const resetVerification = () => {
    setTicketCode('');
    setResult(null);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      {/* Event selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Weryfikacja biletów
          </CardTitle>
          <CardDescription>
            Wybierz wydarzenie, aby zobaczyć listę zarejestrowanych uczestników i wykonywać check-in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Wydarzenie</Label>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Wybierz wydarzenie..." />
            </SelectTrigger>
            <SelectContent>
              {events.map(ev => (
                <SelectItem key={ev.id} value={ev.id}>
                  {ev.title} — {format(new Date(ev.event_date), 'dd MMM yyyy, HH:mm', { locale: pl })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEventId && (
        <>
          {/* Scanner / manual input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kod biletu</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      ref={inputRef}
                      value={ticketCode}
                      onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                      placeholder="Wprowadź lub zeskanuj kod..."
                      className="pl-10 font-mono text-lg"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" disabled={isVerifying || !ticketCode.trim()}>
                    {isVerifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Sprawdź
                      </>
                    )}
                  </Button>
                </div>
                <Button type="button" variant="secondary" className="w-full" onClick={() => setScannerOpen(true)}>
                  <Camera className="w-4 h-4 mr-2" />
                  Skanuj aparatem telefonu
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Result */}
          {result && (
            <Card className={result.valid ? 'border-green-500' : 'border-destructive'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  {result.valid ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <span className="text-green-600">Bilet prawidłowy</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-destructive" />
                      <span className="text-destructive">Bilet nieprawidłowy</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.valid && result.ticket ? (
                  <>
                    <div className="grid gap-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{result.ticket.buyer_name}</span>
                        <span className="text-muted-foreground">({result.ticket.buyer_email})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{result.ticket.event_title}</span>
                      </div>
                      {result.ticket.event_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{format(new Date(result.ticket.event_date), 'dd MMMM yyyy, HH:mm', { locale: pl })}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Kod:</span>
                        <code className="font-mono bg-muted px-2 py-1 rounded">{result.ticket.ticket_code}</code>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      {result.ticket.is_checked_in || result.checked_in ? (
                        <Badge variant="outline" className="text-green-600 border-green-600 text-base py-2 px-4">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Check-in wykonany
                          {result.ticket.checked_in_at && (
                            <span className="ml-2 text-muted-foreground">
                              ({format(new Date(result.ticket.checked_in_at), 'HH:mm', { locale: pl })})
                            </span>
                          )}
                        </Badge>
                      ) : (
                        <>
                          <Button onClick={handleCheckIn} size="lg" className="w-full">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Wykonaj check-in
                          </Button>
                          {result.checkInStartsAt && new Date(result.checkInStartsAt) > new Date() && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              Bilet ważny. Check-in możliwy od{' '}
                              {format(new Date(result.checkInStartsAt), 'dd MMMM yyyy, HH:mm', { locale: pl })}.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">{result.message}</p>
                )}

                <Button variant="outline" onClick={resetVerification} className="w-full">
                  Skanuj kolejny bilet
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Attendees list */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-5 h-5" />
                  Lista uczestników
                  {selectedEvent && <span className="text-sm text-muted-foreground font-normal">— {selectedEvent.title}</span>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{counts.total} zarejestrowanych</Badge>
                  <Badge variant="outline" className="text-green-600 border-green-600">{counts.checkedIn} po check-in</Badge>
                  <Button size="sm" variant="ghost" onClick={() => loadOrders(selectedEventId)} disabled={ordersLoading}>
                    <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Szukaj: imię, e-mail, kod biletu..."
                  className="pl-10"
                />
              </div>

              {ordersLoading ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : filteredOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {orders.length === 0 ? 'Brak zarejestrowanych uczestników.' : 'Brak wyników dla wyszukiwania.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredOrders.map(o => {
                    const name = `${o.first_name || ''} ${o.last_name || ''}`.trim() || '—';
                    return (
                      <div
                        key={o.id}
                        className={`flex items-center gap-3 p-3 rounded-md border ${o.checked_in ? 'bg-green-500/5 border-green-500/30' : 'bg-card'}`}
                      >
                        <div className="shrink-0">
                          {o.checked_in ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <div className="w-5 h-5 rounded border-2 border-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{name}</div>
                          <div className="text-xs text-muted-foreground truncate">{o.email || '—'}</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{o.ticket_code || '—'}</code>
                          {o.checked_in && o.checked_in_at && (
                            <div className="text-xs text-green-600 mt-1">
                              {format(new Date(o.checked_in_at), 'dd.MM HH:mm', { locale: pl })}
                            </div>
                          )}
                        </div>
                        {!o.checked_in && o.ticket_code && (
                          <Button size="sm" variant="outline" onClick={() => handleRowCheckIn(o.ticket_code!)} disabled={isVerifying}>
                            <CheckCircle className="w-4 h-4 mr-1" />Check-in
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Camera className="w-5 h-5" />Skanuj kod QR</DialogTitle>
            <DialogDescription>
              Skieruj aparat na kod QR z biletu. Po zeskanowaniu zobaczysz dane uczestnika — check-in wykonasz osobnym przyciskiem.
            </DialogDescription>
          </DialogHeader>
          {scannerOpen && (
            <div className="rounded-md overflow-hidden bg-black aspect-square">
              <Scanner
                onScan={(codes) => {
                  if (!codes || codes.length === 0) return;
                  const raw = codes[0].rawValue || '';
                  if (!raw) return;
                  const code = extractCode(raw);
                  setScannerOpen(false);
                  setTicketCode(code);
                  verifyTicket(code, false);
                }}
                onError={(err) => {
                  console.error('[QR Scanner]', err);
                  toast({ title: 'Błąd kamery', description: 'Nie udało się uruchomić aparatu. Sprawdź uprawnienia w przeglądarce.', variant: 'destructive' });
                }}
                constraints={{ facingMode: 'environment' }}
                scanDelay={400}
                allowMultiple={false}
                components={{ finder: true }}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Wymagany dostęp do kamery (HTTPS lub localhost). Na iPhonie użyj Safari.
          </p>
        </DialogContent>
      </Dialog>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instrukcja</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>Wybierz wydarzenie</strong> z listy powyżej, aby zobaczyć zarejestrowanych uczestników.</p>
          <p>• <strong>Aparat telefonu:</strong> kliknij „Skanuj aparatem telefonu" — po zeskanowaniu od razu zobaczysz dane biletu; check-in wykonaj przyciskiem „Wykonaj check-in".</p>
          <p>• <strong>Ręcznie:</strong> wpisz kod biletu i kliknij „Sprawdź", następnie „Wykonaj check-in".</p>
          <p>• <strong>Z listy:</strong> kliknij „Check-in" przy konkretnym uczestniku, aby od razu zaznaczyć go jako obecnego.</p>
        </CardContent>
      </Card>
    </div>
  );
};
