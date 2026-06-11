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
import { QrCode, CheckCircle, XCircle, User, Calendar, Ticket, Search, Camera, Users, RefreshCw, Loader2, RotateCcw, Download, FileSpreadsheet, FileText, FileCode } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Scanner } from '@yudiel/react-qr-scanner';
import * as XLSX from 'xlsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
  accountDeleted?: boolean;
  accountDeletedAt?: string | null;
  accountDeletedAction?: string | null;
  accountDeletedSnapshot?: { first_name?: string | null; last_name?: string | null; email?: string | null; roles?: string[] } | null;
}


interface EventOption {
  id: string;
  title: string;
  event_date: string;
}

interface AttendeeRow {
  id: string;
  seat_index: number | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  ticket_code: string | null;
  checked_in: boolean | null;
  checked_in_at: string | null;
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
  paid_event_order_attendees?: AttendeeRow[] | null;
}

interface DisplayRow {
  key: string;
  order_id: string;
  attendee_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  ticket_code: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
}

export const TicketVerificationPanel: React.FC = () => {
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
      if (error) {
        // Wyciągnij prawdziwy komunikat z FunctionsHttpError (Supabase opakowuje 4xx/5xx)
        let detail = error.message || 'Edge Function error';
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) detail = `${body.error}${body.code ? ` (${body.code})` : ''}`;
          } else if (ctx && typeof ctx.text === 'function') {
            const txt = await ctx.text();
            if (txt) detail = txt;
          }
        } catch { /* ignore */ }
        console.warn('[TicketVerification] admin-list-event-orders failed, trying direct fallback:', detail);

        // Fallback: spróbuj pobrać dane bezpośrednio (admin ma RLS).
        const { data: ordersDirect, error: ordErr } = await supabase
          .from('paid_event_orders')
          .select('id, email, first_name, last_name, status, email_confirmed_at, ticket_code, ticket_sent_at, checked_in, checked_in_at, created_at, ticket_id')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        if (ordErr) {
          toast({ title: 'Błąd listy uczestników', description: detail, variant: 'destructive' });
          setOrders([]);
          return;
        }
        const orderIds = (ordersDirect || []).map((o: any) => o.id);
        let attendees: any[] = [];
        if (orderIds.length > 0) {
          const { data: att } = await supabase
            .from('paid_event_order_attendees')
            .select('id, order_id, seat_index, first_name, last_name, email, ticket_code, checked_in, checked_in_at')
            .in('order_id', orderIds);
          attendees = att || [];
        }
        const byOrder: Record<string, any[]> = {};
        attendees.forEach((a) => { (byOrder[a.order_id] ||= []).push(a); });
        const merged = (ordersDirect || []).map((o: any) => ({
          ...o,
          paid_event_order_attendees: byOrder[o.id] || [],
        }));
        setOrders(merged as OrderRow[]);
        return;
      }
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

  const displayRows = useMemo<DisplayRow[]>(() => {
    const eligible = orders.filter(o => o.email_confirmed_at || o.ticket_sent_at || (o.status && ['paid', 'completed', 'confirmed'].includes(o.status)));
    const rows: DisplayRow[] = [];
    for (const o of eligible) {
      const attendees = o.paid_event_order_attendees || [];
      if (attendees.length > 0) {
        for (const a of attendees) {
          rows.push({
            key: a.id,
            order_id: o.id,
            attendee_id: a.id,
            first_name: a.first_name || o.first_name,
            last_name: a.last_name || o.last_name,
            email: a.email || o.email,
            ticket_code: a.ticket_code || o.ticket_code,
            checked_in: !!a.checked_in,
            checked_in_at: a.checked_in_at,
          });
        }
      } else {
        rows.push({
          key: o.id,
          order_id: o.id,
          attendee_id: null,
          first_name: o.first_name,
          last_name: o.last_name,
          email: o.email,
          ticket_code: o.ticket_code,
          checked_in: !!o.checked_in,
          checked_in_at: o.checked_in_at,
        });
      }
    }
    return rows;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayRows;
    return displayRows.filter(r => {
      const name = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
      const email = (r.email || '').toLowerCase();
      const code = (r.ticket_code || '').toLowerCase();
      return name.includes(q) || email.includes(q) || code.includes(q);
    });
  }, [displayRows, search]);

  const counts = useMemo(() => ({
    total: displayRows.length,
    checkedIn: displayRows.filter(r => r.checked_in).length,
  }), [displayRows]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const exportAttendees = (fmt: 'xlsx' | 'doc' | 'html') => {
    if (!filteredOrders.length) return;
    const title = selectedEvent?.title || 'wydarzenie';
    const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'wydarzenie';
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const headers = ['Lp.', 'Imię', 'Nazwisko', 'Email', 'Kod biletu', 'Check-in', 'Data check-in'];
    const rows = filteredOrders.map((r, i) => [
      i + 1,
      r.first_name || '',
      r.last_name || '',
      r.email || '',
      r.ticket_code || '',
      r.checked_in ? 'Tak' : 'Nie',
      r.checked_in_at
        ? new Date(r.checked_in_at).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })
        : '',
    ]);

    try {
      if (fmt === 'xlsx') {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        (ws as any)['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 22 }, { wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Uczestnicy');
        XLSX.writeFile(wb, `uczestnicy-${slug}-${dateStr}.xlsx`);
      } else {
        const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
        const thead = `<tr>${headers.map(h => `<th style="background:#f0f0f0;border:1px solid #999;padding:6px 8px;text-align:left;font-family:Arial,sans-serif;">${esc(h)}</th>`).join('')}</tr>`;
        const tbody = rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #ccc;padding:6px 8px;font-family:Arial,sans-serif;">${esc(c)}</td>`).join('')}</tr>`).join('');
        const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Lista uczestników - ${esc(title)}</title></head><body style="font-family:Arial,sans-serif;"><h1 style="font-size:18px;">Lista uczestników – ${esc(title)}</h1><p style="color:#555;font-size:12px;">Wygenerowano: ${esc(new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }))} • Liczba uczestników: ${rows.length}</p><table style="border-collapse:collapse;width:100%;font-size:12px;">${thead}${tbody}</table></body></html>`;
        const mime = fmt === 'doc' ? 'application/msword' : 'text/html;charset=utf-8';
        const ext = fmt === 'doc' ? 'doc' : 'html';
        const blob = new Blob(['\ufeff', html], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `uczestnicy-${slug}-${dateStr}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      toast({ title: 'Eksport gotowy', description: `Pobrano listę (${rows.length} ${rows.length === 1 ? 'uczestnik' : 'uczestników'}).` });
    } catch (e: any) {
      toast({ title: 'Błąd eksportu', description: e?.message || 'Nie udało się wyeksportować listy.', variant: 'destructive' });
    }
  };

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
          accountDeleted: !!data.accountDeleted,
          accountDeletedAt: data.accountDeletedAt || null,
          accountDeletedAction: data.accountDeletedAction || null,
          accountDeletedSnapshot: data.accountDeletedSnapshot || null,
        });

        if (data.accountDeleted) {
          toast({
            title: 'Konto zostało usunięte',
            description: 'Bilet jest ważny, ale konto przypisane do biletu zostało usunięte z platformy.',
            variant: 'destructive',
          });
        }


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
          const scannedCode = code.trim().toUpperCase();
          const newCheckedAt = newCheckedIn ? (data.checkedInAt || new Date().toISOString()) : null;
          setOrders(prev => prev.map(o => {
            const orderMatches = (o.ticket_code || '').toUpperCase() === scannedCode;
            const attendees = o.paid_event_order_attendees || [];
            const attendeeMatches = attendees.some(a => (a.ticket_code || '').toUpperCase() === scannedCode);
            if (!orderMatches && !attendeeMatches) return o;

            // Legacy: scanned code is the order code, but attendees have their own codes.
            // Mirror the check-in onto the "primary" attendee (email match → seat 0 → first)
            // so the participants list reflects it immediately.
            let primaryAttendeeId: string | null = null;
            if (orderMatches && !attendeeMatches && attendees.length > 0) {
              const byEmail = attendees.find(
                a => (a.email || '').toLowerCase() === (o.email || '').toLowerCase()
              );
              const sorted = [...attendees].sort(
                (a, b) => (a.seat_index ?? 0) - (b.seat_index ?? 0)
              );
              primaryAttendeeId = (byEmail || sorted[0]).id;
            }

            return {
              ...o,
              checked_in: attendeeMatches ? o.checked_in : newCheckedIn,
              checked_in_at: attendeeMatches ? o.checked_in_at : newCheckedAt,
              paid_event_order_attendees: attendees.map(a => {
                const codeMatch = (a.ticket_code || '').toUpperCase() === scannedCode;
                if (codeMatch || a.id === primaryAttendeeId) {
                  return { ...a, checked_in: newCheckedIn, checked_in_at: newCheckedAt };
                }
                return a;
              }),
            };
          }));
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

                    <div className="pt-3 border-t space-y-3">
                      {result.ticket.is_checked_in || result.checked_in ? (
                        <>
                          <Badge variant="outline" className="text-green-600 border-green-600 text-base py-2 px-4">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Check-in wykonano
                            {result.ticket.checked_in_at && (
                              <span className="ml-2 text-muted-foreground">
                                ({format(new Date(result.ticket.checked_in_at), 'dd.MM.yyyy HH:mm', { locale: pl })})
                              </span>
                            )}
                          </Badge>
                          <Button onClick={handleCheckOut} size="lg" variant="outline" className="w-full" disabled={isVerifying}>
                            <RotateCcw className="w-5 h-5 mr-2" />
                            Cofnij check-in
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={handleCheckIn} size="lg" className="w-full" disabled={isVerifying}>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={ordersLoading || filteredOrders.length === 0}
                        className="gap-1"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Eksport</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportAttendees('xlsx')}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel (.xlsx)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportAttendees('doc')}>
                        <FileText className="w-4 h-4 mr-2" /> Word (.doc)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportAttendees('html')}>
                        <FileCode className="w-4 h-4 mr-2" /> HTML (.html)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                        key={o.key}
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
                        {o.ticket_code && (
                          o.checked_in ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />Check-in
                              </Badge>
                              <Button size="sm" variant="outline" onClick={() => handleRowCheckOut(o.ticket_code!)} disabled={isVerifying}>
                                <RotateCcw className="w-4 h-4 mr-1" />Check-out
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleRowCheckIn(o.ticket_code!)} disabled={isVerifying}>
                              <CheckCircle className="w-4 h-4 mr-1" />Check-in
                            </Button>
                          )
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
                  verifyTicket(code, 'verify');
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
