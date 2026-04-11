import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Loader2, AlertTriangle, CheckCircle, Shield, MapPin,
  ChevronDown, Monitor, Smartphone, Tablet, Globe, Ban,
  Lock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

type AuditLog = {
  id: string;
  user_id: string;
  ip_address: string | null;
  city: string | null;
  country: string | null;
  device_type: string | null;
  os_name: string | null;
  browser_name: string | null;
  login_status: string | null;
  failure_reason: string | null;
  login_at: string;
  is_suspicious: boolean | null;
  device_hash: string | null;
};

const DeviceIcon = ({ type }: { type: string | null }) => {
  if (type === 'mobile') return <Smartphone className="w-3.5 h-3.5" />;
  if (type === 'tablet') return <Tablet className="w-3.5 h-3.5" />;
  return <Monitor className="w-3.5 h-3.5" />;
};

export const SecurityAlerts: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [blockUserId, setBlockUserId] = useState<string | null>(null);
  const [blockUserName, setBlockUserName] = useState('');

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const userIds = [...new Set((data || []).map(a => a.user_id))];
      let profiles: Record<string, { first_name: string; last_name: string; email: string }> = {};
      let loginHistory: Record<string, AuditLog[]> = {};

      if (userIds.length > 0) {
        const [profilesRes, logsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, first_name, last_name, email')
            .in('user_id', userIds),
          supabase
            .from('login_audit_log')
            .select('*')
            .in('user_id', userIds)
            .order('login_at', { ascending: false })
            .limit(200),
        ]);

        if (profilesRes.data) {
          for (const p of profilesRes.data) {
            profiles[p.user_id] = { first_name: p.first_name || '', last_name: p.last_name || '', email: p.email || '' };
          }
        }

        if (logsRes.data) {
          for (const log of logsRes.data as AuditLog[]) {
            if (!loginHistory[log.user_id]) loginHistory[log.user_id] = [];
            if (loginHistory[log.user_id].length < 20) {
              loginHistory[log.user_id].push(log);
            }
          }
        }
      }

      return { alerts: data || [], profiles, loginHistory };
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('security_alerts')
        .update({ is_resolved: true, resolved_by: user?.id, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['security-dashboard-stats'] });
      toast({ title: 'Alert rozwiązany' });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('admin_toggle_user_status', {
        target_user_id: userId,
        new_status: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['security-dashboard-stats'] });
      toast({ title: 'Użytkownik zablokowany', description: blockUserName });
      setBlockUserId(null);
    },
    onError: () => {
      toast({ title: 'Błąd blokowania', variant: 'destructive' });
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
        const details = (alert.details as Record<string, any>) || {};
        const cities = details.cities || [];
        const logs = alerts.loginHistory[alert.user_id] || [];
        const userName = profile ? `${profile.first_name} ${profile.last_name}` : alert.user_id;

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
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveMutation.mutate(alert.id)}
                        disabled={resolveMutation.isPending}
                      >
                        Rozwiąż
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => { setBlockUserId(alert.user_id); setBlockUserName(userName); }}
                      >
                        <Ban className="w-3 h-3 mr-1" />
                        Zablokuj
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
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
              </div>

              {/* Device details from alert JSONB */}
              {(details.device_type || details.os_name || details.browser_name || details.ip_address || details.country) && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border rounded-lg p-2 bg-muted/30">
                  {details.device_type && (
                    <span className="flex items-center gap-1">
                      <DeviceIcon type={details.device_type} /> {details.device_type}
                    </span>
                  )}
                  {details.os_name && <span>🖥 {details.os_name}</span>}
                  {details.browser_name && <span>🌐 {details.browser_name}</span>}
                  {details.country && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {details.country}
                    </span>
                  )}
                  {details.ip_address && (
                    <span className="font-mono">IP: {details.ip_address}</span>
                  )}
                </div>
              )}

              {/* Collapsible login history */}
              {logs.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                      <ChevronDown className="w-3 h-3" />
                      Ostatnie logowania ({logs.length})
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 border rounded-lg overflow-auto max-h-80">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50 text-muted-foreground">
                            <th className="text-left p-1.5 font-medium">Data</th>
                            <th className="text-left p-1.5 font-medium">IP</th>
                            <th className="text-left p-1.5 font-medium">Miasto</th>
                            <th className="text-left p-1.5 font-medium">Kraj</th>
                            <th className="text-left p-1.5 font-medium">Urządzenie</th>
                            <th className="text-left p-1.5 font-medium">OS</th>
                            <th className="text-left p-1.5 font-medium">Przeglądarka</th>
                            <th className="text-left p-1.5 font-medium">Status</th>
                            <th className="text-left p-1.5 font-medium">Powód</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log) => (
                            <tr
                              key={log.id}
                              className={
                                log.login_status === 'failed'
                                  ? 'bg-destructive/10'
                                  : log.is_suspicious
                                  ? 'bg-yellow-500/10'
                                  : ''
                              }
                            >
                              <td className="p-1.5 whitespace-nowrap">
                                {format(new Date(log.login_at), 'dd.MM HH:mm', { locale: pl })}
                              </td>
                              <td className="p-1.5 font-mono whitespace-nowrap">{log.ip_address || '—'}</td>
                              <td className="p-1.5">{log.city || '—'}</td>
                              <td className="p-1.5">{log.country || '—'}</td>
                              <td className="p-1.5">
                                <span className="flex items-center gap-1">
                                  <DeviceIcon type={log.device_type} />
                                  {log.device_type || '—'}
                                </span>
                              </td>
                              <td className="p-1.5">{log.os_name || '—'}</td>
                              <td className="p-1.5">{log.browser_name || '—'}</td>
                              <td className="p-1.5">
                                {log.login_status === 'failed' ? (
                                  <Badge variant="destructive" className="text-[10px] h-4 px-1">failed</Badge>
                                ) : log.is_suspicious ? (
                                  <Badge variant="default" className="text-[10px] h-4 px-1 bg-yellow-500">suspicious</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1">ok</Badge>
                                )}
                              </td>
                              <td className="p-1.5 text-muted-foreground max-w-32 truncate">{log.failure_reason || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Unique IPs summary */}
                    {(() => {
                      const uniqueIps = [...new Set(logs.map(l => l.ip_address).filter(Boolean))];
                      const failedCount = logs.filter(l => l.login_status === 'failed').length;
                      return (
                        <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Unikalne IP: <strong>{uniqueIps.length}</strong>
                          </span>
                          {failedCount > 0 && (
                            <span className="text-destructive font-medium">
                              Nieudane logowania: {failedCount}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Block user confirmation dialog */}
      <AlertDialog open={!!blockUserId} onOpenChange={(open) => { if (!open) setBlockUserId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zablokować użytkownika?</AlertDialogTitle>
            <AlertDialogDescription>
              Użytkownik <strong>{blockUserName}</strong> zostanie zablokowany i nie będzie mógł się zalogować.
              Tę akcję można cofnąć w panelu zarządzania użytkownikami.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => blockUserId && blockMutation.mutate(blockUserId)}
              disabled={blockMutation.isPending}
            >
              {blockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Ban className="w-4 h-4 mr-1" />}
              Zablokuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
