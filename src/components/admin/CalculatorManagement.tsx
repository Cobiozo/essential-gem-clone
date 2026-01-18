import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCalculatorSettings,
  useUpdateCalculatorSettings,
  useUpdateVolumeThreshold,
  useCreateVolumeThreshold,
  useDeleteVolumeThreshold,
  useCalculatorUserAccess,
  type VolumeThreshold
} from '@/hooks/useCalculatorSettings';
import {
  Calculator,
  Settings,
  DollarSign,
  BarChart3,
  Sliders,
  Users,
  Plus,
  Trash2,
  Save,
  Search,
  UserPlus,
  UserMinus,
  Check,
  X
} from 'lucide-react';

export function CalculatorManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data, isLoading, error } = useCalculatorSettings();
  const updateSettings = useUpdateCalculatorSettings();
  const updateThreshold = useUpdateVolumeThreshold();
  const createThreshold = useCreateVolumeThreshold();
  const deleteThreshold = useDeleteVolumeThreshold();
  const { searchUsers, getUserAccess, grantAccess, revokeAccess } = useCalculatorUserAccess();

  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // User access query
  const { data: userAccessList, refetch: refetchUserAccess } = useQuery({
    queryKey: ['calculator-user-access'],
    queryFn: getUserAccess
  });

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
        title: t('admin.saved') || 'Zapisano',
        description: t('calculator.settingsSaved') || 'Ustawienia kalkulatora zostały zapisane.'
      });
    } catch (err) {
      toast({
        title: t('admin.error') || 'Błąd',
        description: t('calculator.settingsError') || 'Nie udało się zapisać ustawień.',
        variant: 'destructive'
      });
    }
  };

  const handleThresholdUpdate = async (id: string, updates: Partial<VolumeThreshold>) => {
    try {
      await updateThreshold.mutateAsync({ id, ...updates });
      toast({ title: t('admin.saved') || 'Zapisano' });
    } catch (err) {
      toast({ title: t('admin.error') || 'Błąd', variant: 'destructive' });
    }
  };

  const handleThresholdCreate = async () => {
    const maxPosition = data?.thresholds?.reduce((max, t) => Math.max(max, t.position), 0) || 0;
    try {
      await createThreshold.mutateAsync({
        min_volume: 0,
        max_volume: null,
        bonus_percentage: 0,
        label: 'Nowy poziom',
        color: '#6b7280',
        position: maxPosition + 1
      });
      toast({ title: t('admin.created') || 'Utworzono' });
    } catch (err) {
      toast({ title: t('admin.error') || 'Błąd', variant: 'destructive' });
    }
  };

  const handleThresholdDelete = async (id: string) => {
    try {
      await deleteThreshold.mutateAsync(id);
      toast({ title: t('admin.deleted') || 'Usunięto' });
    } catch (err) {
      toast({ title: t('admin.error') || 'Błąd', variant: 'destructive' });
    }
  };

  const handleUserSearch = async () => {
    if (searchTerm.length < 2) return;
    setIsSearching(true);
    try {
      const results = await searchUsers(searchTerm);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGrantAccess = async (userId: string) => {
    try {
      await grantAccess.mutateAsync({ userId, grantedBy: user?.id || '' });
      refetchUserAccess();
      setSearchResults([]);
      setSearchTerm('');
      toast({ title: t('calculator.accessGranted') || 'Przyznano dostęp' });
    } catch (err) {
      toast({ title: t('admin.error') || 'Błąd', variant: 'destructive' });
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    try {
      await revokeAccess.mutateAsync(userId);
      refetchUserAccess();
      toast({ title: t('calculator.accessRevoked') || 'Cofnięto dostęp' });
    } catch (err) {
      toast({ title: t('admin.error') || 'Błąd', variant: 'destructive' });
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
          {t('calculator.errorLoading') || 'Błąd ładowania ustawień kalkulatora.'}
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
            {t('calculator.management') || 'Zarządzanie kalkulatorem'}
          </h2>
          <p className="text-muted-foreground">
            {t('calculator.managementDesc') || 'Konfiguruj ustawienia kalkulatora zarobków'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t('calculator.basicSettings') || 'Podstawowe'}</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">{t('calculator.financial') || 'Finansowe'}</span>
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('calculator.thresholds') || 'Progi'}</span>
          </TabsTrigger>
          <TabsTrigger value="sliders" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">{t('calculator.sliders') || 'Suwaki'}</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('calculator.users') || 'Użytkownicy'}</span>
          </TabsTrigger>
        </TabsList>

        {/* Basic Settings Tab */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>{t('calculator.basicSettings') || 'Ustawienia podstawowe'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('calculator.enabled') || 'Kalkulator włączony'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('calculator.enabledDesc') || 'Włącz lub wyłącz kalkulator globalnie'}
                  </p>
                </div>
                <Switch
                  checked={localSettings.is_enabled}
                  onCheckedChange={(v) => handleSettingChange('is_enabled', v)}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="text-lg">{t('calculator.accessByRole') || 'Dostęp według roli'}</Label>
                
                <div className="flex items-center justify-between">
                  <Label>{t('calculator.enabledForPartners') || 'Partnerzy'}</Label>
                  <Switch
                    checked={localSettings.enabled_for_partners}
                    onCheckedChange={(v) => handleSettingChange('enabled_for_partners', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t('calculator.enabledForClients') || 'Klienci'}</Label>
                  <Switch
                    checked={localSettings.enabled_for_clients}
                    onCheckedChange={(v) => handleSettingChange('enabled_for_clients', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t('calculator.enabledForSpecjalista') || 'Specjaliści'}</Label>
                  <Switch
                    checked={localSettings.enabled_for_specjalista}
                    onCheckedChange={(v) => handleSettingChange('enabled_for_specjalista', v)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={saveSettings} disabled={updateSettings.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {t('admin.save') || 'Zapisz'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Settings Tab */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>{t('calculator.financialSettings') || 'Parametry finansowe'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('calculator.baseCommission') || 'Prowizja bazowa (PLN)'}</Label>
                  <Input
                    type="number"
                    value={localSettings.base_commission_pln || 0}
                    onChange={(e) => handleSettingChange('base_commission_pln', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('calculator.passiveIncomeRate') || 'Stawka dochodu pasywnego (PLN)'}</Label>
                  <Input
                    type="number"
                    value={localSettings.passive_income_rate || 0}
                    onChange={(e) => handleSettingChange('passive_income_rate', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('calculator.extensionBonus1') || 'Bonus za 1. przedłużenie (PLN)'}</Label>
                  <Input
                    type="number"
                    value={localSettings.extension_bonus_1 || 0}
                    onChange={(e) => handleSettingChange('extension_bonus_1', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('calculator.extensionBonus2') || 'Bonus za 2. przedłużenie (PLN)'}</Label>
                  <Input
                    type="number"
                    value={localSettings.extension_bonus_2 || 0}
                    onChange={(e) => handleSettingChange('extension_bonus_2', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('calculator.eurToPlnRate') || 'Kurs EUR/PLN'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={localSettings.eur_to_pln_rate || 4.3}
                    onChange={(e) => handleSettingChange('eur_to_pln_rate', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={saveSettings} disabled={updateSettings.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {t('admin.save') || 'Zapisz'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thresholds Tab */}
        <TabsContent value="thresholds">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('calculator.volumeThresholds') || 'Progi bonusowe'}</CardTitle>
              <Button onClick={handleThresholdCreate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {t('admin.add') || 'Dodaj'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('calculator.label') || 'Etykieta'}</TableHead>
                    <TableHead>{t('calculator.minVolume') || 'Min. klientów'}</TableHead>
                    <TableHead>{t('calculator.bonusPercent') || 'Bonus %'}</TableHead>
                    <TableHead>{t('calculator.color') || 'Kolor'}</TableHead>
                    <TableHead>{t('admin.actions') || 'Akcje'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.thresholds.map((threshold) => (
                    <TableRow key={threshold.id}>
                      <TableCell>
                        <Input
                          value={threshold.label}
                          onChange={(e) => handleThresholdUpdate(threshold.id, { label: e.target.value })}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={threshold.min_volume}
                          onChange={(e) => handleThresholdUpdate(threshold.id, { min_volume: parseInt(e.target.value) })}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={threshold.bonus_percentage}
                          onChange={(e) => handleThresholdUpdate(threshold.id, { bonus_percentage: parseFloat(e.target.value) })}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="color"
                          value={threshold.color}
                          onChange={(e) => handleThresholdUpdate(threshold.id, { color: e.target.value })}
                          className="h-10 w-16 p-1"
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sliders Tab */}
        <TabsContent value="sliders">
          <Card>
            <CardHeader>
              <CardTitle>{t('calculator.sliderSettings') || 'Ustawienia suwaków'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-lg">{t('calculator.followersSlider') || 'Suwak obserwujących'}</Label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{t('calculator.min') || 'Minimum'}</Label>
                    <Input
                      type="number"
                      value={localSettings.followers_min || 0}
                      onChange={(e) => handleSettingChange('followers_min', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('calculator.max') || 'Maksimum'}</Label>
                    <Input
                      type="number"
                      value={localSettings.followers_max || 100000}
                      onChange={(e) => handleSettingChange('followers_max', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('calculator.default') || 'Domyślnie'}</Label>
                    <Input
                      type="number"
                      value={localSettings.followers_default || 5000}
                      onChange={(e) => handleSettingChange('followers_default', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="text-lg">{t('calculator.conversionSlider') || 'Suwak konwersji'}</Label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{t('calculator.min') || 'Minimum'} (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={localSettings.conversion_min || 0.5}
                      onChange={(e) => handleSettingChange('conversion_min', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('calculator.max') || 'Maksimum'} (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={localSettings.conversion_max || 10}
                      onChange={(e) => handleSettingChange('conversion_max', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('calculator.default') || 'Domyślnie'} (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={localSettings.conversion_default || 2}
                      onChange={(e) => handleSettingChange('conversion_default', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={saveSettings} disabled={updateSettings.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {t('admin.save') || 'Zapisz'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>{t('calculator.userAccess') || 'Dostęp użytkowników'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search for users */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('calculator.searchUser') || 'Szukaj użytkownika...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleUserSearch} disabled={isSearching}>
                  {t('admin.search') || 'Szukaj'}
                </Button>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="rounded-lg border p-4">
                  <Label className="mb-2 block">{t('calculator.searchResults') || 'Wyniki wyszukiwania'}</Label>
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between rounded bg-muted/50 p-2">
                        <div>
                          <p className="font-medium">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Button size="sm" onClick={() => handleGrantAccess(user.id)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          {t('calculator.grantAccess') || 'Przyznaj'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current access list */}
              <div>
                <Label className="mb-2 block">{t('calculator.currentAccess') || 'Aktualne uprawnienia'}</Label>
                {userAccessList && userAccessList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.user') || 'Użytkownik'}</TableHead>
                        <TableHead>{t('calculator.status') || 'Status'}</TableHead>
                        <TableHead>{t('admin.actions') || 'Akcje'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userAccessList.map((access: any) => (
                        <TableRow key={access.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {access.profiles?.first_name} {access.profiles?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {access.profiles?.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={access.has_access ? 'default' : 'secondary'}>
                              {access.has_access ? (
                                <><Check className="mr-1 h-3 w-3" /> {t('calculator.hasAccess') || 'Ma dostęp'}</>
                              ) : (
                                <><X className="mr-1 h-3 w-3" /> {t('calculator.noAccessShort') || 'Brak'}</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeAccess(access.user_id)}
                            >
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('calculator.noUserOverrides') || 'Brak indywidualnych uprawnień. Użytkownicy korzystają z uprawnień wynikających z ich roli.'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
