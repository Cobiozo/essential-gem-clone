import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Clock, Eye, RefreshCw, Download, Search, Filter, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GuestStat {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  slot_time: string | null;
  created_at: string;
  status: string | null;
  invited_by_name: string | null;
  invited_by_eq_id: string | null;
  joined: boolean;
  joined_at: string | null;
  left_at: string | null;
  watch_duration_seconds: number | null;
}

interface AutoWebinarGuestStatsProps {
  category: 'business_opportunity' | 'health_conversation';
}

export const AutoWebinarGuestStats: React.FC<AutoWebinarGuestStatsProps> = ({ category }) => {
  const { toast } = useToast();
  const [stats, setStats] = useState<GuestStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Filters
  const [filterInviter, setFilterInviter] = useState('all');
  const [filterJoined, setFilterJoined] = useState('all');
  const [filterSlot, setFilterSlot] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterMinWatch, setFilterMinWatch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active'); // active by default

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: config } = await supabase
        .from('auto_webinar_config')
        .select('event_id')
        .eq('category', category)
        .limit(1)
        .maybeSingle();

      if (!config?.event_id) {
        setStats([]);
        setLoading(false);
        return;
      }

      // Get registrations with invited_by_user_id
      const { data: registrations, error: regError } = await supabase
        .from('guest_event_registrations')
        .select('id, first_name, last_name, email, slot_time, created_at, invited_by_user_id, status')
        .eq('event_id', config.event_id)
        .order('created_at', { ascending: false });

      if (regError) throw regError;

      // Fetch inviter profiles
      const inviterIds = [...new Set((registrations || []).map(r => r.invited_by_user_id).filter(Boolean))] as string[];
      const inviterMap = new Map<string, { first_name: string; last_name: string | null; eq_id: string | null }>();

      if (inviterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, eq_id')
          .in('user_id', inviterIds);
        (profiles || []).forEach((p: any) => {
          inviterMap.set(p.user_id, { first_name: p.first_name, last_name: p.last_name, eq_id: p.eq_id });
        });
      }

      // Get views
      const regIds = (registrations || []).map(r => r.id);
      const regEmails = (registrations || []).map(r => r.email).filter(Boolean);
      const viewsByRegId = new Map<string, any>();
      const viewsByEmail = new Map<string, any>();

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

      const result: GuestStat[] = (registrations || []).map((r: any) => {
        const view = viewsByRegId.get(r.id) || viewsByEmail.get(r.email);
        const inviter = r.invited_by_user_id ? inviterMap.get(r.invited_by_user_id) : null;
        return {
          id: r.id,
          first_name: r.first_name,
          last_name: r.last_name,
          email: r.email,
          slot_time: r.slot_time,
          created_at: r.created_at,
          status: r.status,
          invited_by_name: inviter ? `${inviter.first_name} ${inviter.last_name || ''}`.trim() : null,
          invited_by_eq_id: inviter?.eq_id || null,
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

  const handleDeleteGuest = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('guest_event_registrations')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', deleteId);
      if (error) throw error;
      toast({ title: 'Usunięto', description: 'Gość został usunięty z listy.' });
      setDeleteId(null);
      fetchStats();
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: 'Błąd', description: 'Nie udało się usunąć gościa.', variant: 'destructive' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      const { error } = await supabase
        .from('guest_event_registrations')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      toast({ title: 'Usunięto', description: `Usunięto ${selectedIds.size} gości z listy.` });
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
      fetchStats();
    } catch (err) {
      console.error('Bulk delete error:', err);
      toast({ title: 'Błąd', description: 'Nie udało się usunąć gości.', variant: 'destructive' });
    }
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, filterInviter, filterJoined, filterSlot, filterDateFrom, filterDateTo, filterMinWatch, filterStatus]);

  const selectableGuests = useMemo(() => filtered.filter(g => g.status !== 'cancelled'), [filtered]);
  const allSelectableSelected = selectableGuests.length > 0 && selectableGuests.every(g => selectedIds.has(g.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelectableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableGuests.map(g => g.id)));
    }
  }, [allSelectableSelected, selectableGuests]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Unique values for filter dropdowns
  const uniqueInviters = useMemo(() => {
    const set = new Map<string, string>();
    stats.forEach(s => {
      if (s.invited_by_name) {
        const key = s.invited_by_eq_id || s.invited_by_name;
        set.set(key, s.invited_by_name + (s.invited_by_eq_id ? ` (${s.invited_by_eq_id})` : ''));
      }
    });
    return Array.from(set.entries()).map(([key, label]) => ({ key, label }));
  }, [stats]);

  const uniqueSlots = useMemo(() => {
    return [...new Set(stats.map(s => s.slot_time).filter(Boolean))] as string[];
  }, [stats]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterInviter !== 'all') count++;
    if (filterJoined !== 'all') count++;
    if (filterSlot !== 'all') count++;
    if (filterDateFrom) count++;
    if (filterDateTo) count++;
    if (filterMinWatch !== 'all') count++;
    if (filterStatus !== 'active') count++;
    return count;
  }, [filterInviter, filterJoined, filterSlot, filterDateFrom, filterDateTo, filterMinWatch, filterStatus]);

  const clearFilters = () => {
    setFilterInviter('all');
    setFilterJoined('all');
    setFilterSlot('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterMinWatch('all');
    setFilterStatus('active');
  };

  const filtered = useMemo(() => {
    let result = stats;

    // Status filter (default: hide cancelled)
    if (filterStatus === 'active') {
      result = result.filter(s => s.status !== 'cancelled');
    } else if (filterStatus === 'cancelled') {
      result = result.filter(s => s.status === 'cancelled');
    }

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.first_name.toLowerCase().includes(q) ||
        (s.last_name || '').toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.invited_by_name || '').toLowerCase().includes(q)
      );
    }

    // Inviter
    if (filterInviter === 'none') {
      result = result.filter(s => !s.invited_by_name);
    } else if (filterInviter !== 'all') {
      result = result.filter(s => (s.invited_by_eq_id || s.invited_by_name) === filterInviter);
    }

    // Joined
    if (filterJoined === 'yes') result = result.filter(s => s.joined);
    else if (filterJoined === 'no') result = result.filter(s => !s.joined);

    // Slot
    if (filterSlot !== 'all') result = result.filter(s => s.slot_time === filterSlot);

    // Date range
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      result = result.filter(s => s.created_at && new Date(s.created_at) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(s => s.created_at && new Date(s.created_at) <= to);
    }

    // Min watch time
    if (filterMinWatch !== 'all') {
      const min = parseInt(filterMinWatch);
      result = result.filter(s => (s.watch_duration_seconds || 0) >= min);
    }

    return result;
  }, [stats, search, filterInviter, filterJoined, filterSlot, filterDateFrom, filterDateTo, filterMinWatch, filterStatus]);

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
    const headers = ['Imię', 'Nazwisko', 'Email', 'Zapraszający', 'EQ ID zapraszającego', 'Slot', 'Data rejestracji', 'Status', 'Dołączył', 'Czas oglądania'];
    const rows = filtered.map(g => [
      g.first_name,
      g.last_name || '',
      g.email,
      g.invited_by_name || '',
      g.invited_by_eq_id || '',
      g.slot_time || '',
      g.created_at ? format(new Date(g.created_at), 'dd.MM.yyyy HH:mm', { locale: pl }) : '',
      g.status || 'registered',
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
    <>
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

          {/* Search & Filter Toggle */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po imieniu, nazwisku, email lub zapraszającym..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtry
              {activeFilterCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 border rounded-lg bg-muted/20">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Zapraszający</label>
                <Select value={filterInviter} onValueChange={setFilterInviter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszyscy</SelectItem>
                    <SelectItem value="none">Brak zapraszającego</SelectItem>
                    {uniqueInviters.map(i => (
                      <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Dołączył</label>
                <Select value={filterJoined} onValueChange={setFilterJoined}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszyscy</SelectItem>
                    <SelectItem value="yes">Tak</SelectItem>
                    <SelectItem value="no">Nie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Slot</label>
                <Select value={filterSlot} onValueChange={setFilterSlot}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {uniqueSlots.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Min. czas oglądania</label>
                <Select value={filterMinWatch} onValueChange={setFilterMinWatch}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Dowolny</SelectItem>
                    <SelectItem value="1">&gt; 0s</SelectItem>
                    <SelectItem value="60">&gt; 1 min</SelectItem>
                    <SelectItem value="300">&gt; 5 min</SelectItem>
                    <SelectItem value="600">&gt; 10 min</SelectItem>
                    <SelectItem value="1800">&gt; 30 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data od</label>
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-8 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data do</label>
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-8 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktywni</SelectItem>
                    <SelectItem value="cancelled">Anulowani</SelectItem>
                    <SelectItem value="all">Wszyscy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Wyczyść filtry
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="max-h-[500px] overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imię i nazwisko</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Zapraszający</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Dołączył</TableHead>
                  <TableHead>Czas oglądania</TableHead>
                  <TableHead className="w-10">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Ładowanie...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Brak zarejestrowanych gości</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(g => (
                    <TableRow key={g.id} className={g.status === 'cancelled' ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{g.first_name} {g.last_name || ''}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{g.email}</TableCell>
                      <TableCell className="text-sm">
                        {g.invited_by_name ? (
                          <div>
                            <span className="font-medium">{g.invited_by_name}</span>
                            {g.invited_by_eq_id && (
                              <span className="text-muted-foreground text-xs ml-1">({g.invited_by_eq_id})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{g.slot_time || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {g.created_at ? format(new Date(g.created_at), 'dd.MM.yyyy HH:mm', { locale: pl }) : '—'}
                      </TableCell>
                      <TableCell>
                        {g.joined ? (
                          <Badge variant="default" className="text-xs">Tak</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-xs">Nie</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatDuration(g.watch_duration_seconds)}</TableCell>
                      <TableCell>
                        {g.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(g.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć gościa z listy?</AlertDialogTitle>
            <AlertDialogDescription>
              Rejestracja zostanie anulowana (soft delete). Gość nie będzie widoczny na liście aktywnych.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGuest} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
