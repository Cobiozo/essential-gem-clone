import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, LogIn, ShieldCheck, Users, MapPin, Activity, Monitor, Smartphone, Tablet, Globe, Clock } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const CHART_COLORS = ['hsl(var(--primary))', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#64748b'];

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  color: 'hsl(var(--foreground))',
  borderRadius: '8px',
  fontSize: '12px',
};

const axisTick = { fontSize: 11, fill: 'hsl(var(--foreground))' };
const axisTickSmall = { fontSize: 10, fill: 'hsl(var(--foreground))' };

const renderPieLabel = ({ name, value, percent }: { name: string; value: number; percent: number }) =>
  `${name} ${value} (${(percent * 100).toFixed(0)}%)`;

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Komputer',
  mobile: 'Telefon',
  tablet: 'Tablet',
  unknown: 'Nieznane',
};

const DEVICE_ICONS: Record<string, React.ElementType> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Globe,
};

export const SecurityDashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['security-dashboard-stats-v2'],
    queryFn: async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Parallel counts
      const [loginsRes, suspiciousRes, alertsRes, logins7dRes, logins30dRes] = await Promise.all([
        supabase.from('login_audit_log').select('id', { count: 'exact', head: true }).gte('login_at', last24h),
        supabase.from('login_audit_log').select('id', { count: 'exact', head: true }).eq('is_suspicious', true).gte('login_at', last24h),
        supabase.from('security_alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
        supabase.from('login_audit_log').select('id', { count: 'exact', head: true }).gte('login_at', last7d),
        supabase.from('login_audit_log').select('id', { count: 'exact', head: true }).gte('login_at', last30d),
      ]);

      // Full data for 7d (for all charts)
      const { data: logins7dData } = await supabase
        .from('login_audit_log')
        .select('login_at, user_id, city, country, device_type, os_name, browser_name, device_hash')
        .gte('login_at', last7d);

      const allLogins = logins7dData || [];

      // Unique users 24h
      const logins24hData = allLogins.filter(l => l.login_at >= last24h);
      const uniqueUsers24h = new Set(logins24hData.map(l => l.user_id)).size;
      const uniqueDevices24h = new Set(logins24hData.filter(l => l.device_hash).map(l => l.device_hash)).size;

      // Activity count 24h
      const { count: activityCount24h } = await supabase
        .from('user_activity_log' as any)
        .select('id', { count: 'exact', head: true })
        .gte('created_at', last24h);

      // --- Hourly trend (24h) ---
      const hourlyCounts: Record<number, number> = {};
      for (let h = 0; h < 24; h++) hourlyCounts[h] = 0;
      logins24hData.forEach(r => {
        const h = new Date(r.login_at).getHours();
        hourlyCounts[h]++;
      });
      const hourlyTrend = Object.entries(hourlyCounts).map(([hour, count]) => ({
        hour: `${hour}:00`,
        logowania: count,
      }));

      // --- Daily trend (7d) ---
      const dailyCounts: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dailyCounts[d.toISOString().split('T')[0]] = 0;
      }
      allLogins.forEach(r => {
        const day = new Date(r.login_at).toISOString().split('T')[0];
        if (dailyCounts[day] !== undefined) dailyCounts[day]++;
      });
      const loginTrend = Object.entries(dailyCounts).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric' }),
        logowania: count,
      }));

      // --- Device type distribution ---
      const deviceTypeCounts: Record<string, number> = {};
      allLogins.forEach(r => {
        const dt = r.device_type || 'unknown';
        deviceTypeCounts[dt] = (deviceTypeCounts[dt] || 0) + 1;
      });
      const deviceTypes = Object.entries(deviceTypeCounts)
        .map(([name, value]) => ({ name: DEVICE_LABELS[name] || name, value }))
        .sort((a, b) => b.value - a.value);

      // --- OS distribution ---
      const osCounts: Record<string, number> = {};
      allLogins.forEach(r => {
        const os = r.os_name || 'unknown';
        osCounts[os] = (osCounts[os] || 0) + 1;
      });
      const osDistribution = Object.entries(osCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // --- Browser distribution ---
      const browserCounts: Record<string, number> = {};
      allLogins.forEach(r => {
        const br = r.browser_name || 'unknown';
        browserCounts[br] = (browserCounts[br] || 0) + 1;
      });
      const browserDistribution = Object.entries(browserCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // --- Top cities ---
      const cityCounts: Record<string, number> = {};
      allLogins.forEach(r => {
        const c = r.city || 'Nieznane';
        if (c !== 'unknown') cityCounts[c] = (cityCounts[c] || 0) + 1;
      });
      const topCities = Object.entries(cityCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([city, count]) => ({ city, count }));

      // --- Top countries ---
      const countryCounts: Record<string, number> = {};
      allLogins.forEach(r => {
        const c = r.country || 'Nieznany';
        if (c !== 'unknown') countryCounts[c] = (countryCounts[c] || 0) + 1;
      });
      const topCountries = Object.entries(countryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([country, count]) => ({ country, count }));

      // --- Recent alerts ---
      const { data: recentAlerts } = await supabase
        .from('security_alerts')
        .select('id, alert_type, severity, created_at, is_resolved, details')
        .order('created_at', { ascending: false })
        .limit(8);

      // --- Activity types (7d) ---
      const { data: activityData } = await supabase
        .from('user_activity_log' as any)
        .select('action_type, created_at')
        .gte('created_at', last7d);

      const activityTypeCounts: Record<string, number> = {};
      (activityData || []).forEach((r: any) => {
        activityTypeCounts[r.action_type] = (activityTypeCounts[r.action_type] || 0) + 1;
      });
      const activityTypes = Object.entries(activityTypeCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // --- Recent activities ---
      const { data: recentActivities } = await supabase
        .from('user_activity_log' as any)
        .select('id, user_id, action_type, action_data, page_path, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get profiles for recent activities
      const activityUserIds = [...new Set((recentActivities || []).map((a: any) => a.user_id))];
      let activityProfiles: Record<string, { first_name: string; last_name: string }> = {};
      if (activityUserIds.length > 0) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', activityUserIds);
        if (pData) {
          for (const p of pData) {
            activityProfiles[p.user_id] = { first_name: p.first_name || '', last_name: p.last_name || '' };
          }
        }
      }

      // --- Recent logins with device info ---
      const { data: recentLogins } = await supabase
        .from('login_audit_log')
        .select('id, user_id, login_at, ip_address, city, country, device_type, os_name, browser_name, is_suspicious')
        .order('login_at', { ascending: false })
        .limit(8);

      const loginUserIds = [...new Set((recentLogins || []).map(l => l.user_id))];
      let loginProfiles: Record<string, { first_name: string; last_name: string }> = {};
      if (loginUserIds.length > 0) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', loginUserIds);
        if (pData) {
          for (const p of pData) {
            loginProfiles[p.user_id] = { first_name: p.first_name || '', last_name: p.last_name || '' };
          }
        }
      }

      return {
        logins24h: loginsRes.count || 0,
        suspicious24h: suspiciousRes.count || 0,
        unresolvedAlerts: alertsRes.count || 0,
        logins7d: logins7dRes.count || 0,
        logins30d: logins30dRes.count || 0,
        uniqueUsers24h,
        uniqueDevices24h,
        activityCount24h: activityCount24h || 0,
        hourlyTrend,
        loginTrend,
        deviceTypes,
        osDistribution,
        browserDistribution,
        topCities,
        topCountries,
        recentAlerts: recentAlerts || [],
        activityTypes,
        recentActivities: (recentActivities || []).map((a: any) => ({
          ...a,
          profile: activityProfiles[a.user_id],
        })),
        recentLogins: (recentLogins || []).map((l: any) => ({
          ...l,
          profile: loginProfiles[l.user_id],
        })),
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
    { title: 'Unikalni (24h)', value: stats?.uniqueUsers24h || 0, icon: Users, color: 'text-green-500' },
    { title: 'Podejrzane (24h)', value: stats?.suspicious24h || 0, icon: AlertTriangle, color: stats?.suspicious24h ? 'text-red-500' : 'text-muted-foreground' },
    { title: 'Aktywne alerty', value: stats?.unresolvedAlerts || 0, icon: Shield, color: stats?.unresolvedAlerts ? 'text-orange-500' : 'text-muted-foreground' },
    { title: 'Logowania (7d)', value: stats?.logins7d || 0, icon: ShieldCheck, color: 'text-primary' },
    { title: 'Logowania (30d)', value: stats?.logins30d || 0, icon: Activity, color: 'text-primary' },
    { title: 'Aktywności (24h)', value: stats?.activityCount24h || 0, icon: Globe, color: 'text-violet-500' },
    { title: 'Urządzenia (24h)', value: stats?.uniqueDevices24h || 0, icon: Monitor, color: 'text-cyan-500' },
  ];

  const ACTION_LABELS: Record<string, string> = {
    page_view: 'Wyświetlenie strony',
    download: 'Pobranie',
    share: 'Udostępnienie',
    certificate_download: 'Pobranie certyfikatu',
    resource_view: 'Wyświetlenie zasobu',
    training_lesson_complete: 'Ukończenie lekcji',
    training_module_start: 'Rozpoczęcie modułu',
    file_upload: 'Przesłanie pliku',
    profile_update: 'Aktualizacja profilu',
    meeting_join: 'Dołączenie do spotkania',
    chat_message: 'Wiadomość na czacie',
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Row 1: Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] font-medium text-muted-foreground leading-tight">{card.title}</CardTitle>
              <card.icon className={`w-3.5 h-3.5 ${card.color} flex-shrink-0`} />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Hourly + Daily trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> Logowania wg godzin (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.hourlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" tick={axisTickSmall} interval={2} />
                <YAxis tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="logowania" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Trend logowań (7 dni)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats?.loginTrend || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={axisTick} />
                <YAxis tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="logowania" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Device type, OS, Browser */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="w-4 h-4" /> Typ urządzenia (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.deviceTypes && stats.deviceTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.deviceTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={25} label={renderPieLabel} labelLine={true}>
                    {stats.deviceTypes.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Brak danych</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">System operacyjny (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.osDistribution && stats.osDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.osDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={25} label={renderPieLabel} labelLine={true}>
                    {stats.osDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Brak danych</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Przeglądarka (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.browserDistribution && stats.browserDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.browserDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={25} label={renderPieLabel} labelLine={true}>
                    {stats.browserDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Brak danych</p>}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Top cities + Top countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Top 10 miast (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topCities && stats.topCities.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.topCities} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="city" type="category" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Brak danych geolokalizacyjnych</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" /> Top 5 krajów (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topCountries && stats.topCountries.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.topCountries} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="country" type="category" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Brak danych geolokalizacyjnych</p>}
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Activity tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" /> Typy aktywności (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.activityTypes && stats.activityTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.activityTypes.map(a => ({ ...a, name: ACTION_LABELS[a.name] || a.name }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Brak danych aktywności</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ostatnie aktywności</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {stats.recentActivities.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                    <div>
                      <span className="font-medium">
                        {a.profile ? `${a.profile.first_name} ${a.profile.last_name}` : 'Nieznany'}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {ACTION_LABELS[a.action_type] || a.action_type}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {format(new Date(a.created_at), 'HH:mm dd.MM', { locale: pl })}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Brak danych aktywności</p>}
          </CardContent>
        </Card>
      </div>

      {/* Row 6: Alerts + Recent logins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Ostatnie alerty
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentAlerts && stats.recentAlerts.length > 0 ? (
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {stats.recentAlerts.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-400'}`} />
                      <span className="text-sm">{alert.alert_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.is_resolved ? 'secondary' : 'destructive'} className="text-[10px]">
                        {alert.is_resolved ? 'Rozwiązany' : 'Aktywny'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(alert.created_at), 'dd.MM HH:mm', { locale: pl })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Brak alertów</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LogIn className="w-4 h-4" /> Ostatnie logowania
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentLogins && stats.recentLogins.length > 0 ? (
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {stats.recentLogins.map((login: any) => {
                  const DeviceIcon = DEVICE_ICONS[login.device_type] || Monitor;
                  return (
                    <div key={login.id} className={`flex items-center justify-between p-2 rounded-md ${login.is_suspicious ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <DeviceIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {login.profile ? `${login.profile.first_name} ${login.profile.last_name}` : 'Nieznany'}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {login.os_name} · {login.browser_name} · {login.city !== 'unknown' ? login.city : login.ip_address}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {format(new Date(login.login_at), 'HH:mm dd.MM', { locale: pl })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Brak danych</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
