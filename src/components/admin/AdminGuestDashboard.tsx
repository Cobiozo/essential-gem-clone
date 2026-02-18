import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Download, Search, Users, Clock, Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GuestRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  room_id: string;
  event_id: string | null;
  inviter_user_id: string;
  created_at: string;
  used_at: string | null;
  // Analytics
  joined_at: string | null;
  left_at: string | null;
  duration_seconds: number | null;
  join_source: string | null;
  device_info: string | null;
  thank_you_email_sent: boolean;
  // Inviter info
  inviter_first_name: string | null;
  inviter_last_name: string | null;
  // Event info
  event_title: string | null;
}

export const AdminGuestDashboard: React.FC = () => {
  const { toast } = useToast();
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviterFilter, setInviterFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchGuests = async () => {
    setLoading(true);
    try {
      // Fetch guest tokens with analytics
      const { data: tokens, error } = await supabase
        .from('meeting_guest_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get analytics for all tokens
      const tokenIds = (tokens || []).map(t => t.id);
      const { data: analytics } = tokenIds.length > 0
        ? await supabase.from('meeting_guest_analytics').select('*').in('guest_token_id', tokenIds)
        : { data: [] };

      // Get inviter profiles
      const inviterIds = [...new Set((tokens || []).map(t => t.inviter_user_id))];
      const { data: profiles } = inviterIds.length > 0
        ? await supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', inviterIds)
        : { data: [] };

      // Get event titles
      const eventIds = [...new Set((tokens || []).filter(t => t.event_id).map(t => t.event_id!))];
      const { data: events } = eventIds.length > 0
        ? await supabase.from('events').select('id, title').in('id', eventIds)
        : { data: [] };

      const analyticsMap = new Map((analytics || []).map(a => [a.guest_token_id, a]));
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const eventMap = new Map((events || []).map(e => [e.id, e]));

      const records: GuestRecord[] = (tokens || []).map(t => {
        const a = analyticsMap.get(t.id);
        const p = profileMap.get(t.inviter_user_id);
        const e = t.event_id ? eventMap.get(t.event_id) : null;
        return {
          id: t.id,
          first_name: t.first_name,
          last_name: t.last_name,
          email: t.email,
          room_id: t.room_id,
          event_id: t.event_id,
          inviter_user_id: t.inviter_user_id,
          created_at: t.created_at,
          used_at: t.used_at,
          joined_at: a?.joined_at || null,
          left_at: a?.left_at || null,
          duration_seconds: a?.duration_seconds || null,
          join_source: a?.join_source || null,
          device_info: a?.device_info || null,
          thank_you_email_sent: a?.thank_you_email_sent || false,
          inviter_first_name: p?.first_name || null,
          inviter_last_name: p?.last_name || null,
          event_title: e?.title || null,
        };
      });

      setGuests(records);
    } catch (err) {
      console.error('Error fetching guests:', err);
      toast({ title: 'Błąd', description: 'Nie udało się pobrać danych gości.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGuests(); }, []);

  const inviters = useMemo(() => {
    const unique = new Map<string, string>();
    guests.forEach(g => {
      if (g.inviter_first_name) {
        unique.set(g.inviter_user_id, `${g.inviter_first_name} ${g.inviter_last_name || ''}`);
      }
    });
    return Array.from(unique.entries());
  }, [guests]);

  const filtered = useMemo(() => {
    return guests.filter(g => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !g.first_name.toLowerCase().includes(q) &&
          !g.last_name.toLowerCase().includes(q) &&
          !g.email.toLowerCase().includes(q)
        ) return false;
      }
      if (inviterFilter !== 'all' && g.inviter_user_id !== inviterFilter) return false;
      if (dateFrom && g.created_at < dateFrom) return false;
      if (dateTo && g.created_at > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [guests, search, inviterFilter, dateFrom, dateTo]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const exportCSV = () => {
    const headers = ['Imię', 'Nazwisko', 'Email', 'Spotkanie', 'Data', 'Czas uczestnictwa', 'Zapraszający', 'Email wysłany'];
    const rows = filtered.map(g => [
      g.first_name,
      g.last_name,
      g.email,
      g.event_title || g.room_id,
      g.created_at ? format(new Date(g.created_at), 'dd.MM.yyyy HH:mm', { locale: pl }) : '',
      formatDuration(g.duration_seconds),
      `${g.inviter_first_name || ''} ${g.inviter_last_name || ''}`.trim(),
      g.thank_you_email_sent ? 'Tak' : 'Nie',
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `goscie-spotkan-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalGuests = filtered.length;
  const joinedGuests = filtered.filter(g => g.joined_at).length;
  const emailsSent = filtered.filter(g => g.thank_you_email_sent).length;
  const avgDuration = filtered.filter(g => g.duration_seconds).reduce((acc, g) => acc + (g.duration_seconds || 0), 0) / (joinedGuests || 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Goście spotkań</h2>
          <p className="text-muted-foreground">Zbiorczy widok wszystkich gości ze spotkań wideo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchGuests} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Eksportuj CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{totalGuests}</p>
              <p className="text-xs text-muted-foreground">Zaproszonych</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{joinedGuests}</p>
              <p className="text-xs text-muted-foreground">Dołączyło</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{formatDuration(Math.round(avgDuration))}</p>
              <p className="text-xs text-muted-foreground">Śr. czas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Mail className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{emailsSent}</p>
              <p className="text-xs text-muted-foreground">Emaili wysłano</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po imieniu, nazwisku lub email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={inviterFilter} onValueChange={setInviterFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Zapraszający" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy zapraszający</SelectItem>
                {inviters.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" placeholder="Od" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" placeholder="Do" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Spotkanie</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Czas uczestnictwa</TableHead>
                <TableHead>Zapraszający</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Ładowanie...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Brak gości spełniających kryteria
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.first_name} {g.last_name}</TableCell>
                    <TableCell className="text-muted-foreground">{g.email}</TableCell>
                    <TableCell>{g.event_title || g.room_id}</TableCell>
                    <TableCell>
                      {g.created_at ? format(new Date(g.created_at), 'dd.MM.yyyy HH:mm', { locale: pl }) : '—'}
                    </TableCell>
                    <TableCell>
                      {g.joined_at ? (
                        <span>{formatDuration(g.duration_seconds)}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Nie dołączył</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {g.inviter_first_name ? `${g.inviter_first_name} ${g.inviter_last_name || ''}` : '—'}
                    </TableCell>
                    <TableCell>
                      {g.thank_you_email_sent ? (
                        <Badge variant="secondary" className="bg-green-600/20 text-green-600 border-0 text-xs">Wysłano</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-zinc-600/20 text-muted-foreground border-0 text-xs">Nie</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
