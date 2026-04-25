import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, MousePointerClick, UserPlus, CheckCircle2, XCircle, ArrowUpDown, Trophy } from 'lucide-react';

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

  const exportCsv = () => {
    const headers = ['#', 'Imię', 'Nazwisko', 'EQID', 'Kliknięcia', 'Rejestracje', 'Opłacone', 'Anulowane', 'Konwersja klik→rej (%)', 'Konwersja rej→opł (%)'];
    const lines = [headers.join(',')];
    rows.forEach((r, i) => {
      lines.push([
        i + 1,
        `"${(r.firstName || '').replace(/"/g, '""')}"`,
        `"${(r.lastName || '').replace(/"/g, '""')}"`,
        `"${(r.eqId || '').replace(/"/g, '""')}"`,
        r.clicks,
        r.registrations,
        r.paid,
        r.cancelled,
        r.convClickReg,
        r.convRegPaid,
      ].join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statystyki-partnerow-${form.slug || form.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <Button onClick={exportCsv} variant="outline" disabled={rows.length === 0}>
          <Download className="w-4 h-4 mr-1" /> Eksport CSV
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
