import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Smartphone, Monitor, Globe } from 'lucide-react';

interface BrowserStats {
  name: string;
  count: number;
  percentage: number;
}

interface SubscriptionStats {
  total: number;
  uniqueUsers: number;
  pwa: number;
  browser: number;
  browsers: BrowserStats[];
  deviceTypes: { mobile: number; desktop: number; tablet: number };
}

// Browser icon component
const BrowserIcon: React.FC<{ name: string }> = ({ name }) => {
  const iconClass = "w-5 h-5";
  
  switch (name?.toLowerCase()) {
    case 'chrome':
      return <span className={iconClass}>🌐</span>;
    case 'firefox':
      return <span className={iconClass}>🦊</span>;
    case 'safari':
      return <span className={iconClass}>🧭</span>;
    case 'edge':
      return <span className={iconClass}>📘</span>;
    case 'opera':
      return <span className={iconClass}>🔴</span>;
    case 'brave':
      return <span className={iconClass}>🦁</span>;
    default:
      return <Globe className={iconClass} />;
  }
};

export const SubscriptionStatsPanel: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['push-subscription-stats'],
    queryFn: async (): Promise<SubscriptionStats> => {
      // Fetch all subscriptions
      const { data: subscriptions, error } = await supabase
        .from('user_push_subscriptions')
        .select('*');
      
      if (error) throw error;
      
      if (!subscriptions || subscriptions.length === 0) {
        return {
          total: 0,
          uniqueUsers: 0,
          pwa: 0,
          browser: 0,
          browsers: [],
          deviceTypes: { mobile: 0, desktop: 0, tablet: 0 },
        };
      }

      // Calculate stats
      const uniqueUsers = new Set(subscriptions.map(s => s.user_id)).size;
      const pwaCount = subscriptions.filter(s => s.is_pwa).length;
      const browserCount = subscriptions.filter(s => !s.is_pwa).length;

      // Browser breakdown
      const browserCounts: Record<string, number> = {};
      subscriptions.forEach(s => {
        const browser = s.browser || 'unknown';
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      });

      const browsers: BrowserStats[] = Object.entries(browserCounts)
        .map(([name, count]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          count,
          percentage: Math.round((count / subscriptions.length) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      // Device type breakdown
      const deviceTypes = { mobile: 0, desktop: 0, tablet: 0 };
      subscriptions.forEach(s => {
        const type = s.device_type as keyof typeof deviceTypes;
        if (type in deviceTypes) {
          deviceTypes[type]++;
        }
      });

      return {
        total: subscriptions.length,
        uniqueUsers,
        pwa: pwaCount,
        browser: browserCount,
        browsers,
        deviceTypes,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Błąd ładowania statystyk: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total subscriptions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Aktywne subskrypcje</CardTitle>
          <Users className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total || 0}</div>
          <p className="text-xs text-muted-foreground">
            na {stats?.uniqueUsers || 0} użytkowników
          </p>
        </CardContent>
      </Card>

      {/* PWA vs Browser */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Typ instalacji</CardTitle>
          <Smartphone className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">PWA (zainstalowane)</span>
              <Badge>{stats?.pwa || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Przeglądarka</span>
              <Badge variant="outline">{stats?.browser || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device types */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Urządzenia</CardTitle>
          <Monitor className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Desktop</span>
              <Badge variant="secondary">{stats?.deviceTypes?.desktop || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Mobile</span>
              <Badge variant="secondary">{stats?.deviceTypes?.mobile || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Tablet</span>
              <Badge variant="secondary">{stats?.deviceTypes?.tablet || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Browsers breakdown */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Przeglądarki</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.browsers && stats.browsers.length > 0 ? (
            <div className="space-y-2">
              {stats.browsers.slice(0, 5).map((b) => (
                <div key={b.name} className="flex items-center gap-2">
                  <BrowserIcon name={b.name} />
                  <span className="flex-1 text-sm">{b.name}</span>
                  <Badge variant="secondary">{b.count}</Badge>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {b.percentage}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Brak danych</p>
          )}
        </CardContent>
      </Card>

      {/* Empty state when no subscriptions */}
      {stats?.total === 0 && (
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Brak aktywnych subskrypcji</p>
              <p className="text-sm">
                Użytkownicy mogą włączyć powiadomienia push w swoich ustawieniach lub na stronie wiadomości.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
