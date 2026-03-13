import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, LogIn, ShieldCheck, Users } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export const SecurityDashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['security-dashboard-stats'],
    queryFn: async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [loginsRes, suspiciousRes, alertsRes, logins7dRes] = await Promise.all([
        supabase.from('login_audit_log').select('id', { count: 'exact', head: true }).gte('login_at', last24h),
        supabase.from('login_audit_log').select('id', { count: 'exact', head: true }).eq('is_suspicious', true).gte('login_at', last24h),
        supabase.from('security_alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
        supabase.from('login_audit_log').select('id', { count: 'exact', head: true }).gte('login_at', last7d),
      ]);

      // Get unique users in last 24h
      const { data: uniqueUsersData } = await supabase
        .from('login_audit_log')
        .select('user_id')
        .gte('login_at', last24h);

      const uniqueUsers = new Set(uniqueUsersData?.map(l => l.user_id) || []).size;

      return {
        logins24h: loginsRes.count || 0,
        suspicious24h: suspiciousRes.count || 0,
        unresolvedAlerts: alertsRes.count || 0,
        logins7d: logins7dRes.count || 0,
        uniqueUsers24h: uniqueUsers,
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

  const cards = [
    {
      title: 'Logowania (24h)',
      value: stats?.logins24h || 0,
      icon: LogIn,
      description: 'Wszystkie logowania',
      color: 'text-blue-500',
    },
    {
      title: 'Unikalni użytkownicy (24h)',
      value: stats?.uniqueUsers24h || 0,
      icon: Users,
      description: 'Aktywni w ostatnich 24h',
      color: 'text-green-500',
    },
    {
      title: 'Podejrzane logowania (24h)',
      value: stats?.suspicious24h || 0,
      icon: AlertTriangle,
      description: 'Wykryte anomalie',
      color: stats?.suspicious24h ? 'text-red-500' : 'text-muted-foreground',
    },
    {
      title: 'Aktywne alerty',
      value: stats?.unresolvedAlerts || 0,
      icon: Shield,
      description: 'Nierozwiązane',
      color: stats?.unresolvedAlerts ? 'text-orange-500' : 'text-muted-foreground',
    },
    {
      title: 'Logowania (7 dni)',
      value: stats?.logins7d || 0,
      icon: ShieldCheck,
      description: 'Trend tygodniowy',
      color: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
