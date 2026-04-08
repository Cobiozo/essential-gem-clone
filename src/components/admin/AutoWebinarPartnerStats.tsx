import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MousePointerClick, UserPlus, Users, Clock, TrendingUp, ArrowUpDown } from 'lucide-react';

interface AutoWebinarPartnerStatsProps {
  configId: string;
  eventId: string | null;
}

interface PartnerRow {
  userId: string;
  firstName: string;
  lastName: string;
  eqId: string;
  clicks: number;
  registrations: number;
  joined: number;
  conversionPct: number;
  totalWatchSec: number;
  avgWatchSec: number;
}

type SortKey = 'registrations' | 'clicks' | 'joined' | 'conversionPct' | 'totalWatchSec' | 'avgWatchSec';

export const AutoWebinarPartnerStats: React.FC<AutoWebinarPartnerStatsProps> = ({ configId, eventId }) => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('registrations');
  const [sortAsc, setSortAsc] = useState(false);

  // Raw data
  const [clicks, setClicks] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [views, setViews] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, { firstName: string; lastName: string; eqId: string }>>(new Map());

  useEffect(() => {
    if (eventId) loadStats();
    else setLoading(false);
  }, [eventId, timeRange]);

  const getDateFilter = () => {
    if (timeRange === 'all') return null;
    const days = parseInt(timeRange);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  const loadStats = async () => {
    if (!eventId) return;
    setLoading(true);
    const dateFilter = getDateFilter();

    try {
      // Parallel fetches
      let clicksQuery = supabase
        .from('auto_webinar_invitation_clicks')
        .select('ref_code, clicked_at')
        .eq('event_id', eventId);
      if (dateFilter) clicksQuery = clicksQuery.gte('clicked_at', dateFilter);

      let regsQuery = supabase
        .from('guest_event_registrations')
        .select('id, invited_by_user_id, registered_at, status')
        .eq('event_id', eventId)
        .neq('status', 'cancelled');
      if (dateFilter) regsQuery = regsQuery.gte('registered_at', dateFilter);

      let viewsQuery = supabase
        .from('auto_webinar_views')
        .select('guest_registration_id, watch_duration_seconds, joined_at, user_id')
        .eq('is_guest', true);
      if (dateFilter) viewsQuery = viewsQuery.gte('joined_at', dateFilter);

      const [clicksRes, regsRes, viewsRes] = await Promise.all([
        clicksQuery,
        regsQuery,
        viewsQuery,
      ]);

      const clicksData = clicksRes.data || [];
      const regsData = regsRes.data || [];
      const viewsData = viewsRes.data || [];

      setClicks(clicksData);
      setRegistrations(regsData);

      // Filter views to only those matching our registrations
      const regIds = new Set(regsData.map(r => r.id));
      const filteredViews = viewsData.filter(v => v.guest_registration_id && regIds.has(v.guest_registration_id));
      setViews(filteredViews);

      // Collect unique user IDs from registrations
      const userIds = [...new Set(regsData.map(r => r.invited_by_user_id).filter(Boolean))] as string[];

      // Also try to map ref_codes to user IDs via user_reflinks
      const refCodes = [...new Set(clicksData.map(c => c.ref_code).filter(Boolean))];
      let refCodeToUserId = new Map<string, string>();
      if (refCodes.length > 0) {
        const { data: reflinks } = await supabase
          .from('user_reflinks')
          .select('user_id, reflink_code')
          .in('reflink_code', refCodes);
        if (reflinks) {
          reflinks.forEach(r => refCodeToUserId.set(r.reflink_code, r.user_id));
          reflinks.forEach(r => { if (!userIds.includes(r.user_id)) userIds.push(r.user_id); });
        }
      }

      // Fetch profiles
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, eq_id')
          .in('user_id', userIds);
        const map = new Map<string, { firstName: string; lastName: string; eqId: string }>();
        profilesData?.forEach(p => {
          map.set(p.user_id, {
            firstName: p.first_name || '',
            lastName: p.last_name || '',
            eqId: p.eq_id || '',
          });
        });
        setProfiles(map);
      }

      // Store refcode mapping for use in ranking computation
      (window as any).__awRefCodeMap = refCodeToUserId;
    } catch (err) {
      console.error('[PartnerStats] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const { summary, ranking } = useMemo(() => {
    const refCodeToUserId: Map<string, string> = (window as any).__awRefCodeMap || new Map();

    // Build per-user aggregation
    const userMap = new Map<string, { clicks: number; registrations: number; joined: number; totalWatch: number }>();

    const ensure = (uid: string) => {
      if (!userMap.has(uid)) userMap.set(uid, { clicks: 0, registrations: 0, joined: 0, totalWatch: 0 });
      return userMap.get(uid)!;
    };

    // Clicks by ref_code -> user_id
    clicks.forEach(c => {
      const uid = refCodeToUserId.get(c.ref_code);
      if (uid) ensure(uid).clicks++;
    });

    // Registrations by invited_by_user_id
    const regMap = new Map<string, string[]>(); // regId -> invited_by
    registrations.forEach(r => {
      if (r.invited_by_user_id) {
        ensure(r.invited_by_user_id).registrations++;
        regMap.set(r.id, r.invited_by_user_id);
      }
    });

    // Views -> map back via registration
    const regToInviter = new Map<string, string>();
    registrations.forEach(r => {
      if (r.invited_by_user_id) regToInviter.set(r.id, r.invited_by_user_id);
    });

    views.forEach(v => {
      const inviter = regToInviter.get(v.guest_registration_id);
      if (inviter) {
        const u = ensure(inviter);
        u.joined++;
        u.totalWatch += (v.watch_duration_seconds || 0);
      }
    });

    // Build ranking
    const rows: PartnerRow[] = [];
    userMap.forEach((data, uid) => {
      const profile = profiles.get(uid);
      if (!profile) return;
      rows.push({
        userId: uid,
        firstName: profile.firstName,
        lastName: profile.lastName,
        eqId: profile.eqId,
        clicks: data.clicks,
        registrations: data.registrations,
        joined: data.joined,
        conversionPct: data.registrations > 0 ? Math.round((data.joined / data.registrations) * 100) : 0,
        totalWatchSec: data.totalWatch,
        avgWatchSec: data.joined > 0 ? Math.round(data.totalWatch / data.joined) : 0,
      });
    });

    // Sort
    rows.sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortAsc ? diff : -diff;
    });

    // Summary
    const totalClicks = clicks.length;
    const totalRegs = registrations.length;
    const totalJoined = views.length;
    const totalWatch = views.reduce((s, v) => s + (v.watch_duration_seconds || 0), 0);
    const avgWatch = totalJoined > 0 ? Math.round(totalWatch / totalJoined) : 0;
    const convRate = totalRegs > 0 ? Math.round((totalJoined / totalRegs) * 100) : 0;

    return {
      summary: { totalClicks, totalRegs, totalJoined, avgWatch, convRate },
      ranking: rows.slice(0, 20),
    };
  }, [clicks, registrations, views, profiles, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
        {sortKey === field && <span className="text-xs">{sortAsc ? '↑' : '↓'}</span>}
      </span>
    </TableHead>
  );

  if (!eventId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Brak powiązanego wydarzenia. Utwórz wydarzenie w zakładce Ustawienia, aby zobaczyć statystyki.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Statystyki partnerów</h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Ostatnie 7 dni</SelectItem>
            <SelectItem value="30">Ostatnie 30 dni</SelectItem>
            <SelectItem value="90">Ostatnie 90 dni</SelectItem>
            <SelectItem value="all">Wszystko</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <MousePointerClick className="h-3.5 w-3.5" /> Kliknięcia
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
              <Users className="h-3.5 w-3.5" /> Dołączyli
            </div>
            <div className="text-2xl font-bold">{loading ? '...' : summary.totalJoined}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="h-3.5 w-3.5" /> Śr. czas
            </div>
            <div className="text-2xl font-bold">{loading ? '...' : formatTime(summary.avgWatch)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Konwersja
            </div>
            <div className="text-2xl font-bold">{loading ? '...' : `${summary.convRate}%`}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top 20 ranking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            🏆 Ranking TOP 20 partnerów
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Ładowanie danych...</div>
          ) : ranking.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Brak danych. Żaden partner nie zaprosił jeszcze gości.
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
                    <SortHeader label="Dołączyli" field="joined" />
                    <SortHeader label="Konwersja" field="conversionPct" />
                    <SortHeader label="Łączny czas" field="totalWatchSec" />
                    <SortHeader label="Śr. czas/gość" field="avgWatchSec" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((row, i) => (
                    <TableRow key={row.userId}>
                      <TableCell className="font-medium text-muted-foreground">
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.firstName} {row.lastName}</div>
                        {row.eqId && <div className="text-xs text-muted-foreground">EQID: {row.eqId}</div>}
                      </TableCell>
                      <TableCell>{row.clicks}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{row.registrations}</span>
                      </TableCell>
                      <TableCell>{row.joined}</TableCell>
                      <TableCell>
                        <Badge variant={row.conversionPct >= 50 ? 'default' : row.conversionPct >= 25 ? 'secondary' : 'outline'}>
                          {row.conversionPct}%
                        </Badge>
                      </TableCell>
                      <TableCell>{formatTime(row.totalWatchSec)}</TableCell>
                      <TableCell>{formatTime(row.avgWatchSec)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
