import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Settings, Users, Save, Loader2, Eye, EyeOff, Mail, Phone, MapPin, MessageSquare, Info, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PrivateChatDialog } from '@/components/private-chat/PrivateChatDialog';
import { PrivateChatWidget } from '@/components/private-chat/PrivateChatWidget';
import { MultiSelectChatDialog } from '@/components/private-chat/MultiSelectChatDialog';

interface SearchSettings {
  id: string;
  is_enabled: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_anonymous: boolean;
  max_results: number;
  // Data visibility by role
  show_email_to_clients: boolean;
  show_email_to_partners: boolean;
  show_email_to_specjalista: boolean;
  show_phone_to_clients: boolean;
  show_phone_to_partners: boolean;
  show_phone_to_specjalista: boolean;
  show_address_to_clients: boolean;
  show_address_to_partners: boolean;
  show_address_to_specjalista: boolean;
  // Messaging
  allow_messaging: boolean;
  messaging_enabled_for_clients: boolean;
  messaging_enabled_for_partners: boolean;
  messaging_enabled_for_specjalista: boolean;
  // Integration
  integrate_with_team_contacts: boolean;
}

interface SpecialistProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  specialization: string | null;
  profile_description: string | null;
  search_keywords: string[] | null;
  is_searchable: boolean | null;
  is_active: boolean;
  city: string | null;
  country: string | null;
  phone_number: string | null;
  street_address: string | null;
  postal_code: string | null;
}

