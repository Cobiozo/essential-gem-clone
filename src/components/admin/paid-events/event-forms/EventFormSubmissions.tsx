import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CheckCircle2, XCircle, Clock, RotateCcw, Mail, MailCheck, MailX, Search, FileSpreadsheet, UserPlus, UserCheck, User as UserIcon, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AssignPartnerDialog from './AssignPartnerDialog';
import * as XLSX from 'xlsx-js-style';

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
  const [audience, setAudience] = useState<'all' | 'guests' | 'partners'>('all');
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

  // Identify which submissions belong to registered users (partners) vs guests by email match
  const submissionEmails = Array.from(new Set(
    submissions.map(s => (s.email || '').toLowerCase()).filter(Boolean)
  ));
  const { data: registeredEmailsSet } = useQuery({
    queryKey: ['event-form-submission-registered-emails', form.id, submissionEmails.sort().join(',')],
    enabled: submissionEmails.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .in('email', submissionEmails);
      if (error) throw error;
      return new Set((data || []).map((p: any) => (p.email || '').toLowerCase()));
    },
  });
  const registeredEmails = registeredEmailsSet || new Set<string>();
  const isPartnerSubmission = (s: any) => registeredEmails.has((s.email || '').toLowerCase());

  // Audience counts (independent of payment/search filter so user always sees totals)
  const audienceCounts = {
    all: submissions.length,
    partners: submissions.filter(isPartnerSubmission).length,
    guests: submissions.filter(s => !isPartnerSubmission(s)).length,
  };

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
    if (audience !== 'all') {
      const isPartner = isPartnerSubmission(s);
      if (audience === 'partners' && !isPartner) return false;
      if (audience === 'guests' && isPartner) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.email || '').toLowerCase().includes(q)
      || (s.first_name || '').toLowerCase().includes(q)
      || (s.last_name || '').toLowerCase().includes(q)
      || (s.phone || '').toLowerCase().includes(q);
  });

  const exportXlsx = () => {
    const fieldsConfig = (form.fields_config || []) as Array<{ key: string; label: string }>;

    // ----- Style helpers -----
    const border = { style: 'thin', color: { rgb: 'CBD5E1' } } as const;
    const allBorders = { top: border, bottom: border, left: border, right: border };
    const titleStyle: any = {
      font: { name: 'Calibri', sz: 18, bold: true, color: { rgb: '1E293B' } },
      fill: { fgColor: { rgb: 'D4AF37' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: allBorders,
    };
    const subTitleStyle: any = {
      font: { name: 'Calibri', sz: 11, italic: true, color: { rgb: '475569' } },
      fill: { fgColor: { rgb: 'FEF3C7' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: allBorders,
    };
    const summaryLabelStyle: any = {
      font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '475569' } },
      fill: { fgColor: { rgb: 'F1F5F9' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: allBorders,
    };
    const summaryValueStyle = (bg: string, fg: string): any => ({
      font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: fg } },
      fill: { fgColor: { rgb: bg } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: allBorders,
    });
    const headerStyle: any = {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3A5F' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: allBorders,
    };
    const baseCell = (alt: boolean): any => ({
      font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
      fill: { fgColor: { rgb: alt ? 'F8FAFC' : 'FFFFFF' } },
      alignment: { vertical: 'center', wrapText: true },
      border: allBorders,
    });
    const paymentStyle = (status: string, alt: boolean): any => {
      const map: Record<string, { bg: string; fg: string }> = {
        paid: { bg: 'D1FAE5', fg: '047857' },
        pending: { bg: 'FEF3C7', fg: '92400E' },
        cancelled: { bg: 'FEE2E2', fg: 'B91C1C' },
        refunded: { bg: 'DBEAFE', fg: '1D4ED8' },
      };
      const c = map[status] || { bg: alt ? 'F8FAFC' : 'FFFFFF', fg: '0F172A' };
      return {
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: c.fg } },
        fill: { fgColor: { rgb: c.bg } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: allBorders,
      };
    };
    const emailStyle = (status: string, alt: boolean): any => {
      const map: Record<string, { fg: string }> = {
        sent: { fg: '1D4ED8' },
        confirmed: { fg: '047857' },
        cancelled: { fg: 'B91C1C' },
        bounced: { fg: 'B91C1C' },
      };
      const c = map[status] || { fg: '0F172A' };
      return {
        font: { name: 'Calibri', sz: 10, color: { rgb: c.fg } },
        fill: { fgColor: { rgb: alt ? 'F8FAFC' : 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: allBorders,
      };
    };

    // ----- Compute summary -----
    const counts = {
      total: filtered.length,
      paid: filtered.filter(s => s.payment_status === 'paid').length,
      pending: filtered.filter(s => s.payment_status === 'pending').length,
      cancelled: filtered.filter(s => s.payment_status === 'cancelled').length,
      refunded: filtered.filter(s => s.payment_status === 'refunded').length,
    };

    // ----- Headers -----
    const headers = [
      'Lp.', 'Data zgłoszenia', 'Imię', 'Nazwisko', 'Email', 'Telefon',
      'Status płatności', 'Status email',
      'Email potwierdzony', 'Anulowane (data)', 'Anulowane przez',
      'Partner — imię', 'Partner — nazwisko', 'Partner — email',
      ...fieldsConfig.map(f => f.label),
    ];
    const totalCols = headers.length;
    const lastColLetter = XLSX.utils.encode_col(totalCols - 1);

    // ----- Build AOA -----
    const aoa: any[][] = [];
    // Row 1: brand title
    aoa.push([`Zgłoszenia: ${form.title || form.slug || ''}`, ...Array(totalCols - 1).fill('')]);
    // Row 2: subtitle
    aoa.push([`Wygenerowano: ${new Date().toLocaleString('pl-PL')}  •  Liczba zgłoszeń: ${counts.total}`, ...Array(totalCols - 1).fill('')]);
    // Row 3: empty spacer
    aoa.push(Array(totalCols).fill(''));
    // Row 4-5: summary tiles (label row + value row, each tile = 2 cols)
    const summary = [
      { label: 'Wszystkich', value: counts.total, bg: 'E2E8F0', fg: '0F172A' },
      { label: 'Opłaconych', value: counts.paid, bg: 'D1FAE5', fg: '047857' },
      { label: 'Oczekujących', value: counts.pending, bg: 'FEF3C7', fg: '92400E' },
      { label: 'Anulowanych', value: counts.cancelled, bg: 'FEE2E2', fg: 'B91C1C' },
      { label: 'Zwróconych', value: counts.refunded, bg: 'DBEAFE', fg: '1D4ED8' },
    ];
    const labelRow: any[] = [];
    const valueRow: any[] = [];
    summary.forEach(t => { labelRow.push(t.label, ''); valueRow.push(t.value, ''); });
    while (labelRow.length < totalCols) { labelRow.push(''); valueRow.push(''); }
    aoa.push(labelRow);
    aoa.push(valueRow);
    // Row 6: empty spacer
    aoa.push(Array(totalCols).fill(''));
    // Row 7: headers
    aoa.push(headers);
    // Data rows
    filtered.forEach((s, idx) => {
      const p = s.partner_user_id ? (partnersMap as any)[s.partner_user_id] : null;
      aoa.push([
        idx + 1,
        s.created_at ? new Date(s.created_at).toLocaleString('pl-PL') : '',
        s.first_name || '',
        s.last_name || '',
        s.email || '',
        s.phone || '',
        PAYMENT_LABELS[s.payment_status]?.label || s.payment_status || '',
        s.email_status || '',
        s.email_confirmed_at ? new Date(s.email_confirmed_at).toLocaleString('pl-PL') : '',
        s.cancelled_at ? new Date(s.cancelled_at).toLocaleString('pl-PL') : '',
        s.cancelled_by === 'guest' ? 'Gość' : s.cancelled_by === 'admin' ? 'Administrator' : (s.cancelled_by || ''),
        p?.first_name || '',
        p?.last_name || '',
        p?.email || '',
        ...fieldsConfig.map(f => {
          const v = s.submitted_data?.[f.key];
          if (v == null) return '';
          if (typeof v === 'boolean') return v ? 'Tak' : 'Nie';
          if (typeof v === 'object') return JSON.stringify(v);
          return String(v);
        }),
      ]);
    });
    // Footer
    aoa.push(Array(totalCols).fill(''));
    aoa.push([`Wygenerowano w panelu Pure Life — ${new Date().toLocaleString('pl-PL')}`, ...Array(totalCols - 1).fill('')]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // ----- Merges -----
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // title
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }, // subtitle
      // summary tiles: each label/value spans 2 cols
      ...summary.flatMap((_, i) => [
        { s: { r: 3, c: i * 2 }, e: { r: 3, c: i * 2 + 1 } },
        { s: { r: 4, c: i * 2 }, e: { r: 4, c: i * 2 + 1 } },
      ]),
      { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: totalCols - 1 } }, // footer
    ];

    // ----- Apply styles -----
    // Title row
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = titleStyle;
    }
    // Subtitle row
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: 1, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = subTitleStyle;
    }
    // Summary label/value
    summary.forEach((t, i) => {
      const labelAddr = XLSX.utils.encode_cell({ r: 3, c: i * 2 });
      if (!ws[labelAddr]) ws[labelAddr] = { t: 's', v: t.label };
      ws[labelAddr].s = summaryLabelStyle;
      const valueAddr = XLSX.utils.encode_cell({ r: 4, c: i * 2 });
      if (!ws[valueAddr]) ws[valueAddr] = { t: 'n', v: t.value };
      ws[valueAddr].s = summaryValueStyle(t.bg, t.fg);
    });
    // Header row (row index 6)
    const headerRowIdx = 6;
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: headers[c] };
      ws[addr].s = headerStyle;
    }
    // Data rows
    filtered.forEach((s, idx) => {
      const r = headerRowIdx + 1 + idx;
      const alt = idx % 2 === 1;
      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        if (c === 6) {
          ws[addr].s = paymentStyle(s.payment_status, alt);
        } else if (c === 7) {
          ws[addr].s = emailStyle(s.email_status, alt);
        } else {
          ws[addr].s = baseCell(alt);
        }
      }
    });
    // Footer row
    const footerRowIdx = aoa.length - 1;
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: footerRowIdx, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = {
        font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: '64748B' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'F8FAFC' } },
      };
    }

    // ----- Column widths -----
    const widths = [
      6,   // Lp.
      20,  // Data
      14,  // Imię
      16,  // Nazwisko
      30,  // Email
      16,  // Telefon
      16,  // Status płatności
      14,  // Status email
      20,  // Email potwierdzony
      20,  // Anulowane data
      16,  // Anulowane przez
      14,  // Partner imię
      16,  // Partner nazwisko
      30,  // Partner email
      ...fieldsConfig.map(() => 22),
    ];
    ws['!cols'] = widths.map(w => ({ wch: w }));

    // Row heights
    ws['!rows'] = [
      { hpt: 28 }, // title
      { hpt: 20 }, // subtitle
      { hpt: 6 },  // spacer
      { hpt: 20 }, // summary labels
      { hpt: 28 }, // summary values
      { hpt: 6 },  // spacer
      { hpt: 32 }, // headers
    ];

    // Freeze panes below headers
    ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 };
    (ws as any)['!autofilter'] = { ref: `A${headerRowIdx + 1}:${lastColLetter}${headerRowIdx + 1 + filtered.length}` };

    // Set ref to include footer
    ws['!ref'] = `A1:${lastColLetter}${aoa.length}`;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Zgłoszenia');
    const fileName = `zgloszenia-${form.slug}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({ title: 'Eksport zakończony', description: `Wyeksportowano ${filtered.length} zgłoszeń` });
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

      <Tabs value={audience} onValueChange={(v) => setAudience(v as 'all' | 'guests' | 'partners')}>
        <TabsList>
          <TabsTrigger value="all">
            Wszystkie <span className="ml-1.5 text-xs text-muted-foreground">({audienceCounts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="guests">
            <UserIcon className="w-3.5 h-3.5 mr-1" />
            Goście <span className="ml-1.5 text-xs text-muted-foreground">({audienceCounts.guests})</span>
          </TabsTrigger>
          <TabsTrigger value="partners">
            <Shield className="w-3.5 h-3.5 mr-1" />
            Partnerzy <span className="ml-1.5 text-xs text-muted-foreground">({audienceCounts.partners})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
        <Button variant="outline" size="sm" onClick={exportXlsx}>
          <FileSpreadsheet className="w-4 h-4 mr-1" /> Eksport Excel
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{s.first_name} {s.last_name}</span>
                        {isPartnerSubmission(s) ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/40 text-blue-600 dark:text-blue-400">
                            <Shield className="w-2.5 h-2.5 mr-0.5" /> Partner
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/40 text-muted-foreground">
                            <UserIcon className="w-2.5 h-2.5 mr-0.5" /> Gość
                          </Badge>
                        )}
                      </div>
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
