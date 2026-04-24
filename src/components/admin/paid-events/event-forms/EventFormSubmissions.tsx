import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, CheckCircle2, XCircle, Clock, RotateCcw, Mail, MailCheck, MailX, Search, Download, UserPlus, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AssignPartnerDialog from './AssignPartnerDialog';

interface Props {
  form: any;
  onBack: () => void;
}

const PAYMENT_LABELS: Record<string, { label: string; cls: string; icon: any }> = {
  pending: { label: 'Oczekuje', cls: 'bg-yellow-500 text-white', icon: Clock },
  paid: { label: 'Opłacone', cls: 'bg-green-600 text-white', icon: CheckCircle2 },
  cancelled: { label: 'Anulowane', cls: 'bg-gray-500 text-white', icon: XCircle },
  refunded: { label: 'Zwrócone', cls: 'bg-blue-600 text-white', icon: RotateCcw },
};

export const EventFormSubmissions: React.FC<Props> = ({ form, onBack }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [assignFor, setAssignFor] = useState<{ id: string; partnerUserId: string | null } | null>(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['event-form-submissions', form.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_form_submissions')
        .select('*')
        .eq('form_id', form.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch partner profiles for badges
  const partnerIds = Array.from(new Set(submissions.map(s => s.partner_user_id).filter(Boolean))) as string[];
  const { data: partnersMap = {} } = useQuery({
    queryKey: ['event-form-partners', partnerIds.sort().join(',')],
    enabled: partnerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', partnerIds);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p; });
      return map;
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ submissionId, paymentStatus }: { submissionId: string; paymentStatus: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-mark-event-payment', {
        body: { submissionId, paymentStatus },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Błąd');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-form-submissions', form.id] });
      qc.invalidateQueries({ queryKey: ['event-form-submission-counts'] });
      toast({ title: 'Status zaktualizowany' });
    },
    onError: (e: Error) => toast({ title: 'Błąd', description: e.message, variant: 'destructive' }),
  });

  const resendEmail = useMutation({
    mutationFn: async (submissionId: string) => {
      const { data, error } = await supabase.functions.invoke('send-event-form-confirmation', {
        body: { submissionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-form-submissions', form.id] });
      toast({ title: 'Email wysłany ponownie' });
    },
    onError: (e: Error) => toast({ title: 'Błąd', description: e.message, variant: 'destructive' }),
  });

  const filtered = submissions.filter(s => {
    if (filter !== 'all' && s.payment_status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.email || '').toLowerCase().includes(q)
      || (s.first_name || '').toLowerCase().includes(q)
      || (s.last_name || '').toLowerCase().includes(q)
      || (s.phone || '').toLowerCase().includes(q);
  });

  const exportCsv = () => {
    const fieldsConfig = (form.fields_config || []) as Array<{ key: string; label: string }>;
    const headers = [
      'Data', 'Imię', 'Nazwisko', 'Email', 'Telefon',
      'Status płatności', 'Email status',
      'Email potwierdzony (data)', 'Anulowane (data)', 'Anulowane przez',
      'Partner imię', 'Partner nazwisko', 'Partner email',
      ...fieldsConfig.map(f => f.label),
    ];
    const rows = filtered.map(s => {
      const p = s.partner_user_id ? (partnersMap as any)[s.partner_user_id] : null;
      return [
        new Date(s.created_at).toLocaleString('pl-PL'),
        s.first_name || '', s.last_name || '', s.email || '', s.phone || '',
        s.payment_status, s.email_status,
        s.email_confirmed_at ? new Date(s.email_confirmed_at).toLocaleString('pl-PL') : '',
        s.cancelled_at ? new Date(s.cancelled_at).toLocaleString('pl-PL') : '',
        s.cancelled_by || '',
        p?.first_name || '', p?.last_name || '', p?.email || '',
        ...fieldsConfig.map(f => s.submitted_data?.[f.key] || ''),
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zgloszenia-${form.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fieldsConfig = (form.fields_config || []) as Array<{ key: string; label: string }>;

  const renderEmailCell = (s: any) => {
    // Cancelled wins
    if (s.cancelled_at) {
      const byGuest = s.cancelled_by === 'guest';
      const byAdmin = s.cancelled_by === 'admin';
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1 text-xs ${byGuest ? 'text-destructive' : 'text-orange-600'}`}>
                <MailX className="w-3 h-3" />
                <span className="font-medium">
                  {byGuest ? 'Anulował (gość)' : byAdmin ? 'Anulowane (admin)' : 'Anulowane'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{new Date(s.cancelled_at).toLocaleString('pl-PL')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (s.email_confirmed_at) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <MailCheck className="w-3 h-3" /> Potwierdził
              </div>
            </TooltipTrigger>
            <TooltipContent>{new Date(s.email_confirmed_at).toLocaleString('pl-PL')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (s.email_status === 'sent') {
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Mail className="w-3 h-3" /> Wysłany — czeka
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Mail className="w-3 h-3" /> {s.email_status || 'pending'}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Powrót
        </Button>
        <div>
          <h3 className="text-lg font-semibold">Zgłoszenia: {form.title}</h3>
          <p className="text-xs text-muted-foreground">
            {submissions.length} zgłoszeń ogółem
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Szukaj imienia, emaila, telefonu..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="flex h-10 rounded-md border border-input bg-background px-3 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Wszystkie</option>
          <option value="pending">Oczekuje</option>
          <option value="paid">Opłacone</option>
          <option value="cancelled">Anulowane</option>
          <option value="refunded">Zwrócone</option>
        </select>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="w-4 h-4 mr-1" /> Eksport CSV
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Ładowanie...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Brak zgłoszeń</CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Osoba</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Płatność</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Partner zapraszający</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => {
                const ps = PAYMENT_LABELS[s.payment_status] || PAYMENT_LABELS.pending;
                const PsIcon = ps.icon;
                const partner = s.partner_user_id ? (partnersMap as any)[s.partner_user_id] : null;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{new Date(s.created_at).toLocaleString('pl-PL')}</TableCell>
                    <TableCell>
                      <div className="font-medium">{s.first_name} {s.last_name}</div>
                      {fieldsConfig.length > 0 && (
                        <details className="text-xs text-muted-foreground mt-1">
                          <summary className="cursor-pointer hover:text-foreground">Dodatkowe dane</summary>
                          <div className="mt-1 space-y-0.5">
                            {fieldsConfig.map(f => (
                              s.submitted_data?.[f.key] ? (
                                <div key={f.key}><strong>{f.label}:</strong> {String(s.submitted_data[f.key])}</div>
                              ) : null
                            ))}
                          </div>
                        </details>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{s.email}</div>
                      {s.phone && <div className="text-muted-foreground">{s.phone}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge className={ps.cls}><PsIcon className="w-3 h-3 mr-1" />{ps.label}</Badge>
                    </TableCell>
                    <TableCell>{renderEmailCell(s)}</TableCell>
                    <TableCell className="text-xs">
                      {partner ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 font-medium">
                            <UserCheck className="w-3 h-3 text-green-600" />
                            {partner.first_name} {partner.last_name}
                          </div>
                          <div className="text-muted-foreground">{partner.email}</div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => setAssignFor({ id: s.id, partnerUserId: s.partner_user_id })}
                          >
                            Zmień
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setAssignFor({ id: s.id, partnerUserId: null })}
                        >
                          <UserPlus className="w-3 h-3 mr-1" /> Przypisz
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {s.payment_status !== 'paid' && (
                        <Button size="sm" variant="ghost" title="Oznacz jako opłacone" onClick={() => updatePayment.mutate({ submissionId: s.id, paymentStatus: 'paid' })}>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      {s.payment_status === 'paid' && (
                        <Button size="sm" variant="ghost" title="Cofnij do oczekującego" onClick={() => updatePayment.mutate({ submissionId: s.id, paymentStatus: 'pending' })}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      {s.payment_status !== 'cancelled' && (
                        <Button size="sm" variant="ghost" title="Anuluj zgłoszenie" onClick={() => {
                          if (confirm('Anulować to zgłoszenie?')) updatePayment.mutate({ submissionId: s.id, paymentStatus: 'cancelled' });
                        }}>
                          <XCircle className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" title="Wyślij email ponownie" onClick={() => resendEmail.mutate(s.id)}>
                        <Mail className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {assignFor && (
        <AssignPartnerDialog
          open={!!assignFor}
          onOpenChange={(o) => { if (!o) setAssignFor(null); }}
          submissionId={assignFor.id}
          currentPartnerUserId={assignFor.partnerUserId}
          onAssigned={() => qc.invalidateQueries({ queryKey: ['event-form-submissions', form.id] })}
        />
      )}
    </div>
  );
};
