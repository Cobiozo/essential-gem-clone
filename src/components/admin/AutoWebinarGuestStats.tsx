import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Users, Clock, Eye, RefreshCw, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GuestStat {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  slot_time: string | null;
  created_at: string;
  invited_by: string | null;
  // View data
  joined: boolean;
  joined_at: string | null;
  left_at: string | null;
  watch_duration_seconds: number | null;
}

export const AutoWebinarGuestStats: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<GuestStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Get auto-webinar config to find event_id
      const { data: config } = await supabase
        .from('auto_webinar_config')
        .select('event_id')
        .limit(1)
        .maybeSingle();

      if (!config?.event_id) {
        setStats([]);
        setLoading(false);
        return;
      }

      // Get guest registrations for this event
      const { data: registrations, error: regError } = await supabase
        .from('guest_event_registrations')
        .select('id, first_name, last_name, email, slot_time, created_at, invited_by')
        .eq('event_id', config.event_id)
        .order('created_at', { ascending: false });

      if (regError) throw regError;

      // Get view data matched by guest_registration_id or guest_email
      const regIds = (registrations || []).map(r => r.id);
      const regEmails = (registrations || []).map(r => r.email).filter(Boolean);

      let viewsByRegId = new Map<string, any>();
      let viewsByEmail = new Map<string, any>();

      if (regIds.length > 0) {
        const { data: viewsById } = await supabase
          .from('auto_webinar_views' as any)
          .select('guest_registration_id, guest_email, joined_at, left_at, watch_duration_seconds')
          .in('guest_registration_id', regIds);
        (viewsById || []).forEach((v: any) => {
          if (v.guest_registration_id) {
            const existing = viewsByRegId.get(v.guest_registration_id);
            if (!existing || (v.watch_duration_seconds || 0) > (existing.watch_duration_seconds || 0)) {
              viewsByRegId.set(v.guest_registration_id, v);
            }
          }
        });
      }

      if (regEmails.length > 0) {
        const { data: viewsByEm } = await supabase
          .from('auto_webinar_views' as any)
          .select('guest_email, joined_at, left_at, watch_duration_seconds')
          .in('guest_email', regEmails);
        (viewsByEm || []).forEach((v: any) => {
          if (v.guest_email) {
            const existing = viewsByEmail.get(v.guest_email);
            if (!existing || (v.watch_duration_seconds || 0) > (existing.watch_duration_seconds || 0)) {
              viewsByEmail.set(v.guest_email, v);
            }
          }
        });
      }

      const result: GuestStat[] = (registrations || []).map(r => {
        const view = viewsByRegId.get(r.id) || viewsByEmail.get(r.email);
        return {
          id: r.id,
          first_name: r.first_name,
          last_name: r.last_name,
          email: r.email,
          slot_time: r.slot_time,
          created_at: r.created_at,
          invited_by: r.invited_by,
          joined: !!view,
          joined_at: view?.joined_at || null,
          left_at: view?.left_at || null,
          watch_duration_seconds: view?.watch_duration_seconds || null,
        };
      });

      setStats(result);
    } catch (err) {
      console.error('Error fetching guest stats:', err);
      toast({ title: 'Błąd', description: 'Nie udało się pobrać statystyk gości.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const filtered = useMemo(() => {
    if (!search) return stats;
    const q = search.toLowerCase();
    return stats.filter(s =>
      s.first_name.toLowerCase().includes(q) ||
      (s.last_name || '').toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }, [stats, search]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const totalGuests = filtered.length;
  const joinedGuests = filtered.filter(g => g.joined).length;
  const avgDuration = joinedGuests > 0
    ? filtered.filter(g => g.watch_duration_seconds).reduce((acc, g) => acc + (g.watch_duration_seconds || 0), 0) / joinedGuests
    : 0;

  const exportCSV = () => {
    const headers = ['Imię', 'Nazwisko', 'Email', 'Slot', 'Data rejestracji', 'Dołączył', 'Czas oglądania'];
    const rows = filtered.map(g => [
      g.first_name,
      g.last_name || '',
      g.email,
      g.slot_time || '',
      g.created_at ? format(new Date(g.created_at), 'dd.MM.yyyy HH:mm', { locale: pl }) : '',
      g.joined ? 'Tak' : 'Nie',
      formatDuration(g.watch_duration_seconds),
    ]);
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auto-webinar-goscie-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Statystyki gości
            </CardTitle>
            <CardDescription>Kto się zarejestrował, kto dołączył i jak długo oglądał</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Odśwież
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{totalGuests}</p>
              <p className="text-xs text-muted-foreground">Zarejestrowanych</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{joinedGuests}</p>
              <p className="text-xs text-muted-foreground">Dołączyło</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{formatDuration(Math.round(avgDuration))}</p>
              <p className="text-xs text-muted-foreground">Śr. czas</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po imieniu, nazwisku lub email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="max-h-96 overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Dołączył</TableHead>
                <TableHead>Czas oglądania</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Ładowanie...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Brak zarejestrowanych gości</TableCell>
                </TableRow>
              ) : (
                filtered.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.first_name} {g.last_name || ''}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{g.email}</TableCell>
                    <TableCell className="font-mono text-sm">{g.slot_time || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {g.created_at ? format(new Date(g.created_at), 'dd.MM.yyyy HH:mm', { locale: pl }) : '—'}
                    </TableCell>
                    <TableCell>
                      {g.joined ? (
                        <Badge variant="secondary" className="bg-green-600/20 text-green-600 border-0 text-xs">Tak</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-xs">Nie</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{formatDuration(g.watch_duration_seconds)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
