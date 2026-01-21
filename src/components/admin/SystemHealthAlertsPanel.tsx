import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  XCircle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  RefreshCw, 
  Clock,
  Users,
  BookOpen,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AdminAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  affected_user_id: string | null;
  affected_entity_type: string | null;
  affected_entity_id: string | null;
  metadata: Record<string, any>;
  suggested_action: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  detected_at: string;
  created_at: string;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'info':
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <Badge variant="destructive">KRYTYCZNY</Badge>;
    case 'error':
      return <Badge variant="destructive" className="bg-red-400">BŁĄD</Badge>;
    case 'warning':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">OSTRZEŻENIE</Badge>;
    case 'info':
    default:
      return <Badge variant="secondary">INFO</Badge>;
  }
};

const getAlertTypeIcon = (alertType: string) => {
  switch (alertType) {
    case 'missing_role':
      return <Shield className="h-4 w-4" />;
    case 'missing_training':
      return <BookOpen className="h-4 w-4" />;
    case 'unapproved_user_24h':
      return <Users className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

export const SystemHealthAlertsPanel: React.FC = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AdminAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .order('detected_at', { ascending: false });

      if (error) throw error;
      setAlerts((data as AdminAlert[]) || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać alertów",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Realtime subscription
    const channel = supabase
      .channel('admin-alerts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_alerts'
      }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const runHealthCheck = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke('system-health-check');
      
      if (error) throw error;
      
      toast({
        title: "Sprawdzenie ukończone",
        description: "System health check zakończony pomyślnie",
      });
      
      await fetchAlerts();
    } catch (error) {
      console.error('Error running health check:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się uruchomić sprawdzenia systemu",
        variant: "destructive"
      });
    } finally {
      setRunning(false);
    }
  };

  const openResolveDialog = (alert: AdminAlert) => {
    setSelectedAlert(alert);
    setResolutionNotes('');
    setResolveDialogOpen(true);
  };

  const resolveAlert = async () => {
    if (!selectedAlert) return;

    try {
      const { error } = await supabase
        .from('admin_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes || null
        })
        .eq('id', selectedAlert.id);

      if (error) throw error;

      toast({
        title: "Alert rozwiązany",
        description: "Alert został oznaczony jako rozwiązany",
      });

      setResolveDialogOpen(false);
      setSelectedAlert(null);
      await fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się rozwiązać alertu",
        variant: "destructive"
      });
    }
  };

  const activeAlerts = alerts.filter(a => !a.is_resolved);
  const resolvedAlerts = alerts.filter(a => a.is_resolved);

  const criticalCount = activeAlerts.filter(a => a.severity === 'critical' || a.severity === 'error').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;
  const infoCount = activeAlerts.filter(a => a.severity === 'info').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Alerty systemowe</h2>
          <p className="text-muted-foreground">
            Monitorowanie anomalii i stanu systemu
          </p>
        </div>
        <Button onClick={runHealthCheck} disabled={running}>
          <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Sprawdzanie...' : 'Uruchom sprawdzenie'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={criticalCount > 0 ? 'border-red-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Krytyczne / Błędy</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card className={warningCount > 0 ? 'border-yellow-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ostrzeżenia</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warningCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Informacyjne</CardTitle>
            <Info className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{infoCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="relative">
            Aktywne
            {activeAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {activeAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Rozwiązane ({resolvedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">Brak aktywnych alertów</p>
                <p className="text-muted-foreground">System działa prawidłowo</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <Card key={alert.id} className={
                    alert.severity === 'critical' ? 'border-l-4 border-l-red-500' :
                    alert.severity === 'error' ? 'border-l-4 border-l-red-400' :
                    alert.severity === 'warning' ? 'border-l-4 border-l-yellow-500' :
                    'border-l-4 border-l-blue-500'
                  }>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(alert.severity)}
                          <div>
                            <CardTitle className="text-base">{alert.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              {getSeverityBadge(alert.severity)}
                              <Badge variant="outline" className="gap-1">
                                {getAlertTypeIcon(alert.alert_type)}
                                {alert.alert_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(alert.detected_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {alert.description && (
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      )}
                      
                      {alert.suggested_action && (
                        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <span className="text-primary font-medium">➜</span>
                          <p className="text-sm">{alert.suggested_action}</p>
                        </div>
                      )}

                      {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Szczegóły techniczne
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(alert.metadata, null, 2)}
                          </pre>
                        </details>
                      )}

                      <div className="flex justify-end pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openResolveDialog(alert)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Oznacz jako rozwiązane
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          {resolvedAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <p className="text-muted-foreground">Brak rozwiązanych alertów</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {resolvedAlerts.map((alert) => (
                  <Card key={alert.id} className="opacity-75">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <CardTitle className="text-base line-through">{alert.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              {getSeverityBadge(alert.severity)}
                              <Badge variant="outline" className="gap-1">
                                {getAlertTypeIcon(alert.alert_type)}
                                {alert.alert_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>Wykryto: {format(new Date(alert.detected_at), 'dd.MM.yyyy HH:mm', { locale: pl })}</div>
                          {alert.resolved_at && (
                            <div className="text-green-600">
                              Rozwiązano: {format(new Date(alert.resolved_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {alert.resolution_notes && (
                      <CardContent>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>Notatka:</strong> {alert.resolution_notes}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rozwiąż alert</DialogTitle>
            <DialogDescription>
              Oznacz alert jako rozwiązany i dodaj opcjonalną notatkę.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedAlert.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedAlert.description}</p>
              </div>
              
              <Textarea
                placeholder="Opcjonalna notatka o rozwiązaniu..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={resolveAlert}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Rozwiąż
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemHealthAlertsPanel;
