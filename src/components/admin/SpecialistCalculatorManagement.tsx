import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useSpecialistCalculatorSettings,
  useUpdateSpecialistCalculatorSettings,
  useUpdateSpecialistVolumeThreshold,
  useCreateSpecialistVolumeThreshold,
  useDeleteSpecialistVolumeThreshold,
  type SpecialistVolumeThreshold
} from '@/hooks/useSpecialistCalculatorSettings';
import {
  Calculator,
  Settings,
  DollarSign,
  BarChart3,
  Sliders,
  Plus,
  Trash2,
  Save
} from 'lucide-react';

export function SpecialistCalculatorManagement() {
  const { toast } = useToast();
  const { data, isLoading, error } = useSpecialistCalculatorSettings();
  const updateSettings = useUpdateSpecialistCalculatorSettings();
  const updateThreshold = useUpdateSpecialistVolumeThreshold();
  const createThreshold = useCreateSpecialistVolumeThreshold();
  const deleteThreshold = useDeleteSpecialistVolumeThreshold();

  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data?.settings) {
      setLocalSettings(data.settings);
    }
  }, [data?.settings]);

  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      await updateSettings.mutateAsync(localSettings);
      toast({
        title: 'Zapisano',
        description: 'Ustawienia kalkulatora specjalistów zostały zapisane.'
      });
    } catch (err) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać ustawień.',
        variant: 'destructive'
      });
    }
  };

  const handleThresholdUpdate = async (id: string, updates: Partial<SpecialistVolumeThreshold>) => {
    try {
      await updateThreshold.mutateAsync({ id, ...updates });
      toast({ title: 'Zapisano' });
    } catch (err) {
      toast({ title: 'Błąd', variant: 'destructive' });
    }
  };

  const handleThresholdCreate = async () => {
    const maxPosition = data?.thresholds?.reduce((max, t) => Math.max(max, t.position || 0), 0) || 0;
    try {
      await createThreshold.mutateAsync({
        threshold_clients: 0,
        bonus_amount: 0,
        position: maxPosition + 1
      });
      toast({ title: 'Utworzono nowy próg' });
    } catch (err) {
      toast({ title: 'Błąd', variant: 'destructive' });
    }
  };

  const handleThresholdDelete = async (id: string) => {
    try {
      await deleteThreshold.mutateAsync(id);
      toast({ title: 'Usunięto próg' });
    } catch (err) {
      toast({ title: 'Błąd', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <p className="text-destructive">
          Błąd ładowania ustawień kalkulatora specjalistów.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">
            Kalkulator Specjalistów
          </h2>
          <p className="text-muted-foreground">
            Konfiguruj ustawienia kalkulatora zarobków specjalistów
          </p>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Podstawowe</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Finansowe</span>
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Progi</span>
          </TabsTrigger>
          <TabsTrigger value="sliders" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">Suwaki</span>
          </TabsTrigger>
        </TabsList>

        {/* Basic Settings Tab */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia podstawowe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Kalkulator włączony</Label>
                  <p className="text-sm text-muted-foreground">
                    Włącz lub wyłącz kalkulator specjalistów globalnie
                  </p>
                </div>
                <Switch
                  checked={localSettings.is_enabled ?? false}
                  onCheckedChange={(v) => handleSettingChange('is_enabled', v)}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="text-lg">Dostęp według roli</Label>
                
                <div className="flex items-center justify-between">
                  <Label>Administratorzy</Label>
                  <Switch
                    checked={localSettings.enabled_for_admins ?? false}
                    onCheckedChange={(v) => handleSettingChange('enabled_for_admins', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Partnerzy</Label>
                  <Switch
                    checked={localSettings.enabled_for_partners ?? false}
                    onCheckedChange={(v) => handleSettingChange('enabled_for_partners', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Klienci</Label>
                  <Switch
                    checked={localSettings.enabled_for_clients ?? false}
                    onCheckedChange={(v) => handleSettingChange('enabled_for_clients', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Specjaliści</Label>
                  <Switch
                    checked={localSettings.enabled_for_specjalista ?? false}
                    onCheckedChange={(v) => handleSettingChange('enabled_for_specjalista', v)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={saveSettings} disabled={updateSettings.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Zapisz
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Settings Tab */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Parametry finansowe (EUR)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prowizja bazowa za klienta (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={localSettings.base_commission_eur || 0}
                    onChange={(e) => handleSettingChange('base_commission_eur', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Jednorazowa prowizja za pozyskanie klienta</p>
                </div>

                <div className="space-y-2">
                  <Label>Dochód pasywny miesięczny (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={localSettings.passive_per_month_eur || 0}
                    onChange={(e) => handleSettingChange('passive_per_month_eur', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Miesięczny dochód pasywny za klienta</p>
                </div>

                <div className="space-y-2">
                  <Label>Liczba miesięcy dochodu pasywnego</Label>
                  <Input
                    type="number"
                    value={localSettings.passive_months || 5}
                    onChange={(e) => handleSettingChange('passive_months', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Przez ile miesięcy naliczany jest dochód pasywny</p>
                </div>

                <div className="space-y-2">
                  <Label>Bonus retention za klienta (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={localSettings.retention_bonus_eur || 0}
                    onChange={(e) => handleSettingChange('retention_bonus_eur', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Bonus za przedłużenie/utrzymanie klienta</p>
                </div>

                <div className="space-y-2">
                  <Label>Liczba przedłużeń</Label>
                  <Input
                    type="number"
                    value={localSettings.retention_months_count || 2}
                    onChange={(e) => handleSettingChange('retention_months_count', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Ile razy można otrzymać bonus retention</p>
                </div>

                <div className="space-y-2">
                  <Label>Kurs EUR/PLN</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={localSettings.eur_to_pln_rate || 4.3}
                    onChange={(e) => handleSettingChange('eur_to_pln_rate', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Kurs do przeliczania na PLN</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={saveSettings} disabled={updateSettings.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Zapisz
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thresholds Tab */}
        <TabsContent value="thresholds">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Progi bonusowe (wolumen)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Bonusy jednorazowe za osiągnięcie określonej liczby klientów
                </p>
              </div>
              <Button onClick={handleThresholdCreate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Dodaj próg
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min. klientów</TableHead>
                    <TableHead>Bonus (€)</TableHead>
                    <TableHead>Pozycja</TableHead>
                    <TableHead>Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.thresholds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Brak progów bonusowych. Kliknij "Dodaj próg" aby utworzyć pierwszy.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.thresholds.map((threshold) => (
                      <TableRow key={threshold.id}>
                        <TableCell>
                          <Input
                            type="number"
                            value={threshold.threshold_clients}
                            onChange={(e) => handleThresholdUpdate(threshold.id, { threshold_clients: parseInt(e.target.value) })}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={threshold.bonus_amount}
                            onChange={(e) => handleThresholdUpdate(threshold.id, { bonus_amount: parseFloat(e.target.value) })}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={threshold.position || 0}
                            onChange={(e) => handleThresholdUpdate(threshold.id, { position: parseInt(e.target.value) })}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleThresholdDelete(threshold.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sliders Tab */}
        <TabsContent value="sliders">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia suwaka klientów</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Minimum klientów</Label>
                  <Input
                    type="number"
                    value={localSettings.min_clients || 1}
                    onChange={(e) => handleSettingChange('min_clients', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maksimum klientów</Label>
                  <Input
                    type="number"
                    value={localSettings.max_clients || 15000}
                    onChange={(e) => handleSettingChange('max_clients', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Domyślna wartość</Label>
                  <Input
                    type="number"
                    value={localSettings.default_clients || 50}
                    onChange={(e) => handleSettingChange('default_clients', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={saveSettings} disabled={updateSettings.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Zapisz
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
