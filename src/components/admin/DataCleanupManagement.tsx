import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import {
  Trash2,
  RefreshCw,
  Database,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react';

interface CleanupSetting {
  id: string;
  category_key: string;
  label: string;
  description: string | null;
  table_name: string;
  extra_condition: string | null;
  retention_days: number;
  is_auto_enabled: boolean;
}

interface CategoryStats {
  count: number;
  loading: boolean;
  error?: boolean;
}

const RETENTION_OPTIONS = [
  { value: '7', label: '7 dni' },
  { value: '14', label: '14 dni' },
  { value: '30', label: '30 dni' },
  { value: '60', label: '60 dni' },
  { value: '90', label: '90 dni' },
  { value: '180', label: '180 dni' },
  { value: '365', label: '1 rok' },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  email_logs: <span className="text-base">📧</span>,
  google_calendar_sync_logs: <span className="text-base">📅</span>,
  cron_job_logs: <span className="text-base">⏰</span>,
  past_events: <span className="text-base">🎫</span>,
  read_notifications: <span className="text-base">🔔</span>,
  banner_interactions: <span className="text-base">📊</span>,
  push_notification_logs: <span className="text-base">📱</span>,
  medical_chat_history: <span className="text-base">🏥</span>,
  ai_compass_history: <span className="text-base">🧭</span>,
  reflink_events: <span className="text-base">🔗</span>,
};

export const DataCleanupManagement: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CleanupSetting[]>([]);
  const [stats, setStats] = useState<Record<string, CategoryStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState<string | null>(null);
  const [confirmCleanup, setConfirmCleanup] = useState<CleanupSetting | null>(null);
  const [cleanupAllConfirm, setCleanupAllConfirm] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('data_cleanup_settings')
        .select('*')
        .order('label');
      if (error) throw error;
      setSettings(data || []);
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchStats = useCallback(async (settingsList: CleanupSetting[]) => {
    const initial: Record<string, CategoryStats> = {};
    settingsList.forEach((s) => { initial[s.category_key] = { count: 0, loading: true }; });
    setStats(initial);

    await Promise.all(
      settingsList.map(async (setting) => {
        try {
          const { data, error } = await supabase.functions.invoke('cleanup-database-data', {
            body: {
              action: 'count',
              category_key: setting.category_key,
              table_name: setting.table_name,
              extra_condition: setting.extra_condition,
              retention_days: setting.retention_days,
            },
          });
          if (error) throw error;
          setStats((prev) => ({
            ...prev,
            [setting.category_key]: { count: data?.count ?? 0, loading: false },
          }));
        } catch {
          setStats((prev) => ({
            ...prev,
            [setting.category_key]: { count: 0, loading: false, error: true },
          }));
        }
      })
    );
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings.length > 0) {
      fetchStats(settings);
    }
  }, [settings, fetchStats]);

  const updateSetting = async (id: string, updates: Partial<CleanupSetting>) => {
    setSaving(id);
    try {
      const { error } = await supabase
        .from('data_cleanup_settings')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      setSettings((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
      toast({ title: 'Zapisano', description: 'Ustawienia zostały zaktualizowane.' });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const runCleanup = async (setting: CleanupSetting) => {
    setCleaningUp(setting.category_key);
    setConfirmCleanup(null);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-database-data', {
        body: {
          action: 'delete',
          category_key: setting.category_key,
          table_name: setting.table_name,
          extra_condition: setting.extra_condition,
          retention_days: setting.retention_days,
        },
      });
      if (error) throw error;
      toast({
        title: 'Czyszczenie zakończone',
        description: `Usunięto ${data?.deleted_count ?? 0} rekordów z kategorii "${setting.label}".`,
      });
      // Refresh count for this category
      setStats((prev) => ({
        ...prev,
        [setting.category_key]: { count: 0, loading: false },
      }));
    } catch (err: any) {
      toast({ title: 'Błąd czyszczenia', description: err.message, variant: 'destructive' });
    } finally {
      setCleaningUp(null);
    }
  };

  const runAllCleanup = async () => {
    setCleanupAllConfirm(false);
    const enabled = settings.filter((s) => s.is_auto_enabled);
    if (enabled.length === 0) {
      toast({ title: 'Brak aktywnych', description: 'Włącz automatyczne czyszczenie dla co najmniej jednej kategorii.' });
      return;
    }
    for (const setting of enabled) {
      await runCleanup(setting);
    }
  };

  const totalEligible = Object.values(stats).reduce((sum, s) => sum + s.count, 0);
  const autoEnabledCount = settings.filter((s) => s.is_auto_enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalEligible.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Rekordów kwalifikuje się do usunięcia</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{autoEnabledCount}</p>
                <p className="text-sm text-muted-foreground">Kategorie z automatycznym czyszczeniem</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{settings.length - autoEnabledCount}</p>
                <p className="text-sm text-muted-foreground">Kategorie bez auto-czyszczenia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
        <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">Automatyczne czyszczenie</strong> — po włączeniu przełącznika, zadanie cron będzie automatycznie usuwać rekordy starsze niż ustawiony limit.
          Użyj przycisku <strong className="text-foreground">„Wyczyść teraz"</strong> aby uruchomić jednorazowe czyszczenie bez czekania na cron.
          Usunięte dane <strong className="text-foreground">nie będą możliwe do odzyskania</strong>.
        </div>
      </div>

      {/* Cleanup categories */}
      <div className="space-y-4">
        {settings.map((setting) => {
          const stat = stats[setting.category_key];
          const isCleaningThis = cleaningUp === setting.category_key;
          const isSavingThis = saving === setting.id;

          return (
            <Card key={setting.id} className={setting.is_auto_enabled ? 'border-primary/30' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {CATEGORY_ICONS[setting.category_key] || <Database className="w-5 h-5" />}
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {setting.label}
                      {setting.is_auto_enabled && (
                          <Badge variant="secondary" className="text-xs">
                            Auto
                          </Badge>
                        )}
                      </CardTitle>
                      {setting.description && (
                        <CardDescription className="mt-0.5 text-xs">{setting.description}</CardDescription>
                      )}
                    </div>
                  </div>

                  {/* Stats badge */}
                  <div className="flex-shrink-0">
                    {stat?.loading ? (
                      <Badge variant="outline" className="text-xs">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Sprawdzam...
                      </Badge>
                    ) : stat?.error ? (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        — niedostępne
                      </Badge>
                    ) : (
                      <Badge
                        variant={stat?.count > 0 ? 'destructive' : 'outline'}
                        className="text-xs font-mono"
                      >
                        {(stat?.count ?? 0).toLocaleString()} do usunięcia
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  {/* Retention days selector */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm whitespace-nowrap">Usuń starsze niż:</Label>
                    <Select
                      value={String(setting.retention_days)}
                      onValueChange={(val) =>
                        updateSetting(setting.id, { retention_days: parseInt(val) })
                      }
                      disabled={isSavingThis}
                    >
                      <SelectTrigger className="w-32 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RETENTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator orientation="vertical" className="h-6 hidden sm:block" />

                  {/* Auto toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={setting.is_auto_enabled}
                      onCheckedChange={(checked) =>
                        updateSetting(setting.id, { is_auto_enabled: checked })
                      }
                      disabled={isSavingThis}
                    />
                    <Label className="text-sm cursor-pointer">Automatyczne czyszczenie</Label>
                    {isSavingThis && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                  </div>

                  <div className="ml-auto">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmCleanup(setting)}
                      disabled={isCleaningThis || (stat?.count ?? 0) === 0}
                    >
                      {isCleaningThis ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Wyczyść teraz
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Run all button */}
      <div className="flex justify-between items-center pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStats(settings)}
          disabled={!!cleaningUp}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Odśwież statystyki
        </Button>

        <Button
          variant="destructive"
          onClick={() => setCleanupAllConfirm(true)}
          disabled={!!cleaningUp || autoEnabledCount === 0}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Wyczyść wszystkie aktywne ({autoEnabledCount})
        </Button>
      </div>

      {/* Confirm single cleanup dialog */}
      <AlertDialog open={!!confirmCleanup} onOpenChange={() => setConfirmCleanup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdzenie czyszczenia</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć <strong>{stats[confirmCleanup?.category_key ?? '']?.count ?? 0} rekordów</strong> z kategorii{' '}
              <strong>„{confirmCleanup?.label}"</strong>?
              <br /><br />
              Zostaną usunięte rekordy starsze niż <strong>{confirmCleanup?.retention_days} dni</strong>.
              Ta operacja jest <strong>nieodwracalna</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmCleanup && runCleanup(confirmCleanup)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Tak, usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm all cleanup dialog */}
      <AlertDialog open={cleanupAllConfirm} onOpenChange={setCleanupAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyczyść wszystkie aktywne kategorie</AlertDialogTitle>
            <AlertDialogDescription>
              Uruchomisz czyszczenie dla <strong>{autoEnabledCount} kategorii</strong> z włączonym automatycznym czyszczeniem.
              Łącznie zostanie usuniętych do <strong>{totalEligible.toLocaleString()} rekordów</strong>.
              <br /><br />
              Ta operacja jest <strong>nieodwracalna</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={runAllCleanup}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Tak, wyczyść wszystkie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DataCleanupManagement;
