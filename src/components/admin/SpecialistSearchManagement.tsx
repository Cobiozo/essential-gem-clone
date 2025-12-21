import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Settings, Users, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SearchSettings {
  id: string;
  is_enabled: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_anonymous: boolean;
  max_results: number;
}

interface SpecialistProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  specialization: string | null;
  is_searchable: boolean;
  city: string | null;
}

export const SpecialistSearchManagement: React.FC = () => {
  const [settings, setSettings] = useState<SearchSettings | null>(null);
  const [specialists, setSpecialists] = useState<SpecialistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('specialist_search_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      setSettings(settingsData);

      // Fetch specialists
      const { data: specialistsData, error: specialistsError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, specialization, is_searchable, city')
        .eq('role', 'specialist')
        .order('last_name');

      if (specialistsError) throw specialistsError;
      setSpecialists(specialistsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Błąd podczas ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('specialist_search_settings')
        .update({
          is_enabled: settings.is_enabled,
          visible_to_clients: settings.visible_to_clients,
          visible_to_partners: settings.visible_to_partners,
          visible_to_specjalista: settings.visible_to_specjalista,
          visible_to_anonymous: settings.visible_to_anonymous,
          max_results: settings.max_results,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Ustawienia zapisane');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Błąd podczas zapisywania ustawień');
    } finally {
      setSaving(false);
    }
  };

  const toggleSpecialistSearchable = async (userId: string, isSearchable: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_searchable: isSearchable })
        .eq('user_id', userId);

      if (error) throw error;

      setSpecialists(prev => 
        prev.map(s => s.user_id === userId ? { ...s, is_searchable: isSearchable } : s)
      );
      toast.success(isSearchable ? 'Specjalista dodany do wyszukiwarki' : 'Specjalista wykluczony z wyszukiwarki');
    } catch (err) {
      console.error('Error updating specialist:', err);
      toast.error('Błąd podczas aktualizacji');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Ustawienia
          </TabsTrigger>
          <TabsTrigger value="specialists" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Specjaliści ({specialists.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Wyszukiwarka specjalistów
              </CardTitle>
              <CardDescription>
                Konfiguracja semantycznej wyszukiwarki specjalistów wspieranej przez AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Wyszukiwarka aktywna</Label>
                      <p className="text-sm text-muted-foreground">
                        Włącz lub wyłącz wyszukiwarkę dla wszystkich użytkowników
                      </p>
                    </div>
                    <Switch
                      checked={settings.is_enabled}
                      onCheckedChange={(checked) => 
                        setSettings(prev => prev ? { ...prev, is_enabled: checked } : prev)
                      }
                    />
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium">Widoczność według roli</h4>
                    
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label>Klienci</Label>
                        <Switch
                          checked={settings.visible_to_clients}
                          onCheckedChange={(checked) => 
                            setSettings(prev => prev ? { ...prev, visible_to_clients: checked } : prev)
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Partnerzy</Label>
                        <Switch
                          checked={settings.visible_to_partners}
                          onCheckedChange={(checked) => 
                            setSettings(prev => prev ? { ...prev, visible_to_partners: checked } : prev)
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Specjaliści</Label>
                        <Switch
                          checked={settings.visible_to_specjalista}
                          onCheckedChange={(checked) => 
                            setSettings(prev => prev ? { ...prev, visible_to_specjalista: checked } : prev)
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Niezalogowani</Label>
                        <Switch
                          checked={settings.visible_to_anonymous}
                          onCheckedChange={(checked) => 
                            setSettings(prev => prev ? { ...prev, visible_to_anonymous: checked } : prev)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <Label htmlFor="max-results">Maksymalna liczba wyników</Label>
                    <Input
                      id="max-results"
                      type="number"
                      min={5}
                      max={50}
                      value={settings.max_results}
                      onChange={(e) => 
                        setSettings(prev => prev ? { ...prev, max_results: parseInt(e.target.value) || 20 } : prev)
                      }
                      className="w-32"
                    />
                  </div>

                  <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Zapisz ustawienia
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specialists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zarządzanie specjalistami</CardTitle>
              <CardDescription>
                Kontroluj, którzy specjaliści są widoczni w wyszukiwarce
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Specjalista</TableHead>
                    <TableHead>Specjalizacja</TableHead>
                    <TableHead>Lokalizacja</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Widoczność</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialists.map((specialist) => (
                    <TableRow key={specialist.user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {specialist.first_name} {specialist.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {specialist.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {specialist.specialization || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {specialist.city || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={specialist.is_searchable ? "default" : "secondary"}>
                          {specialist.is_searchable ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Widoczny
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Ukryty
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={specialist.is_searchable}
                          onCheckedChange={(checked) => 
                            toggleSpecialistSearchable(specialist.user_id, checked)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {specialists.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Brak specjalistów w systemie
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
