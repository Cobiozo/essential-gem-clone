import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, LogIn, ShieldCheck, Users, MapPin, Activity } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export const SecurityDashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['security-dashboard-stats'],
    queryFn: async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [loginsRes, suspiciousRes, alertsRes, logins7dRes, logins30dRes] = await Promise.all([
        supabase.from('login_audit_log').select('id', { count: 'exact', head: true }).gte('login_at', last24h),
        supabase.from('login_audit_log').select('id', { count: 'exact', head: true }).eq('is_suspicious', true).gte('login_at', last24h),
        supabase.from('security_alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
        supabase.from('login_audit_log').select('id', { count: 'exact', head: true }).gte('login_at', last7d),
        supabase.from('login_audit_log').select('id', { count: 'exact', head: true }).gte('login_at', last30d),
      ]);

      // Unique users 24h
      const { data: uniqueUsersData } = await supabase
        .from('login_audit_log').select('user_id').gte('login_at', last24h);
      const uniqueUsers = new Set(uniqueUsersData?.map(l => l.user_id) || []).size;

      // Login trend (last 7 days, grouped by day)
      const { data: trendData } = await supabase
        .from('login_audit_log').select('login_at').gte('login_at', last7d);

      const dailyCounts: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dailyCounts[d.toISOString().split('T')[0]] = 0;
      }
      trendData?.forEach(r => {
        const day = new Date(r.login_at).toISOString().split('T')[0];
        if (dailyCounts[day] !== undefined) dailyCounts[day]++;
      });
      const loginTrend = Object.entries(dailyCounts).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric' }),
        logowania: count,
      }));

      // Top cities (7d)
      const { data: cityData } = await supabase
        .from('login_audit_log').select('city').gte('login_at', last7d).not('city', 'is', null);
      const cityCounts: Record<string, number> = {};
      cityData?.forEach(r => { const c = r.city || 'Nieznane'; cityCounts[c] = (cityCounts[c] || 0) + 1; });
      const topCities = Object.entries(cityCounts).sort(([,a], [,b]) => b - a).slice(0, 10)
        .map(([city, count]) => ({ city, count }));

      // Device hash distribution (7d)
      const { data: deviceData } = await supabase
        .from('login_audit_log').select('device_hash').gte('login_at', last7d).not('device_hash', 'is', null);
      const deviceCounts: Record<string, number> = {};
      deviceData?.forEach(r => { const d = r.device_hash || '?'; deviceCounts[d] = (deviceCounts[d] || 0) + 1; });
      const devices = Object.entries(deviceCounts).sort(([,a], [,b]) => b - a).slice(0, 6)
        .map(([hash, count]) => ({ name: hash.slice(0, 8), value: count }));

      // Recent alerts
      const { data: recentAlerts } = await supabase
        .from('security_alerts')
        .select('id, alert_type, severity, created_at, is_resolved')
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        logins24h: loginsRes.count || 0,
        suspicious24h: suspiciousRes.count || 0,
        unresolvedAlerts: alertsRes.count || 0,
        logins7d: logins7dRes.count || 0,
        logins30d: logins30dRes.count || 0,
        uniqueUsers24h: uniqueUsers,
        loginTrend,
        topCities,
        devices,
        recentAlerts: recentAlerts || [],
      };
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const summaryCards = [
    { title: 'Logowania (24h)', value: stats?.logins24h || 0, icon: LogIn, color: 'text-blue-500' },
    { title: 'Unikalni użytkownicy (24h)', value: stats?.uniqueUsers24h || 0, icon: Users, color: 'text-green-500' },
    { title: 'Podejrzane (24h)', value: stats?.suspicious24h || 0, icon: AlertTriangle, color: stats?.suspicious24h ? 'text-red-500' : 'text-muted-foreground' },
    { title: 'Aktywne alerty', value: stats?.unresolvedAlerts || 0, icon: Shield, color: stats?.unresolvedAlerts ? 'text-orange-500' : 'text-muted-foreground' },
    { title: 'Logowania (7d)', value: stats?.logins7d || 0, icon: ShieldCheck, color: 'text-primary' },
    { title: 'Logowania (30d)', value: stats?.logins30d || 0, icon: Activity, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6 mt-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Login trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Trend logowań (7 dni)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats?.loginTrend || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip />
                <Area type="monotone" dataKey="logowania" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top cities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Top 10 miast (7 dni)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topCities && stats.topCities.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.topCities} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="city" type="category" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Brak danych</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Devices pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Urządzenia (7 dni)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.devices && stats.devices.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.devices} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {stats.devices.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Brak danych</p>
            )}
          </CardContent>
        </Card>

        {/* Recent alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Ostatnie alerty
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentAlerts && stats.recentAlerts.length > 0 ? (
              <div className="space-y-2">
                {stats.recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${alert.severity === 'high' ? 'bg-red-500' : 'bg-orange-400'}`} />
                      <span className="text-sm">{alert.alert_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${alert.is_resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {alert.is_resolved ? 'Rozwiązany' : 'Aktywny'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString('pl-PL')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Brak alertów</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
