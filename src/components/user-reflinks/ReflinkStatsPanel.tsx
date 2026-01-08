import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp, MousePointer, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, parseISO, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ReflinkEvent {
  id: string;
  reflink_id: string;
  event_type: 'click' | 'registration';
  target_role: string | null;
  created_at: string;
}

interface DayStats {
  date: string;
  dateLabel: string;
  clicks: number;
  registrations: number;
}

interface RoleStats {
  role: string;
  clicks: number;
  registrations: number;
}

const chartConfig = {
  clicks: {
    label: "Kliknięcia",
    color: "hsl(var(--primary))",
  },
  registrations: {
    label: "Rejestracje",
    color: "hsl(142 76% 36%)",
  },
};

export const ReflinkStatsPanel: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<ReflinkEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchEvents = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const startDate = subDays(new Date(), parseInt(period));
      
      // Get user's reflinks first
      const { data: userReflinks } = await supabase
        .from('user_reflinks')
        .select('id')
        .eq('creator_user_id', user.id);

      if (!userReflinks || userReflinks.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const reflinkIds = userReflinks.map(r => r.id);

      // Fetch events for user's reflinks
      const { data: eventsData, error } = await supabase
        .from('reflink_events')
        .select('*')
        .in('reflink_id', reflinkIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEvents((eventsData as unknown as ReflinkEvent[]) || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Process data for chart
  const chartData: DayStats[] = React.useMemo(() => {
    const days = parseInt(period);
    const result: DayStats[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayEvents = events.filter(e => {
        const eventDate = format(parseISO(e.created_at), 'yyyy-MM-dd');
        const roleMatch = roleFilter === 'all' || e.target_role === roleFilter;
        return eventDate === dateStr && roleMatch;
      });

      result.push({
        date: dateStr,
        dateLabel: format(date, 'd MMM', { locale: pl }),
        clicks: dayEvents.filter(e => e.event_type === 'click').length,
        registrations: dayEvents.filter(e => e.event_type === 'registration').length,
      });
    }
    
    return result;
  }, [events, period, roleFilter]);

  // Stats by role
  const roleStats: RoleStats[] = React.useMemo(() => {
    const roles = ['client', 'partner', 'specjalista'];
    return roles.map(role => ({
      role,
      clicks: events.filter(e => e.target_role === role && e.event_type === 'click').length,
      registrations: events.filter(e => e.target_role === role && e.event_type === 'registration').length,
    })).filter(r => r.clicks > 0 || r.registrations > 0);
  }, [events]);

  // Totals
  const totals = React.useMemo(() => {
    const filtered = roleFilter === 'all' 
      ? events 
      : events.filter(e => e.target_role === roleFilter);
    return {
      clicks: filtered.filter(e => e.event_type === 'click').length,
      registrations: filtered.filter(e => e.event_type === 'registration').length,
      conversionRate: filtered.filter(e => e.event_type === 'click').length > 0
        ? ((filtered.filter(e => e.event_type === 'registration').length / 
            filtered.filter(e => e.event_type === 'click').length) * 100).toFixed(1)
        : '0',
    };
  }, [events, roleFilter]);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'client': return 'Klient';
      case 'partner': return 'Partner';
      case 'specjalista': return 'Specjalista';
      default: return role;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Ładowanie statystyk...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MousePointer className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.clicks}</p>
                <p className="text-sm text-muted-foreground">Kliknięć</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserPlus className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.registrations}</p>
                <p className="text-sm text-muted-foreground">Rejestracji</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.conversionRate}%</p>
                <p className="text-sm text-muted-foreground">Konwersja</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Aktywność w czasie
            </CardTitle>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Rola" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie role</SelectItem>
                  <SelectItem value="client">Klient</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="specjalista">Specjalista</SelectItem>
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={(v) => setPeriod(v as '7' | '30' | '90')}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Okres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dni</SelectItem>
                  <SelectItem value="30">30 dni</SelectItem>
                  <SelectItem value="90">90 dni</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak danych dla wybranego okresu
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="dateLabel" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar 
                    dataKey="clicks" 
                    name="Kliknięcia" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="registrations" 
                    name="Rejestracje" 
                    fill="hsl(142 76% 36%)" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Role breakdown */}
      {roleStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Podział według roli</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roleStats.map(stat => (
                <div key={stat.role} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">{getRoleLabel(stat.role)}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">
                      <MousePointer className="w-3 h-3 inline mr-1" />
                      {stat.clicks}
                    </span>
                    <span className="text-green-600">
                      <UserPlus className="w-3 h-3 inline mr-1" />
                      {stat.registrations}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
