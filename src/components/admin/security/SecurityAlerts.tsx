import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Shield, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export const SecurityAlerts: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      // Fetch profiles for affected users
      const userIds = [...new Set((data || []).map(a => a.user_id))];
      let profiles: Record<string, { first_name: string; last_name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', userIds);
        if (profilesData) {
          for (const p of profilesData) {
            profiles[p.user_id] = { first_name: p.first_name || '', last_name: p.last_name || '', email: p.email || '' };
          }
        }
      }

      return { alerts: data || [], profiles };
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('security_alerts')
        .update({
          is_resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['security-dashboard-stats'] });
      toast({ title: 'Alert rozwiązany' });
    },
  });

  const severityColor: Record<string, string> = {
    critical: 'destructive',
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {(!alerts?.alerts || alerts.alerts.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="font-semibold text-lg">Brak alertów bezpieczeństwa</h3>
            <p className="text-sm text-muted-foreground">System nie wykrył żadnych anomalii.</p>
          </CardContent>
        </Card>
      )}

      {alerts?.alerts.map((alert) => {
        const profile = alerts.profiles[alert.user_id];
        const details = alert.details as Record<string, any> || {};
        const cities = details.cities || [];

        return (
          <Card key={alert.id} className={!alert.is_resolved ? 'border-destructive/50' : 'opacity-60'}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${!alert.is_resolved ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <div>
                    <CardTitle className="text-base">
                      {alert.alert_type === 'multi_city_login' ? 'Logowanie z wielu miast' : alert.alert_type}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {profile ? `${profile.first_name} ${profile.last_name} (${profile.email})` : alert.user_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={severityColor[alert.severity] as any || 'default'}>
                    {alert.severity}
                  </Badge>
                  {alert.is_resolved ? (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Rozwiązany
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveMutation.mutate(alert.id)}
                      disabled={resolveMutation.isPending}
                    >
                      Rozwiąż
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  {format(new Date(alert.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: pl })}
                </p>
                {cities.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    {cities.map((city: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{city}</Badge>
                    ))}
                  </div>
                )}
                {details.ip_address && (
                  <p className="text-xs text-muted-foreground font-mono">IP: {details.ip_address}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
