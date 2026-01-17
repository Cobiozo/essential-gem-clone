import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Loader2,
  Clock,
  Activity,
  Trash2,
  TestTube,
  Unlink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, subHours } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ConnectedPartner {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  connected_at: string;
  expires_at: string;
  sync_count: number;
  success_count: number;
  error_count: number;
  avg_response_time: number;
  last_sync_at: string | null;
}

interface SyncLog {
  id: string;
  user_id: string;
  event_id: string | null;
  action: string;
  status: string;
  error_message: string | null;
  response_time_ms: number | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface DailyStats {
  date: string;
  total: number;
  success: number;
  error: number;
}

const ITEMS_PER_PAGE = 15;

const chartConfig = {
  success: {
    label: 'Sukces',
    color: 'hsl(var(--chart-1))',
  },
  error: {
    label: 'Błąd',
    color: 'hsl(var(--destructive))',
  },
} satisfies ChartConfig;

const pieColors = ['hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(48, 96%, 53%)'];

export const GoogleCalendarManagement: React.FC = () => {
  const { toast } = useToast();
  const { t } = useLanguage();

  // State
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<ConnectedPartner[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  
  // Stats
  const [totalConnected, setTotalConnected] = useState(0);
  const [totalSyncs24h, setTotalSyncs24h] = useState(0);
  const [successRate24h, setSuccessRate24h] = useState(0);
  const [errorsCount24h, setErrorsCount24h] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d'>('24h');
  const [logsPage, setLogsPage] = useState(1);
  const [totalLogsCount, setTotalLogsCount] = useState(0);

  // Diagnostics
  const [testingUser, setTestingUser] = useState<string | null>(null);
  const [cleaningLogs, setCleaningLogs] = useState(false);

  // Selected partner for details
  const [selectedPartner, setSelectedPartner] = useState<ConnectedPartner | null>(null);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPartners(),
        loadLogs(),
        loadStats(),
        loadDailyStats(),
      ]);
    } catch (error) {
      console.error('[GoogleCalendarManagement] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, timeFilter, logsPage, searchQuery]);

  // Load connected partners with stats
  const loadPartners = async () => {
    try {
      // Get all users with google tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('user_google_tokens')
        .select('user_id, created_at, expires_at');

      if (tokensError) throw tokensError;

      if (!tokens || tokens.length === 0) {
        setPartners([]);
        setTotalConnected(0);
        return;
      }

      setTotalConnected(tokens.length);

      // Get profiles for these users
      const userIds = tokens.map(t => t.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .in('user_id', userIds);

      // Get sync stats from logs (if table exists and has data)
      const { data: syncStats } = await supabase
        .from('google_calendar_sync_logs')
        .select('user_id, status, response_time_ms, created_at')
        .in('user_id', userIds);

      // Aggregate stats per user
      const statsMap = new Map<string, {
        sync_count: number;
        success_count: number;
        error_count: number;
        total_time: number;
        last_sync_at: string | null;
      }>();

      syncStats?.forEach(log => {
        const existing = statsMap.get(log.user_id) || {
          sync_count: 0,
          success_count: 0,
          error_count: 0,
          total_time: 0,
          last_sync_at: null,
        };
        existing.sync_count++;
        if (log.status === 'success') existing.success_count++;
        if (log.status === 'error') existing.error_count++;
        if (log.response_time_ms) existing.total_time += log.response_time_ms;
        if (!existing.last_sync_at || log.created_at > existing.last_sync_at) {
          existing.last_sync_at = log.created_at;
        }
        statsMap.set(log.user_id, existing);
      });

      // Merge data
      const partnersData: ConnectedPartner[] = tokens.map(token => {
        const profile = profiles?.find(p => p.user_id === token.user_id);
        const stats = statsMap.get(token.user_id);
        return {
          user_id: token.user_id,
          email: profile?.email || 'Nieznany',
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          connected_at: token.created_at,
          expires_at: token.expires_at,
          sync_count: stats?.sync_count || 0,
          success_count: stats?.success_count || 0,
          error_count: stats?.error_count || 0,
          avg_response_time: stats?.sync_count 
            ? Math.round(stats.total_time / stats.sync_count) 
            : 0,
          last_sync_at: stats?.last_sync_at || null,
        };
      });

      // Sort by last sync
      partnersData.sort((a, b) => {
        if (!a.last_sync_at) return 1;
        if (!b.last_sync_at) return -1;
        return new Date(b.last_sync_at).getTime() - new Date(a.last_sync_at).getTime();
      });

      setPartners(partnersData);
    } catch (error) {
      console.error('[GoogleCalendarManagement] Error loading partners:', error);
    }
  };

  // Load logs with filters
  const loadLogs = async () => {
    try {
      // Calculate time filter
      let startDate: Date;
      switch (timeFilter) {
        case '7d':
          startDate = subDays(new Date(), 7);
          break;
        case '30d':
          startDate = subDays(new Date(), 30);
          break;
        default:
          startDate = subHours(new Date(), 24);
      }

      // Build query
      let query = supabase
        .from('google_calendar_sync_logs')
        .select('*', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Pagination
      const offset = (logsPage - 1) * ITEMS_PER_PAGE;
      query = query.range(offset, offset + ITEMS_PER_PAGE - 1);

      const { data: logsData, error: logsError, count } = await query;

      if (logsError) throw logsError;

      // Get user profiles for logs
      if (logsData && logsData.length > 0) {
        const userIds = [...new Set(logsData.map(l => l.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email, first_name, last_name')
          .in('user_id', userIds);

        const enrichedLogs: SyncLog[] = logsData.map(log => {
          const profile = profiles?.find(p => p.user_id === log.user_id);
          return {
            ...log,
            user_email: profile?.email || 'Nieznany',
            user_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
          };
        });

        setLogs(enrichedLogs);
      } else {
        setLogs([]);
      }

      setTotalLogsCount(count || 0);
    } catch (error) {
      console.error('[GoogleCalendarManagement] Error loading logs:', error);
    }
  };

  // Load 24h stats
  const loadStats = async () => {
    try {
      const last24h = subHours(new Date(), 24).toISOString();
      
      const { data: recentLogs } = await supabase
        .from('google_calendar_sync_logs')
        .select('status')
        .gte('created_at', last24h);

      if (recentLogs) {
        const total = recentLogs.length;
        const successCount = recentLogs.filter(l => l.status === 'success').length;
        const errorCount = recentLogs.filter(l => l.status === 'error').length;

        setTotalSyncs24h(total);
        setSuccessRate24h(total > 0 ? Math.round((successCount / total) * 100) : 0);
        setErrorsCount24h(errorCount);
      }
    } catch (error) {
      console.error('[GoogleCalendarManagement] Error loading stats:', error);
    }
  };

  // Load daily stats for chart
  const loadDailyStats = async () => {
    try {
      const last7Days = subDays(new Date(), 7).toISOString();
      
      const { data: logsData } = await supabase
        .from('google_calendar_sync_logs')
        .select('status, created_at')
        .gte('created_at', last7Days);

      if (logsData) {
        // Group by day
        const statsMap = new Map<string, DailyStats>();
        
        logsData.forEach(log => {
          const dateKey = format(new Date(log.created_at), 'yyyy-MM-dd');
          const existing = statsMap.get(dateKey) || { date: dateKey, total: 0, success: 0, error: 0 };
          existing.total++;
          if (log.status === 'success') existing.success++;
          if (log.status === 'error') existing.error++;
          statsMap.set(dateKey, existing);
        });

        // Convert to array and sort
        const stats = Array.from(statsMap.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(s => ({
            ...s,
            date: format(new Date(s.date), 'dd.MM', { locale: pl }),
          }));

        setDailyStats(stats);
      }
    } catch (error) {
      console.error('[GoogleCalendarManagement] Error loading daily stats:', error);
    }
  };

  // Test user connection
  const testConnection = async (userId: string) => {
    setTestingUser(userId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: { user_id: userId, action: 'test' },
      });

      if (error) throw error;

      toast({
        title: data?.success ? 'Połączenie działa' : 'Problem z połączeniem',
        description: data?.message || 'Test zakończony',
        variant: data?.success ? 'default' : 'destructive',
      });
    } catch (error: any) {
      toast({
        title: 'Błąd testu',
        description: error.message || 'Nie udało się przetestować połączenia',
        variant: 'destructive',
      });
    } finally {
      setTestingUser(null);
    }
  };

  // Disconnect user
  const disconnectUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_google_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Also delete sync records
      await supabase
        .from('event_google_sync')
        .delete()
        .eq('user_id', userId);

      toast({
        title: 'Rozłączono',
        description: 'Użytkownik został rozłączony z Google Calendar',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się rozłączyć użytkownika',
        variant: 'destructive',
      });
    }
  };

  // Clean old logs
  const cleanOldLogs = async () => {
    setCleaningLogs(true);
    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { error, count } = await supabase
        .from('google_calendar_sync_logs')
        .delete()
        .lt('created_at', thirtyDaysAgo);

      if (error) throw error;

      toast({
        title: 'Wyczyszczono logi',
        description: `Usunięto stare logi synchronizacji`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się wyczyścić logów',
        variant: 'destructive',
      });
    } finally {
      setCleaningLogs(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, [statusFilter, timeFilter, logsPage]);

  // Status badge renderer
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Sukces</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Błąd</Badge>;
      case 'skipped':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Pominięto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Action badge renderer
  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      update: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      test: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      connect: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      disconnect: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return (
      <Badge variant="outline" className={colors[action] || ''}>
        {action}
      </Badge>
    );
  };

  // Pagination
  const totalPages = Math.ceil(totalLogsCount / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate action distribution for pie chart
  const actionDistribution = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(actionDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Google Calendar - Monitoring
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Zarządzanie synchronizacją i wsparcie partnerów
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Odśwież
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Połączeni</p>
                <p className="text-2xl font-bold">{totalConnected}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Syncy (24h)</p>
                <p className="text-2xl font-bold">{totalSyncs24h}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sukces (24h)</p>
                <p className="text-2xl font-bold text-green-600">{successRate24h}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Błędy (24h)</p>
                <p className="text-2xl font-bold text-destructive">{errorsCount24h}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="partners">Partnerzy</TabsTrigger>
          <TabsTrigger value="history">Historia</TabsTrigger>
          <TabsTrigger value="stats">Statystyki</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostyka</TabsTrigger>
        </TabsList>

        {/* Partners Tab */}
        <TabsContent value="partners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Połączeni partnerzy ({partners.length})</CardTitle>
              <CardDescription>
                Lista użytkowników z aktywną synchronizacją Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {partners.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Brak połączonych użytkowników
                </p>
              ) : (
                <div className="space-y-3">
                  {partners.map(partner => (
                    <div
                      key={partner.user_id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">
                            {partner.first_name} {partner.last_name}
                          </span>
                          <span className="text-sm text-muted-foreground truncate">
                            ({partner.email})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span>📅 Syncy: {partner.sync_count}</span>
                          <span className="text-green-600">✓ {partner.success_count}</span>
                          {partner.error_count > 0 && (
                            <span className="text-destructive">✗ {partner.error_count}</span>
                          )}
                          {partner.avg_response_time > 0 && (
                            <span>⏱️ śr. {partner.avg_response_time}ms</span>
                          )}
                        </div>
                        {partner.last_sync_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ostatnia sync: {formatDistanceToNow(new Date(partner.last_sync_at), { addSuffix: true, locale: pl })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnection(partner.user_id)}
                          disabled={testingUser === partner.user_id}
                        >
                          {testingUser === partner.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectUser(partner.user_id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Historia synchronizacji</CardTitle>
                  <CardDescription>
                    Logi operacji ({totalLogsCount} rekordów)
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setLogsPage(1); }}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      <SelectItem value="success">Sukces</SelectItem>
                      <SelectItem value="error">Błąd</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeFilter} onValueChange={(v: any) => { setTimeFilter(v); setLogsPage(1); }}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Czas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 godziny</SelectItem>
                      <SelectItem value="7d">7 dni</SelectItem>
                      <SelectItem value="30d">30 dni</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Brak logów dla wybranych filtrów
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Użytkownik</TableHead>
                          <TableHead>Akcja</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Czas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map(log => (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap text-sm">
                              {format(new Date(log.created_at), 'dd.MM HH:mm:ss', { locale: pl })}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px] truncate">
                                {log.user_name || log.user_email}
                              </div>
                            </TableCell>
                            <TableCell>{getActionBadge(log.action)}</TableCell>
                            <TableCell>
                              {getStatusBadge(log.status)}
                              {log.error_message && (
                                <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={log.error_message}>
                                  {log.error_message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Strona {logsPage} z {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                          disabled={logsPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLogsPage(p => Math.min(totalPages, p + 1))}
                          disabled={logsPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Daily Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Synchronizacje (ostatnie 7 dni)</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Brak danych</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={dailyStats}>
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="success" fill="var(--color-success)" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="error" fill="var(--color-error)" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Action Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rozkład akcji</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Brak danych</p>
                ) : (
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Response Times */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Średnie czasy odpowiedzi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {['create', 'update', 'delete', 'test'].map(action => {
                  const actionLogs = logs.filter(l => l.action === action && l.response_time_ms);
                  const avgTime = actionLogs.length > 0
                    ? Math.round(actionLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / actionLogs.length)
                    : 0;
                  return (
                    <div key={action} className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground capitalize">{action}</p>
                      <p className="text-xl font-bold">{avgTime > 0 ? `${avgTime}ms` : '-'}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Narzędzia diagnostyczne
              </CardTitle>
              <CardDescription>
                Zarządzanie i diagnostyka synchronizacji
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Clean Old Logs */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Wyczyść stare logi</p>
                  <p className="text-sm text-muted-foreground">
                    Usuń logi starsze niż 30 dni
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={cleanOldLogs}
                  disabled={cleaningLogs}
                >
                  {cleaningLogs ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Wyczyść
                </Button>
              </div>

              {/* Alerts Section */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Alerty
                </h4>
                
                {/* Expiring Tokens */}
                {partners.filter(p => {
                  const expiresAt = new Date(p.expires_at);
                  const hoursUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
                  return hoursUntilExpiry < 24 && hoursUntilExpiry > 0;
                }).length > 0 ? (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ {partners.filter(p => {
                        const expiresAt = new Date(p.expires_at);
                        const hoursUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
                        return hoursUntilExpiry < 24 && hoursUntilExpiry > 0;
                      }).length} tokenów wygasa w ciągu 24 godzin
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    ✓ Brak alertów
                  </p>
                )}

                {/* Recent Errors */}
                {errorsCount24h > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      ❌ {errorsCount24h} błędów synchronizacji w ostatnich 24h
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GoogleCalendarManagement;
