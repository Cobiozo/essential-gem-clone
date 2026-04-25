import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileSpreadsheet, MousePointerClick, UserPlus, CheckCircle2, XCircle, ArrowUpDown, Trophy } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

interface Props {
  form: any;
  onBack: () => void;
}

type SortKey = 'clicks' | 'registrations' | 'paid' | 'cancelled' | 'convClickReg' | 'convRegPaid';

interface PartnerRow {
  userId: string | null;
  firstName: string;
  lastName: string;
  eqId: string;
  avatarUrl: string | null;
  clicks: number;
  registrations: number;
  paid: number;
  cancelled: number;
  convClickReg: number;
  convRegPaid: number;
}

export const EventFormPartnerStats: React.FC<Props> = ({ form, onBack }) => {
  const [sortKey, setSortKey] = useState<SortKey>('paid');
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState('');

  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ['event-form-partner-links', form.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_partner_links')
        .select('id, partner_user_id, click_count, submission_count')
        .eq('form_id', form.id);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ['event-form-partner-stats-subs', form.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_form_submissions')
        .select('id, partner_user_id, payment_status, status')
        .eq('form_id', form.id);
      if (error) throw error;
      return data as any[];
    },
  });

  const partnerIds = useMemo(() => {
    const ids = new Set<string>();
    links.forEach(l => l.partner_user_id && ids.add(l.partner_user_id));
    submissions.forEach(s => s.partner_user_id && ids.add(s.partner_user_id));
    return Array.from(ids);
  }, [links, submissions]);

  const { data: profilesMap = {} } = useQuery({
    queryKey: ['event-form-partner-profiles', partnerIds.sort().join(',')],
    enabled: partnerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, eq_id, avatar_url')
        .in('user_id', partnerIds);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data as any[]).forEach(p => { map[p.user_id] = p; });
      return map;
    },
  });

  const loading = linksLoading || subsLoading;

  const { rows, summary, noPartner } = useMemo(() => {
    const userMap = new Map<string, { clicks: number; registrations: number; paid: number; cancelled: number }>();

    const ensure = (uid: string) => {
      if (!userMap.has(uid)) userMap.set(uid, { clicks: 0, registrations: 0, paid: 0, cancelled: 0 });
      return userMap.get(uid)!;
    };

    links.forEach(l => {
      if (l.partner_user_id) ensure(l.partner_user_id).clicks += (l.click_count || 0);
    });

    let noPartnerStats = { registrations: 0, paid: 0, cancelled: 0 };

    submissions.forEach(s => {
      const isCancelled = s.status === 'cancelled' || s.payment_status === 'cancelled';
      const isPaid = s.payment_status === 'paid';
      if (s.partner_user_id) {
        const u = ensure(s.partner_user_id);
        u.registrations++;
        if (isPaid) u.paid++;
        if (isCancelled) u.cancelled++;
      } else {
        noPartnerStats.registrations++;
        if (isPaid) noPartnerStats.paid++;
        if (isCancelled) noPartnerStats.cancelled++;
      }
    });

    const builtRows: PartnerRow[] = [];
    userMap.forEach((data, uid) => {
      const profile = (profilesMap as any)[uid];
      builtRows.push({
        userId: uid,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        eqId: profile?.eq_id || '',
        avatarUrl: profile?.avatar_url || null,
        clicks: data.clicks,
        registrations: data.registrations,
        paid: data.paid,
        cancelled: data.cancelled,
        convClickReg: data.clicks > 0 ? Math.round((data.registrations / data.clicks) * 100) : 0,
        convRegPaid: data.registrations > 0 ? Math.round((data.paid / data.registrations) * 100) : 0,
      });
    });

    // Filter by search
    const filtered = search.trim()
      ? builtRows.filter(r => {
          const q = search.toLowerCase();
          return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) || r.eqId.toLowerCase().includes(q);
        })
      : builtRows;

    filtered.sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      if (diff !== 0) return sortAsc ? diff : -diff;
      // Tie-breaker by paid then registrations
      return (b.paid - a.paid) || (b.registrations - a.registrations);
    });

    const totalClicks = links.reduce((s, l) => s + (l.click_count || 0), 0);
    const totalRegs = submissions.length;
    const totalPaid = submissions.filter(s => s.payment_status === 'paid').length;
    const totalCancelled = submissions.filter(s => s.status === 'cancelled' || s.payment_status === 'cancelled').length;

    return {
      rows: filtered,
      summary: { totalClicks, totalRegs, totalPaid, totalCancelled, partnersCount: builtRows.length },
      noPartner: noPartnerStats,
    };
  }, [links, submissions, profilesMap, sortKey, sortAsc, search]);

  const podium = rows.slice(0, 3);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(false); }
  };

  const exportXlsx = () => {
    // Style helpers
    const border = {
      top: { style: 'thin', color: { rgb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
      left: { style: 'thin', color: { rgb: 'D1D5DB' } },
      right: { style: 'thin', color: { rgb: 'D1D5DB' } },
    };
    const thickBottom = { ...border, bottom: { style: 'medium', color: { rgb: '0F172A' } } };

    // Build sheet as array of arrays — we'll style cells afterwards
    const eventTitle = form.paid_events?.title || 'Wydarzenie';
    const eventDate = form.paid_events?.event_date
      ? new Date(form.paid_events.event_date).toLocaleDateString('pl-PL')
      : '';
    const eventLoc = form.paid_events?.location || '';
    const subtitle = [eventTitle, eventDate, eventLoc].filter(Boolean).join(' · ');
    const generatedAt = new Date().toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' });

    const headers = ['#', 'Imię', 'Nazwisko', 'EQID', 'Kliknięcia', 'Rejestracje', 'Opłacone', 'Anulowane', 'Konwersja klik→rej', 'Konwersja rej→opł'];

    const aoa: any[][] = [];
    aoa.push([`Statystyki partnerów: ${form.title}`]); // row 1
    aoa.push([subtitle]); // row 2
    aoa.push([`Wygenerowano: ${generatedAt}`]); // row 3
    aoa.push([]); // row 4 separator

    // Summary block (rows 5-6)
    aoa.push(['Podsumowanie', '', '', '', '', '', '', '', '', '']); // row 5 header
    aoa.push(['Kliknięcia ref linku', summary.totalClicks, '', 'Rejestracje', summary.totalRegs, '', 'Opłacone', summary.totalPaid, 'Anulowane', summary.totalCancelled]); // row 6

    aoa.push([]); // row 7 separator

    // Table header (row 8 = index 7)
    const headerRowIdx = aoa.length;
    aoa.push(headers);

    // Data rows
    const dataStartIdx = aoa.length;
    rows.forEach((r, i) => {
      aoa.push([
        i + 1,
        r.firstName || '',
        r.lastName || '',
        r.eqId || '',
        r.clicks,
        r.registrations,
        r.paid,
        r.cancelled,
        r.convClickReg / 100,
        r.convRegPaid / 100,
      ]);
    });

    // No-partner row
    let noPartnerRowIdx = -1;
    if (noPartner.registrations > 0 || noPartner.paid > 0 || noPartner.cancelled > 0) {
      noPartnerRowIdx = aoa.length;
      aoa.push(['', 'Bez przypisanego partnera', '', '', '', noPartner.registrations, noPartner.paid, noPartner.cancelled, '', '']);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths
    ws['!cols'] = [
      { wch: 6 },   // #
      { wch: 18 },  // Imię
      { wch: 20 },  // Nazwisko
      { wch: 16 },  // EQID
      { wch: 14 },  // Kliknięcia
      { wch: 14 },  // Rejestracje
      { wch: 14 },  // Opłacone
      { wch: 14 },  // Anulowane
      { wch: 22 },  // Konw. klik→rej
      { wch: 22 },  // Konw. rej→opł
    ];

    // Row heights
    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 32 }; // title
    ws['!rows'][1] = { hpt: 20 }; // subtitle
    ws['!rows'][headerRowIdx] = { hpt: 28 }; // table header

    // Merges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // subtitle
      { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }, // generated
      { s: { r: 4, c: 0 }, e: { r: 4, c: 9 } }, // summary header
      // Summary value cells: pair label+value (label spans 1, value spans 1)
      { s: { r: 5, c: 1 }, e: { r: 5, c: 1 } },
    ];

    // Style the title row
    const setCell = (addr: string, value: any, style: any) => {
      if (!ws[addr]) ws[addr] = { t: typeof value === 'number' ? 'n' : 's', v: value };
      ws[addr].s = style;
    };

    // Title
    setCell('A1', `Statystyki partnerów: ${form.title}`, {
      font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: '0F172A' } },
      fill: { fgColor: { rgb: 'D4AF37' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    });
    // Subtitle
    setCell('A2', subtitle, {
      font: { name: 'Calibri', sz: 11, italic: true, color: { rgb: '475569' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'FEF3C7' } },
    });
    // Generated
    setCell('A3', `Wygenerowano: ${generatedAt}`, {
      font: { name: 'Calibri', sz: 9, color: { rgb: '94A3B8' } },
      alignment: { horizontal: 'center' },
    });

    // Summary header (row 5 = A5)
    setCell('A5', 'Podsumowanie', {
      font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    });
    ws['!rows'][4] = { hpt: 22 };

    // Summary row 6 — pairs of (label, value, label, value, ...)
    const summaryStyle = {
      label: {
        font: { name: 'Calibri', sz: 10, color: { rgb: '64748B' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        fill: { fgColor: { rgb: 'F8FAFC' } },
        border,
      },
      valueDefault: {
        font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        fill: { fgColor: { rgb: 'F8FAFC' } },
        border,
      },
      valuePaid: {
        font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: '15803D' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        fill: { fgColor: { rgb: 'F0FDF4' } },
        border,
      },
      valueCancel: {
        font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'B91C1C' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        fill: { fgColor: { rgb: 'FEF2F2' } },
        border,
      },
    };
    setCell('A6', 'Kliknięcia ref linku', summaryStyle.label);
    setCell('B6', summary.totalClicks, summaryStyle.valueDefault);
    setCell('D6', 'Rejestracje', summaryStyle.label);
    setCell('E6', summary.totalRegs, summaryStyle.valueDefault);
    setCell('G6', 'Opłacone', summaryStyle.label);
    setCell('H6', summary.totalPaid, summaryStyle.valuePaid);
    setCell('I6', 'Anulowane', summaryStyle.label);
    setCell('J6', summary.totalCancelled, summaryStyle.valueCancel);
    ws['!rows'][5] = { hpt: 28 };

    // Table header row
    const headerStyle = {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: thickBottom,
    };
    headers.forEach((_, c) => {
      const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      ws[addr] = ws[addr] || { t: 's', v: headers[c] };
      ws[addr].s = headerStyle;
    });

    // Data rows styling
    rows.forEach((r, i) => {
      const rowIdx = dataStartIdx + i;
      const isPodium = i < 3;
      const podiumFills = ['FEF3C7', 'F1F5F9', 'FED7AA']; // gold, silver, bronze
      const baseFill = isPodium ? podiumFills[i] : (i % 2 === 0 ? 'FFFFFF' : 'F8FAFC');
      const baseFont = { name: 'Calibri', sz: 10, color: { rgb: '0F172A' }, bold: isPodium };

      const baseStyle = (extra: any = {}) => ({
        font: { ...baseFont, ...(extra.font || {}) },
        alignment: { horizontal: 'left', vertical: 'center', ...(extra.alignment || {}) },
        fill: { fgColor: { rgb: baseFill } },
        border,
        ...(extra.numFmt ? { numFmt: extra.numFmt } : {}),
      });

      // # column with medals
      const medalChar = ['🥇', '🥈', '🥉'];
      const numCellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
      ws[numCellAddr] = ws[numCellAddr] || { t: 's' };
      ws[numCellAddr].v = isPodium ? medalChar[i] : (i + 1);
      ws[numCellAddr].t = isPodium ? 's' : 'n';
      ws[numCellAddr].s = baseStyle({ alignment: { horizontal: 'center' }, font: { sz: isPodium ? 14 : 10 } });

      // Imię, Nazwisko, EQID — left aligned text
      [1, 2, 3].forEach(c => {
        const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        ws[addr].s = baseStyle();
      });

      // Numeric cols 4-7 — right aligned
      [4, 5].forEach(c => {
        const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (!ws[addr]) ws[addr] = { t: 'n', v: 0 };
        ws[addr].s = baseStyle({ alignment: { horizontal: 'right' } });
      });

      // Opłacone — bold green
      const paidAddr = XLSX.utils.encode_cell({ r: rowIdx, c: 6 });
      ws[paidAddr] = ws[paidAddr] || { t: 'n', v: r.paid };
      ws[paidAddr].s = baseStyle({
        alignment: { horizontal: 'right' },
        font: { bold: true, color: { rgb: '15803D' } },
      });

      // Anulowane — red if > 0
      const cancAddr = XLSX.utils.encode_cell({ r: rowIdx, c: 7 });
      ws[cancAddr] = ws[cancAddr] || { t: 'n', v: r.cancelled };
      ws[cancAddr].s = baseStyle({
        alignment: { horizontal: 'right' },
        font: r.cancelled > 0 ? { bold: true, color: { rgb: 'B91C1C' } } : {},
      });

      // Conversion columns — percent format
      [8, 9].forEach(c => {
        const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (!ws[addr]) ws[addr] = { t: 'n', v: 0 };
        ws[addr].s = baseStyle({ alignment: { horizontal: 'center' }, numFmt: '0%' });
      });
    });

    // No-partner row styling
    if (noPartnerRowIdx > -1) {
      const npStyle = {
        font: { name: 'Calibri', sz: 10, italic: true, color: { rgb: '64748B' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        fill: { fgColor: { rgb: 'F1F5F9' } },
        border,
      };
      for (let c = 0; c < 10; c++) {
        const addr = XLSX.utils.encode_cell({ r: noPartnerRowIdx, c });
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        const isNum = c === 5 || c === 6 || c === 7;
        ws[addr].s = { ...npStyle, alignment: { ...npStyle.alignment, horizontal: isNum ? 'right' : (c === 0 ? 'center' : 'left') } };
      }
    }

    // Freeze panes — keep header visible
    ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 };
    (ws as any)['!views'] = [{ state: 'frozen', ySplit: headerRowIdx + 1 }];

    // Build workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statystyki partnerów');

    // Workbook properties
    wb.Props = {
      Title: `Statystyki partnerów - ${form.title}`,
      Subject: eventTitle,
      Author: 'Pure Life Platform',
      CreatedDate: new Date(),
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `statystyki-partnerow-${form.slug || form.id}-${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
  };


  const initials = (r: PartnerRow) => `${r.firstName?.[0] || ''}${r.lastName?.[0] || ''}`.toUpperCase() || '?';

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
        {sortKey === field && <span className="text-xs">{sortAsc ? '↑' : '↓'}</span>}
      </span>
    </TableHead>
  );

  const medals = ['🥇', '🥈', '🥉'];
  const podiumColors = [
    'from-yellow-500/20 to-yellow-500/5 border-yellow-500/40',
    'from-slate-400/20 to-slate-400/5 border-slate-400/40',
    'from-amber-700/20 to-amber-700/5 border-amber-700/40',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Powrót
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Statystyki partnerów: {form.title}</h2>
          <p className="text-sm text-muted-foreground">
            {form.paid_events?.title || 'Wydarzenie'} · {summary.partnersCount} {summary.partnersCount === 1 ? 'partner' : 'partnerów'}
          </p>
        </div>
        <Button onClick={exportXlsx} variant="outline" disabled={rows.length === 0}>
          <FileSpreadsheet className="w-4 h-4 mr-1" /> Eksport Excel
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <MousePointerClick className="h-3.5 w-3.5" /> Kliknięcia ref linku
            </div>
            <div className="text-2xl font-bold">{loading ? '...' : summary.totalClicks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <UserPlus className="h-3.5 w-3.5" /> Rejestracje
            </div>
            <div className="text-2xl font-bold">{loading ? '...' : summary.totalRegs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Opłacone
            </div>
            <div className="text-2xl font-bold text-green-600">{loading ? '...' : summary.totalPaid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <XCircle className="h-3.5 w-3.5" /> Anulowane
            </div>
            <div className="text-2xl font-bold text-destructive">{loading ? '...' : summary.totalCancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" /> Podium TOP 3 (wg opłaconych)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {podium.map((p, i) => (
                <div
                  key={p.userId}
                  className={`relative rounded-lg border bg-gradient-to-br p-4 ${podiumColors[i]}`}
                >
                  <div className="absolute -top-3 left-3 text-3xl">{medals[i]}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold overflow-hidden">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={`${p.firstName} ${p.lastName}`} className="w-full h-full object-cover" />
                      ) : (
                        initials(p)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.firstName} {p.lastName || '—'}</div>
                      {p.eqId && <div className="text-xs text-muted-foreground">EQID: {p.eqId}</div>}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-3xl font-bold text-green-600">{p.paid}</div>
                    <div className="text-xs text-muted-foreground">opłaconych zgłoszeń</div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-x-3">
                    <span>👆 {p.clicks} klik</span>
                    <span>📝 {p.registrations} rej</span>
                    <span>📈 {p.convRegPaid}% konw.</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Szukaj po imieniu, nazwisku lub EQID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <span className="text-sm text-muted-foreground">{rows.length} wyników</span>
      </div>

      {/* Full ranking table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pełny ranking partnerów</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Ładowanie danych...</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {search ? 'Brak partnerów pasujących do wyszukiwania.' : 'Brak partnerów dla tego formularza.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Partner</TableHead>
                    <SortHeader label="Kliknięcia" field="clicks" />
                    <SortHeader label="Rejestracje" field="registrations" />
                    <SortHeader label="Opłacone" field="paid" />
                    <SortHeader label="Anulowane" field="cancelled" />
                    <SortHeader label="Klik → Rej" field="convClickReg" />
                    <SortHeader label="Rej → Opł" field="convRegPaid" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.userId} className={i < 3 ? 'bg-muted/30' : ''}>
                      <TableCell className="font-medium text-muted-foreground">
                        {i < 3 ? medals[i] : i + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold overflow-hidden">
                            {r.avatarUrl ? (
                              <img src={r.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              initials(r)
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{r.firstName} {r.lastName || '—'}</div>
                            {r.eqId && <div className="text-xs text-muted-foreground">EQID: {r.eqId}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{r.clicks}</TableCell>
                      <TableCell>{r.registrations}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">{r.paid}</span>
                      </TableCell>
                      <TableCell>
                        {r.cancelled > 0 ? <span className="text-destructive">{r.cancelled}</span> : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.convClickReg >= 30 ? 'default' : r.convClickReg >= 10 ? 'secondary' : 'outline'}>
                          {r.convClickReg}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.convRegPaid >= 50 ? 'default' : r.convRegPaid >= 25 ? 'secondary' : 'outline'}>
                          {r.convRegPaid}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(noPartner.registrations > 0 || noPartner.paid > 0) && (
                    <TableRow className="bg-muted/20 italic">
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">Bez przypisanego partnera</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>{noPartner.registrations}</TableCell>
                      <TableCell>{noPartner.paid}</TableCell>
                      <TableCell>{noPartner.cancelled}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