export const SpecialistSearchManagement: React.FC = () => {
  const [settings, setSettings] = useState<SearchSettings | null>(null);
  const [specialists, setSpecialists] = useState<SpecialistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistProfile | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatSpecialist, setChatSpecialist] = useState<SpecialistProfile | null>(null);
  const [selectedSpecialistIds, setSelectedSpecialistIds] = useState<string[]>([]);
  const [groupChatDialogOpen, setGroupChatDialogOpen] = useState(false);

  const handleOpenChat = (specialist: SpecialistProfile) => {
    setChatSpecialist(specialist);
    setChatDialogOpen(true);
  };

  const toggleSpecialistSelection = (userId: string) => {
    setSelectedSpecialistIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllSpecialists = () => {
    setSelectedSpecialistIds(specialists.map(s => s.user_id));
  };

  const deselectAllSpecialists = () => {
    setSelectedSpecialistIds([]);
  };

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
      
      if (settingsData) {
        setSettings(settingsData as unknown as SearchSettings);
      }

      // Fetch specialists from profiles joined with user_roles
      const { data: specialistsData, error: specialistsError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          email,
          specialization,
          profile_description,
          search_keywords,
          is_searchable,
          is_active,
          city,
          country,
          phone_number,
          street_address,
          postal_code
        `)
        .order('last_name');

      if (specialistsError) throw specialistsError;

      // Filter only specialists by checking user_roles
      if (specialistsData) {
        const userIds = specialistsData.map(p => p.user_id);
        
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds)
          .eq('role', 'specjalista');

        if (rolesError) throw rolesError;

        const specialistUserIds = new Set(rolesData?.map(r => r.user_id) || []);
        const filteredSpecialists = specialistsData.filter(p => specialistUserIds.has(p.user_id));
        
        setSpecialists(filteredSpecialists);
      }
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
          show_email_to_clients: settings.show_email_to_clients,
          show_email_to_partners: settings.show_email_to_partners,
          show_email_to_specjalista: settings.show_email_to_specjalista,
          show_phone_to_clients: settings.show_phone_to_clients,
          show_phone_to_partners: settings.show_phone_to_partners,
          show_phone_to_specjalista: settings.show_phone_to_specjalista,
          show_address_to_clients: settings.show_address_to_clients,
          show_address_to_partners: settings.show_address_to_partners,
          show_address_to_specjalista: settings.show_address_to_specjalista,
          allow_messaging: settings.allow_messaging,
          messaging_enabled_for_clients: settings.messaging_enabled_for_clients,
          messaging_enabled_for_partners: settings.messaging_enabled_for_partners,
          messaging_enabled_for_specjalista: settings.messaging_enabled_for_specjalista,
          integrate_with_team_contacts: settings.integrate_with_team_contacts,
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
      toast.success(isSearchable ? 'Specjalista widoczny w wyszukiwarce' : 'Specjalista ukryty w wyszukiwarce');
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
          <TabsTrigger value="chats" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Czaty prywatne
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

                  <Accordion type="multiple" className="w-full">
                    {/* Role access to search */}
                    <AccordionItem value="visibility">
                      <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Dostęp do wyszukiwarki
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
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
                      </AccordionContent>
                    </AccordionItem>

                    {/* Email visibility by role */}
                    <AccordionItem value="email-visibility">
                      <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Widoczność adresu e-mail
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground mb-2">
                          Które role mogą widzieć adres e-mail specjalisty
                        </p>
                        <div className="flex items-center justify-between">
                          <Label>Klienci</Label>
                          <Switch
                            checked={settings.show_email_to_clients}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, show_email_to_clients: checked } : prev)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Partnerzy</Label>
                          <Switch
                            checked={settings.show_email_to_partners}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, show_email_to_partners: checked } : prev)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Specjaliści</Label>
                          <Switch
                            checked={settings.show_email_to_specjalista}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, show_email_to_specjalista: checked } : prev)
                            }
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Phone visibility by role */}
                    <AccordionItem value="phone-visibility">
                      <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Widoczność numeru telefonu
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground mb-2">
                          Które role mogą widzieć numer telefonu specjalisty
                        </p>
                        <div className="flex items-center justify-between">
                          <Label>Klienci</Label>
                          <Switch
                            checked={settings.show_phone_to_clients}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, show_phone_to_clients: checked } : prev)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Partnerzy</Label>
                          <Switch
                            checked={settings.show_phone_to_partners}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, show_phone_to_partners: checked } : prev)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Specjaliści</Label>
                          <Switch
                            checked={settings.show_phone_to_specjalista}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, show_phone_to_specjalista: checked } : prev)
                            }
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Address visibility by role */}
                    <AccordionItem value="address-visibility">
                      <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Widoczność adresu
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <p className="text-sm text-muted-foreground mb-2">
                          Które role mogą widzieć pełny adres specjalisty
                        </p>
                        <div className="flex items-center justify-between">
                          <Label>Klienci</Label>
                          <Switch
                            checked={settings.show_address_to_clients}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, show_address_to_clients: checked } : prev)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Partnerzy</Label>
                          <Switch
                            checked={settings.show_address_to_partners}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, show_address_to_partners: checked } : prev)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Specjaliści</Label>
                          <Switch
                            checked={settings.show_address_to_specjalista}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, show_address_to_specjalista: checked } : prev)
                            }
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Messaging options */}
                    <AccordionItem value="messaging">
                      <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Wiadomości do specjalistów
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Włącz opcję wysyłania wiadomości</Label>
                            <p className="text-sm text-muted-foreground">
                              Pozwól użytkownikom kontaktować się ze specjalistami
                            </p>
                          </div>
                          <Switch
                            checked={settings.allow_messaging}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, allow_messaging: checked } : prev)
                            }
                          />
                        </div>
                        
                        {settings.allow_messaging && (
                          <div className="border-t pt-3 space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Które role mogą wysyłać wiadomości
                            </p>
                            <div className="flex items-center justify-between">
                              <Label>Klienci</Label>
                              <Switch
                                checked={settings.messaging_enabled_for_clients}
                                onCheckedChange={(checked) => 
                                  setSettings(prev => prev ? { ...prev, messaging_enabled_for_clients: checked } : prev)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Partnerzy</Label>
                              <Switch
                                checked={settings.messaging_enabled_for_partners}
                                onCheckedChange={(checked) => 
                                  setSettings(prev => prev ? { ...prev, messaging_enabled_for_partners: checked } : prev)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Specjaliści</Label>
                              <Switch
                                checked={settings.messaging_enabled_for_specjalista}
                                onCheckedChange={(checked) => 
                                  setSettings(prev => prev ? { ...prev, messaging_enabled_for_specjalista: checked } : prev)
                                }
                              />
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* Integration with team contacts */}
                    <AccordionItem value="integration">
                      <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Integracja z modułami
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Integracja z "Moja lista kontaktów"</Label>
                            <p className="text-sm text-muted-foreground">
                              Pozwól dodawać specjalistów do listy kontaktów
                            </p>
                          </div>
                          <Switch
                            checked={settings.integrate_with_team_contacts}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, integrate_with_team_contacts: checked } : prev)
                            }
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

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
                Pełna kontrola nad widocznością i danymi specjalistów w platformie
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Group chat action bar */}
              {selectedSpecialistIds.length > 0 && (
                <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedSpecialistIds.length} wybranych</Badge>
                    <Button variant="ghost" size="sm" onClick={deselectAllSpecialists}>
                      Odznacz wszystkich
                    </Button>
                  </div>
                  <Button onClick={() => setGroupChatDialogOpen(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Utwórz czat grupowy
                  </Button>
                </div>
              )}
              
              {selectedSpecialistIds.length === 0 && specialists.length > 0 && (
                <div className="mb-4">
                  <Button variant="outline" size="sm" onClick={selectAllSpecialists}>
                    Zaznacz wszystkich ({specialists.length})
                  </Button>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedSpecialistIds.length === specialists.length && specialists.length > 0}
                        onCheckedChange={(checked) => checked ? selectAllSpecialists() : deselectAllSpecialists()}
                      />
                    </TableHead>
                    <TableHead>Specjalista</TableHead>
                    <TableHead>Specjalizacja</TableHead>
                    <TableHead>Lokalizacja</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Widoczność</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialists.map((specialist) => (
                    <TableRow key={specialist.user_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSpecialistIds.includes(specialist.user_id)}
                          onCheckedChange={() => toggleSpecialistSelection(specialist.user_id)}
                        />
                      </TableCell>
                    <TableRow key={specialist.user_id}>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button 
                              className="text-left hover:underline"
                              onClick={() => setSelectedSpecialist(specialist)}
                            >
                              <div className="font-medium">
                                {specialist.first_name} {specialist.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {specialist.email}
                              </div>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5" />
                                Szczegóły specjalisty
                              </DialogTitle>
                              <DialogDescription>
                                Pełne dane specjalisty widoczne dla administratora
                              </DialogDescription>
                            </DialogHeader>
                            {selectedSpecialist && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">Imię i nazwisko</Label>
                                    <p className="font-medium">{selectedSpecialist.first_name} {selectedSpecialist.last_name}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">E-mail</Label>
                                    <p className="font-medium">{selectedSpecialist.email}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Telefon</Label>
                                    <p className="font-medium">{selectedSpecialist.phone_number || '-'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Status konta</Label>
                                    <Badge variant={selectedSpecialist.is_active ? "default" : "destructive"}>
                                      {selectedSpecialist.is_active ? 'Aktywne' : 'Nieaktywne'}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="border-t pt-4">
                                  <Label className="text-muted-foreground">Specjalizacja</Label>
                                  <p className="font-medium">{selectedSpecialist.specialization || '-'}</p>
                                </div>
                                
                                <div>
                                  <Label className="text-muted-foreground">Opis profilu</Label>
                                  <p className="font-medium">{selectedSpecialist.profile_description || '-'}</p>
                                </div>
                                
                                <div>
                                  <Label className="text-muted-foreground">Słowa kluczowe</Label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {selectedSpecialist.search_keywords?.map((keyword, idx) => (
                                      <Badge key={idx} variant="secondary">{keyword}</Badge>
                                    )) || <span className="text-muted-foreground">-</span>}
                                  </div>
                                </div>
                                
                                <div className="border-t pt-4">
                                  <Label className="text-muted-foreground">Adres</Label>
                                  <p className="font-medium">
                                    {[
                                      selectedSpecialist.street_address,
                                      selectedSpecialist.postal_code,
                                      selectedSpecialist.city,
                                      selectedSpecialist.country
                                    ].filter(Boolean).join(', ') || '-'}
                                  </p>
                                </div>
                                
                                <div className="border-t pt-4 flex items-center justify-between">
                                  <div>
                                    <Label className="text-muted-foreground">Widoczność w wyszukiwarce</Label>
                                    <p className="text-sm text-muted-foreground">
                                      Kontroluj czy specjalista jest widoczny w wynikach wyszukiwania
                                    </p>
                                  </div>
                                  <Switch
                                    checked={selectedSpecialist.is_searchable ?? false}
                                    onCheckedChange={(checked) => {
                                      toggleSpecialistSearchable(selectedSpecialist.user_id, checked);
                                      setSelectedSpecialist(prev => prev ? { ...prev, is_searchable: checked } : prev);
                                    }}
                                  />
                                </div>

                                <div className="border-t pt-4">
                                  <Button 
                                    onClick={() => handleOpenChat(selectedSpecialist)}
                                    className="w-full"
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Otwórz czat ze specjalistą
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          {specialist.specialization ? (
                            <span className="text-sm">{specialist.specialization}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {specialist.city ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{specialist.city}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {specialist.email && (
                            <span title={specialist.email}>
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            </span>
                          )}
                          {specialist.phone_number && (
                            <span title={specialist.phone_number}>
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            </span>
                          )}
                        </div>
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
                      <TableCell>
                        <Switch
                          checked={specialist.is_searchable ?? false}
                          onCheckedChange={(checked) => 
                            toggleSpecialistSearchable(specialist.user_id, checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenChat(specialist)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Czat
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {specialists.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Brak specjalistów w systemie
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Czaty prywatne - pełny widok z listą wątków */}
        <TabsContent value="chats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Czaty prywatne ze specjalistami
              </CardTitle>
              <CardDescription>
                Zarządzaj konwersacjami ze specjalistami. Możesz zamykać, archiwizować lub wznawiać wątki.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrivateChatWidget />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PrivateChatDialog
        open={chatDialogOpen}
        onOpenChange={setChatDialogOpen}
        specialist={chatSpecialist ? {
          user_id: chatSpecialist.user_id,
          first_name: chatSpecialist.first_name,
          last_name: chatSpecialist.last_name,
          email: chatSpecialist.email,
          specialization: chatSpecialist.specialization,
        } : null}
        onThreadCreated={() => {
          toast.success('Czat został utworzony');
        }}
      />

      <MultiSelectChatDialog
        open={groupChatDialogOpen}
        onOpenChange={setGroupChatDialogOpen}
        specialists={specialists.map(s => ({
          user_id: s.user_id,
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email,
          specialization: s.specialization,
        }))}
        selectedIds={selectedSpecialistIds}
        onThreadCreated={() => {
          toast.success('Czat grupowy został utworzony');
          setSelectedSpecialistIds([]);
        }}
      />
    </div>
  );
};
