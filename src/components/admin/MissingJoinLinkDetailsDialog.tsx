import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle2, RotateCcw, AlertTriangle, Send, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Props {
  alertId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: () => void;
  onManualResend?: () => Promise<void> | void;
}

interface AlertRow {
  id: string;
  event_id: string;
  event_title: string | null;
  occurrence_datetime: string | null;
  recipient_email: string;
  recipient_name: string | null;
  reason: string;
  attempt_count: number;
  max_attempts: number;
  last_attempt_at: string | null;
  last_error: string | null;
  next_retry_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

interface LogRow {
  id: string;
  attempt_no: number;
  attempted_at: string;
  outcome: string;
  error_message: string | null;
  triggered_by: string;
  zoom_link_used: string | null;
}

const OUTCOME_LABEL: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  sent: { label: 'Wysłano', variant: 'default' },
  smtp_error: { label: 'Błąd SMTP', variant: 'destructive' },
  no_link: { label: 'Brak linku', variant: 'destructive' },
  manual_resend: { label: 'Ręczna wysyłka', variant: 'secondary' },
  max_attempts_exhausted: { label: 'Wyczerpano próby', variant: 'destructive' },
};

export const MissingJoinLinkDetailsDialog: React.FC<Props> = ({ alertId, open, onOpenChange, onResolved, onManualResend }) => {
  const { toast } = useToast();
  const [alert, setAlert] = useState<AlertRow | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [eventInfo, setEventInfo] = useState<{ zoom_link: string | null; location: string | null; occurrences: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!alertId) return;
    setLoading(true);
    try {
      const { data: alertRow } = await (supabase.from('missing_join_link_alerts' as any) as any)
        .select('*')
        .eq('id', alertId)
        .maybeSingle();
      setAlert(alertRow || null);

      const { data: logRows } = await (supabase.from('join_link_retry_log' as any) as any)
        .select('*')
        .eq('alert_id', alertId)
        .order('attempted_at', { ascending: false });
      setLogs(logRows || []);

      if (alertRow?.event_id) {
        const { data: ev } = await supabase
          .from('events')
          .select('zoom_link, location, occurrences')
          .eq('id', alertRow.event_id)
          .maybeSingle();
        setEventInfo(ev as any);
      }
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => { if (open && alertId) load(); }, [open, alertId, load]);

  // Diagnostic: which link would be used right now?
  const currentLink = React.useMemo(() => {
    if (!eventInfo || !alert) return { link: '', source: 'brak' };
    const occIso = alert.occurrence_datetime;
    if (occIso) {
      const d = new Date(occIso);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const dateStr = `${y}-${m}-${dd}`;
        const timeStr = `${hh}:${mm}`;
        const occs = Array.isArray(eventInfo.occurrences) ? eventInfo.occurrences : [];
        const match = occs.find((o: any) => o?.date === dateStr && (o?.time === timeStr || o?.time === `${hh}:${mm}:00`));
        if (match?.zoom_link) return { link: String(match.zoom_link), source: 'occurrences[]' };
      }
    }
    if (eventInfo.zoom_link) return { link: String(eventInfo.zoom_link), source: 'events.zoom_link' };
    if (eventInfo.location) return { link: String(eventInfo.location), source: 'events.location (fallback)' };
    return { link: '', source: 'brak — wszystkie fallbacki puste' };
  }, [eventInfo, alert]);

  const handleManualResend = async () => {
    if (!onManualResend || !alert) return;
    setBusy('resend');
    try {
      await onManualResend();
      // Log manual attempt
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id || 'unknown';
      await (supabase.from('join_link_retry_log' as any) as any).insert({
        alert_id: alert.id,
        attempt_no: (alert.attempt_count || 0) + 1,
        outcome: 'manual_resend',
        triggered_by: `admin:${uid}`,
        zoom_link_used: currentLink.link || null,
      });
      await load();
    } catch (e: any) {
      toast({ title: 'Błąd', description: e?.message || 'Ręczna wysyłka nie powiodła się', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const handleMarkResolved = async () => {
    if (!alert) return;
    setBusy('resolve');
    try {
      const { data: userRes } = await supabase.auth.getUser();
      await (supabase.from('missing_join_link_alerts' as any) as any)
        .update({ resolved_at: new Date().toISOString(), resolved_by: userRes?.user?.id || null })
        .eq('id', alert.id);
      toast({ title: 'Oznaczono jako rozwiązane' });
      await load();
      onResolved?.();
    } catch (e: any) {
      toast({ title: 'Błąd', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const handleResetAttempts = async () => {
    if (!alert) return;
    setBusy('reset');
    try {
      await (supabase.from('missing_join_link_alerts' as any) as any)
        .update({ attempt_count: 0, next_retry_at: new Date().toISOString(), last_error: null })
        .eq('id', alert.id);
      toast({ title: 'Zresetowano licznik prób', description: 'CRON spróbuje ponownie w ciągu 2 minut.' });
      await load();
    } catch (e: any) {
      toast({ title: 'Błąd', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Szczegóły alertu „brak linku do webinaru"
          </DialogTitle>
          <DialogDescription>
            Diagnostyka, historia prób oraz ręczne ponowienie wysyłki linku Zoom.
          </DialogDescription>
        </DialogHeader>

        {loading || !alert ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header info */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-sm text-muted-foreground">Gość</div>
                  <div className="font-medium">{alert.recipient_name || '—'} • {alert.recipient_email}</div>
                </div>
                <Badge variant={alert.resolved_at ? 'default' : 'destructive'} className={alert.resolved_at ? 'bg-green-600 hover:bg-green-600' : ''}>
                  {alert.resolved_at ? 'Rozwiązane' : 'Otwarte'}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Webinar</div>
                <div className="font-medium">{alert.event_title || '—'}</div>
                {alert.occurrence_datetime && (
                  <div className="text-xs text-muted-foreground">
                    Termin okazji: {format(new Date(alert.occurrence_datetime), 'dd.MM.yyyy HH:mm', { locale: pl })}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Utworzono: {format(new Date(alert.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: pl })}
              </div>
            </div>

            {/* Diagnostics */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="font-semibold text-sm">Diagnostyka</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Przyczyna</div>
                  <div>
                    {alert.reason === 'no_link'
                      ? 'Brak linku Zoom w wydarzeniu / okazji'
                      : 'Błąd wysyłki emaila (SMTP)'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Próby</div>
                  <div>
                    <span className={alert.attempt_count >= alert.max_attempts ? 'text-destructive font-semibold' : ''}>
                      {alert.attempt_count} / {alert.max_attempts}
                    </span>
                    {alert.attempt_count >= alert.max_attempts && !alert.resolved_at && (
                      <span className="text-destructive"> — wyczerpano</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Ostatnia próba</div>
                  <div>{alert.last_attempt_at ? format(new Date(alert.last_attempt_at), 'dd.MM.yyyy HH:mm:ss', { locale: pl }) : '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Następna próba (CRON)</div>
                  <div>{alert.next_retry_at ? format(new Date(alert.next_retry_at), 'dd.MM.yyyy HH:mm:ss', { locale: pl }) : (alert.resolved_at ? '— (rozwiązane)' : '— (brak zaplanowanej)')}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-muted-foreground text-xs">Aktualny link (co użyje kolejna próba)</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentLink.link ? (
                      <a href={currentLink.link} target="_blank" rel="noreferrer" className="text-primary underline break-all inline-flex items-center gap-1">
                        {currentLink.link} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-destructive">— pusty —</span>
                    )}
                    <Badge variant="outline" className="text-xs">źródło: {currentLink.source}</Badge>
                  </div>
                </div>
                {alert.last_error && (
                  <div className="md:col-span-2">
                    <div className="text-muted-foreground text-xs">Ostatni błąd</div>
                    <div className="text-destructive text-xs font-mono bg-destructive/10 p-2 rounded break-all">{alert.last_error}</div>
                  </div>
                )}
              </div>
            </div>

            {/* History */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="font-semibold text-sm">Historia prób ({logs.length})</div>
              {logs.length === 0 ? (
                <div className="text-sm text-muted-foreground">Brak wpisów.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">#</th>
                        <th className="text-left py-2 px-2">Kiedy</th>
                        <th className="text-left py-2 px-2">Źródło</th>
                        <th className="text-left py-2 px-2">Wynik</th>
                        <th className="text-left py-2 px-2">Błąd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(l => {
                        const meta = OUTCOME_LABEL[l.outcome] || { label: l.outcome, variant: 'outline' as const };
                        return (
                          <tr key={l.id} className="border-b last:border-0 align-top">
                            <td className="py-2 px-2 font-mono">{l.attempt_no}</td>
                            <td className="py-2 px-2 whitespace-nowrap">{format(new Date(l.attempted_at), 'dd.MM HH:mm:ss', { locale: pl })}</td>
                            <td className="py-2 px-2">
                              {l.triggered_by.startsWith('admin:') ? (
                                <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">CRON</Badge>
                              )}
                            </td>
                            <td className="py-2 px-2"><Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge></td>
                            <td className="py-2 px-2 text-muted-foreground max-w-[240px] break-all">{l.error_message || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => load()} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" /> Odśwież
          </Button>
          {alert && !alert.resolved_at && (
            <>
              <Button variant="outline" onClick={handleResetAttempts} disabled={!!busy}>
                {busy === 'reset' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                Reset licznika
              </Button>
              <Button variant="secondary" onClick={handleMarkResolved} disabled={!!busy}>
                {busy === 'resolve' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Oznacz jako rozwiązane
              </Button>
              {onManualResend && (
                <Button onClick={handleManualResend} disabled={!!busy}>
                  {busy === 'resend' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Wyślij teraz ręcznie
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MissingJoinLinkDetailsDialog;
