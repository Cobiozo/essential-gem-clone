import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Undo2, UserX, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  deletion_requested_at: string | null;
  deletion_scheduled_at: string | null;
  deletion_status: string | null;
}

interface LogRow {
  id: string;
  user_id: string | null;
  email_snapshot: string | null;
  full_name_snapshot: string | null;
  requested_at: string | null;
  acted_at: string | null;
  acted_by: string | null;
  final_action: string | null;
  notes: string | null;
  user_email_sent_at?: string | null;
  user_email_status?: string | null;
  user_email_error?: string | null;
}

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  restored: { label: 'Przywrócone', variant: 'secondary' },
  anonymized: { label: 'Zanonimizowane', variant: 'outline' },
  deleted: { label: 'Usunięte (admin)', variant: 'destructive' },
  auto_deleted: { label: 'Usunięte automatycznie', variant: 'destructive' },
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
};

const daysLeft = (iso?: string | null) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
};

export const DeletedAccountsManagement: React.FC = () => {
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, lRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, deletion_requested_at, deletion_scheduled_at, deletion_status')
        .in('deletion_status', ['pending', 'anonymized'])
        .order('deletion_requested_at', { ascending: false }),
      supabase
        .from('account_deletion_log')
        .select('*')
        .not('final_action', 'is', null)
        .order('acted_at', { ascending: false })
        .limit(200),
    ]);
    setPending((pRes.data as any) || []);
    setLogs((lRes.data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const callAction = async (userId: string, action: 'restore' | 'anonymize' | 'delete') => {
    setBusyId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-finalize-account-deletion', {
        body: { userId, action },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || 'Operacja nie powiodła się');
      }
      toast({
        title: 'Wykonano',
        description:
          action === 'restore' ? 'Konto przywrócone.'
          : action === 'anonymize' ? 'Konto zanonimizowane.'
          : 'Konto trwale usunięte.',
      });
      await load();
    } catch (e: any) {
      toast({ title: 'Błąd', description: e?.message || 'Operacja nie powiodła się', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" /> Usunięte konta
          </CardTitle>
          <CardDescription>
            Konta zgłoszone do usunięcia przez użytkowników oraz historia zakończonych decyzji.
            Konta oczekujące są trwale usuwane automatycznie po 30 dniach od zgłoszenia.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Oczekujące ({pending.filter(p => p.deletion_status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="anonymized">
            Zanonimizowane ({pending.filter(p => p.deletion_status === 'anonymized').length})
          </TabsTrigger>
          <TabsTrigger value="history">Historia ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Ładowanie…</p>}
          {!loading && pending.filter(p => p.deletion_status === 'pending').length === 0 && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Brak kont oczekujących na usunięcie.</CardContent></Card>
          )}
          {pending.filter(p => p.deletion_status === 'pending').map((row) => {
            const days = daysLeft(row.deletion_scheduled_at);
            const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || '(brak imienia)';
            return (
              <Card key={row.user_id}>
                <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-muted-foreground">{row.email || '—'}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Zgłoszono: {formatDate(row.deletion_requested_at)}</span>
                      <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Auto-usunięcie: {formatDate(row.deletion_scheduled_at)}</span>
                      {days !== null && (
                        <Badge variant={days <= 7 ? 'destructive' : 'secondary'}>
                          {days === 0 ? 'dziś' : `za ${days} dni`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" disabled={busyId === row.user_id}
                      onClick={() => callAction(row.user_id, 'restore')}>
                      <Undo2 className="w-4 h-4 mr-1" /> Przywróć
                    </Button>
                    <ConfirmButton label="Zanonimizuj"
                      icon={<UserX className="w-4 h-4 mr-1" />}
                      title="Zanonimizować konto?"
                      desc="Dane osobowe (imię, nazwisko, e-mail, telefon, avatar) zostaną wyczyszczone, ale samo konto pozostanie w bazie. Operacja nieodwracalna."
                      busy={busyId === row.user_id}
                      onConfirm={() => callAction(row.user_id, 'anonymize')} />
                    <ConfirmButton label="Usuń trwale teraz" variant="destructive"
                      icon={<Trash2 className="w-4 h-4 mr-1" />}
                      title="Usunąć konto trwale?"
                      desc="Konto zostanie natychmiast i nieodwracalnie usunięte z bazy auth. Powiązania z eventami/rejestracjami zostaną zanonimizowane."
                      busy={busyId === row.user_id}
                      onConfirm={() => callAction(row.user_id, 'delete')} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="anonymized" className="space-y-3">
          {pending.filter(p => p.deletion_status === 'anonymized').length === 0 && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Brak zanonimizowanych kont.</CardContent></Card>
          )}
          {pending.filter(p => p.deletion_status === 'anonymized').map((row) => (
            <Card key={row.user_id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">Konto zanonimizowane</div>
                  <div className="text-muted-foreground text-xs">user_id: {row.user_id}</div>
                </div>
                <ConfirmButton label="Usuń trwale" variant="destructive"
                  icon={<Trash2 className="w-4 h-4 mr-1" />}
                  title="Usunąć konto trwale?"
                  desc="Konto zostanie nieodwracalnie usunięte z bazy auth."
                  busy={busyId === row.user_id}
                  onConfirm={() => callAction(row.user_id, 'delete')} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {logs.length === 0 && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Brak wpisów w historii.</CardContent></Card>
          )}
          {logs.map((r) => {
            const a = ACTION_LABELS[r.final_action || ''] || { label: r.final_action || '—', variant: 'secondary' as const };
            const mailStatus = r.user_email_status;
            return (
              <Card key={r.id}>
                <CardContent className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-sm">
                    <div className="font-medium">{r.full_name_snapshot || '—'}</div>
                    <div className="text-xs text-muted-foreground">{r.email_snapshot || '—'}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Zgłoszono: {formatDate(r.requested_at)} · Zakończono: {formatDate(r.acted_at)}
                      {r.acted_by ? ' · przez admina' : ' · automatycznie'}
                    </div>
                    {mailStatus === 'sent' && (
                      <div className="text-xs text-green-600 mt-1">
                        E-mail potwierdzający wysłany: {formatDate(r.user_email_sent_at)}
                      </div>
                    )}
                    {mailStatus === 'failed' && (
                      <div className="text-xs text-destructive mt-1" title={r.user_email_error || ''}>
                        E-mail potwierdzający: błąd wysyłki ({formatDate(r.user_email_sent_at)})
                        {r.user_email_error ? ` — ${r.user_email_error}` : ''}
                      </div>
                    )}
                    {!mailStatus && r.final_action && r.final_action !== 'restored' && (
                      <div className="text-xs text-muted-foreground mt-1 italic">
                        E-mail potwierdzający nie został wysłany (rekord historyczny).
                      </div>
                    )}
                    {r.notes && <div className="text-xs text-muted-foreground mt-1 italic">{r.notes}</div>}
                  </div>
                  <Badge variant={a.variant}>{a.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ConfirmButton: React.FC<{
  label: string;
  title: string;
  desc: string;
  busy: boolean;
  onConfirm: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'secondary' | 'outline';
}> = ({ label, title, desc, busy, onConfirm, icon, variant = 'outline' }) => {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant} disabled={busy}>{icon}{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Anuluj</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); onConfirm(); setOpen(false); }}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
            Potwierdź
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeletedAccountsManagement;
