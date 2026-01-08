import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Play, Clock, CheckCircle, XCircle, SkipForward, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';

interface CronSettings {
  id: string;
  job_name: string;
  interval_minutes: number;
  is_enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CronJobLog {
  id: string;
  job_name: string;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  processed_count: number | null;
  error_message: string | null;
  details: unknown;
}

const INTERVAL_OPTIONS = [
  { value: 5, label: '5 minut' },
  { value: 10, label: '10 minut' },
  { value: 15, label: '15 minut' },
  { value: 30, label: '30 minut' },
  { value: 60, label: '1 godzina' },
  { value: 180, label: '3 godziny' },
  { value: 300, label: '5 godzin' },
  { value: 540, label: '9 godzin' },
];

const formatInterval = (minutes: number): string => {
  const option = INTERVAL_OPTIONS.find(o => o.value === minutes);
  if (option) return option.label;
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} godz.`;
};

export const CronJobsManagement: React.FC = () => {
  const { language } = useLanguage();
  const dateLocale = language === 'pl' ? pl : enUS;
  
  const [settings, setSettings] = useState<CronSettings | null>(null);
  const [logs, setLogs] = useState<CronJobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch cron settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('cron_settings')
        .select('*')
        .eq('job_name', 'process-pending-notifications')
        .maybeSingle();

      if (settingsError) throw settingsError;
      setSettings(settingsData);

      // Fetch recent logs
      const { data: logsData, error: logsError } = await supabase
        .from('cron_job_logs')
        .select('*')
        .eq('job_name', 'process-pending-notifications')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) throw logsError;
      setLogs(logsData || []);
    } catch (error) {
      console.error('Error fetching cron data:', error);
      toast.error('Błąd podczas pobierania danych');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIntervalChange = async (newInterval: string) => {
    if (!settings) return;
    
    const intervalMinutes = parseInt(newInterval, 10);
    setSaving(true);
    
    try {
      const nextRunAt = settings.last_run_at 
        ? new Date(new Date(settings.last_run_at).getTime() + intervalMinutes * 60 * 1000).toISOString()
        : new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('cron_settings')
        .update({ 
          interval_minutes: intervalMinutes,
          next_run_at: nextRunAt,
          updated_at: new Date().toISOString()
        })
        .eq('job_name', 'process-pending-notifications');

      if (error) throw error;

      // Odśwież dane z bazy po zapisie
      await fetchData();
      
      toast.success(`Interwał zmieniony na ${formatInterval(intervalMinutes)}`);
    } catch (error) {
      console.error('Error updating interval:', error);
      toast.error('Błąd podczas zapisywania');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('cron_settings')
        .update({ 
          is_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('job_name', 'process-pending-notifications');

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, is_enabled: enabled } : null);
      toast.success(enabled ? 'Zadanie włączone' : 'Zadanie wyłączone');
    } catch (error) {
      console.error('Error toggling enabled:', error);
      toast.error('Błąd podczas zapisywania');
    } finally {
      setSaving(false);
    }
  };

  const triggerManually = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-pending-notifications');
      
      if (error) throw error;

      if (data?.skipped) {
        toast.info(`Zadanie pominięte: ${data.reason}`);
      } else {
        toast.success(`Zadanie wykonane. Przetworzono: ${data?.processed || 0}`);
      }
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error triggering job:', error);
      toast.error('Błąd podczas uruchamiania zadania');
    } finally {
      setTriggering(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />OK</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Błąd</Badge>;
      case 'running':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />W trakcie</Badge>;
      case 'skipped':
        return <Badge variant="outline"><SkipForward className="w-3 h-3 mr-1" />Pominięto</Badge>;
      default:
        return <Badge variant="outline">{status || 'Nieznany'}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd.MM.yyyy HH:mm:ss', { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  const getDetailsText = (log: CronJobLog): string => {
    if (!log.details || typeof log.details !== 'object') return '-';
    const details = log.details as Record<string, { success?: number; failed?: number; processed?: number; reason?: string }>;
    
    const parts: string[] = [];
    if (details.welcomeEmails?.success) parts.push(`welcome: ${details.welcomeEmails.success}`);
    if (details.trainingNotifications?.success) parts.push(`training: ${details.trainingNotifications.success}`);
    if (details.retries?.success) parts.push(`retry: ${details.retries.success}`);
    
    if (log.error_message) {
      return log.error_message.substring(0, 50) + (log.error_message.length > 50 ? '...' : '');
    }
    
    if (details.reason) {
      return String(details.reason);
    }
    
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Zarządzanie zadaniami Cron
          </CardTitle>
          <CardDescription>
            Konfiguracja automatycznego przetwarzania powiadomień i emaili
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Settings Card */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Process Pending Notifications</CardTitle>
                    <CardDescription className="text-sm">
                      Wysyła emaile powitalne, powiadomienia o szkoleniach i ponawia nieudane wysyłki
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {settings?.is_enabled ? 'Włączony' : 'Wyłączony'}
                  </span>
                  <Switch
                    checked={settings?.is_enabled ?? false}
                    onCheckedChange={handleToggleEnabled}
                    disabled={saving}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Interval Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Interwał</label>
                  <Select
                    value={String(settings?.interval_minutes || 180)}
                    onValueChange={handleIntervalChange}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz interwał" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVAL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Last Run */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ostatnie uruchomienie</label>
                  <div className="p-2 rounded-md bg-muted text-sm">
                    {formatDate(settings?.last_run_at || null)}
                  </div>
                </div>

                {/* Next Run */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Następne uruchomienie</label>
                  <div className="p-2 rounded-md bg-muted text-sm">
                    {settings?.is_enabled 
                      ? formatDate(settings?.next_run_at || null)
                      : <span className="text-muted-foreground">Wyłączony</span>
                    }
                  </div>
                </div>
              </div>

              {/* Manual Trigger */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={triggerManually}
                  disabled={triggering}
                  variant="outline"
                >
                  {triggering ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Uruchom teraz
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Historia uruchomień</CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Brak historii uruchomień
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Przetworzone</TableHead>
                        <TableHead>Szczegóły</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(log.started_at || log.completed_at)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(log.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            {log.processed_count ?? 0}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {getDetailsText(log)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default CronJobsManagement;
