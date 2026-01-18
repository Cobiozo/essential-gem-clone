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
        title: 'Zapisano',
        description: 'Ustawienia kalkulatora zostały zapisane.'
      });
    } catch (err) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać ustawień.',
        variant: 'destructive'
      });
    }
  };

  const handleThresholdUpdate = async (id: string, updates: Partial<VolumeThreshold>) => {
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
      toast({ title: 'Utworzono' });
    } catch (err) {
      toast({ title: 'Błąd', variant: 'destructive' });
    }
  };

  const handleThresholdDelete = async (id: string) => {
    try {
      await deleteThreshold.mutateAsync(id);
      toast({ title: 'Usunięto' });
    } catch (err) {
      toast({ title: 'Błąd', variant: 'destructive' });
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
      toast({ title: 'Przyznano dostęp' });
    } catch (err) {
      toast({ title: 'Błąd', variant: 'destructive' });
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    try {
      await revokeAccess.mutateAsync(userId);
      refetchUserAccess();
      toast({ title: 'Cofnięto dostęp' });
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
          Błąd ładowania ustawień kalkulatora.
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
            Zarządzanie kalkulatorem
          </h2>
          <p className="text-muted-foreground">
            Konfiguruj ustawienia kalkulatora zarobków
          </p>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Użytkownicy</span>
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
                    Włącz lub wyłącz kalkulator globalnie
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
              <CardTitle>Parametry finansowe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prowizja bazowa za klienta (PLN)</Label>
                  <Input
                    type="number"
                    value={localSettings.base_commission_per_client || 0}
                    onChange={(e) => handleSettingChange('base_commission_per_client', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stawka dochodu pasywnego (%)</Label>
                  <Input
                    type="number"
                    value={localSettings.passive_rate_percentage || 0}
                    onChange={(e) => handleSettingChange('passive_rate_percentage', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Liczba miesięcy dochodu pasywnego</Label>
                  <Input
                    type="number"
                    value={localSettings.passive_months || 12}
                    onChange={(e) => handleSettingChange('passive_months', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bonus za przedłużenie (PLN/klient)</Label>
                  <Input
                    type="number"
                    value={localSettings.extension_bonus_per_client || 0}
                    onChange={(e) => handleSettingChange('extension_bonus_per_client', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Liczba przedłużeń</Label>
                  <Input
                    type="number"
                    value={localSettings.extension_months_count || 2}
                    onChange={(e) => handleSettingChange('extension_months_count', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kurs EUR/PLN</Label>
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
              <CardTitle>Progi bonusowe</CardTitle>
              <Button onClick={handleThresholdCreate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Dodaj
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min. klientów</TableHead>
                    <TableHead>Bonus (PLN)</TableHead>
                    <TableHead>Pozycja</TableHead>
                    <TableHead>Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.thresholds.map((threshold) => (
                    <TableRow key={threshold.id}>
                      <TableCell>
                        <Input
                          type="number"
                          value={threshold.threshold_clients}
                          onChange={(e) => handleThresholdUpdate(threshold.id, { threshold_clients: parseInt(e.target.value) })}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={threshold.bonus_amount}
                          onChange={(e) => handleThresholdUpdate(threshold.id, { bonus_amount: parseFloat(e.target.value) })}
                          className="w-24"
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
              <CardTitle>Ustawienia suwaków</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-lg">Suwak obserwujących</Label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Minimum</Label>
                    <Input
                      type="number"
                      value={localSettings.min_followers || 0}
                      onChange={(e) => handleSettingChange('min_followers', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maksimum</Label>
                    <Input
                      type="number"
                      value={localSettings.max_followers || 100000}
                      onChange={(e) => handleSettingChange('max_followers', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Domyślnie</Label>
                    <Input
                      type="number"
                      value={localSettings.default_followers || 5000}
                      onChange={(e) => handleSettingChange('default_followers', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="text-lg">Suwak konwersji</Label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Minimum (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={localSettings.min_conversion || 0.5}
                      onChange={(e) => handleSettingChange('min_conversion', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maksimum (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={localSettings.max_conversion || 10}
                      onChange={(e) => handleSettingChange('max_conversion', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Domyślnie (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={localSettings.default_conversion || 2}
                      onChange={(e) => handleSettingChange('default_conversion', parseFloat(e.target.value))}
                    />
                  </div>
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

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Dostęp użytkowników</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search for users */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj użytkownika..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleUserSearch} disabled={isSearching}>
                  Szukaj
                </Button>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="rounded-lg border p-4">
                  <Label className="mb-2 block">Wyniki wyszukiwania</Label>
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between rounded bg-muted/50 p-2">
                        <div>
                          <p className="font-medium">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Button size="sm" onClick={() => handleGrantAccess(user.id)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Przyznaj
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current access list */}
              <div>
                <Label className="mb-2 block">Aktualne uprawnienia</Label>
                {userAccessList && userAccessList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Użytkownik</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Akcje</TableHead>
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
                                <><Check className="mr-1 h-3 w-3" /> Ma dostęp</>
                              ) : (
                                <><X className="mr-1 h-3 w-3" /> Brak</>
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
                    Brak indywidualnych uprawnień. Użytkownicy korzystają z uprawnień wynikających z ich roli.
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
