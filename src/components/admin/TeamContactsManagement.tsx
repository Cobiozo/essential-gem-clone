import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, Settings, Eye, Download, Filter, Search, Save, Loader2, UserX, Trash2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TeamContactAccordion } from '@/components/team-contacts/TeamContactAccordion';
import { SpecialistSearchManagement } from './SpecialistSearchManagement';
import type { TeamContact, TeamContactFilters, TeamContactHistory } from '@/components/team-contacts/types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface UserProfile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  eq_id: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'Imię',
  last_name: 'Nazwisko',
  role: 'Rola',
  eq_id: 'EQID',
  relationship_status: 'Status relacji',
  phone_number: 'Telefon',
  email: 'Email',
  address: 'Adres',
  profession: 'Zawód',
  products: 'Produkty',
  purchased_product: 'Zakupiony produkt',
  purchase_date: 'Data zakupu',
  notes: 'Notatki',
  reminder_date: 'Data przypomnienia',
  reminder_note: 'Treść przypomnienia',
  next_contact_date: 'Następny kontakt',
  added_at: 'Data dodania',
  start_date: 'Data startu',
  collaboration_level: 'Poziom współpracy',
};

export const TeamContactsManagement: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<TeamContact[]>([]);
  const [deletedUserContacts, setDeletedUserContacts] = useState<TeamContact[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filters, setFilters] = useState<TeamContactFilters>({
    role: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    userId: '',
    relationshipStatus: '',
  });

  // Settings state
  const [allowExport, setAllowExport] = useState(false);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('team_contacts')
        .select('*')
        .eq('is_active', true)
        .is('linked_user_deleted_at', null) // Exclude deleted user contacts
        .order('created_at', { ascending: false });

      if (filters.role && filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }
      
      if (filters.relationshipStatus && filters.relationshipStatus !== 'all') {
        query = query.eq('relationship_status', filters.relationshipStatus);
      }
      
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,eq_id.ilike.%${filters.search}%`);
      }

      if (filters.userId && filters.userId !== 'all') {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContacts((data || []) as TeamContact[]);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać kontaktów',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, eq_id')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_compass_settings')
        .select('allow_team_contacts_export')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setAllowExport(data.allow_team_contacts_export ?? false);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_compass_settings')
        .update({
          allow_team_contacts_export: allowExport,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (await supabase.from('ai_compass_settings').select('id').single()).data?.id);

      if (error) throw error;

      toast({
        title: 'Zapisano',
        description: 'Ustawienia modułu zostały zapisane',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać ustawień',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getContactHistory = async (contactId: string): Promise<TeamContactHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('team_contacts_history')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TeamContactHistory[];
    } catch (error) {
      console.error('Error fetching contact history:', error);
      return [];
    }
  };

  // Fetch contacts where linked user was deleted
  const fetchDeletedUserContacts = async () => {
    setLoadingDeleted(true);
    try {
      const { data, error } = await supabase
        .from('team_contacts')
        .select('*')
        .eq('is_active', true)
        .not('linked_user_deleted_at', 'is', null)
        .order('linked_user_deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedUserContacts((data || []) as TeamContact[]);
    } catch (error: any) {
      console.error('Error fetching deleted user contacts:', error);
    } finally {
      setLoadingDeleted(false);
    }
  };

  // Restore a contact (clear the deleted_at flag)
  const restoreContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('team_contacts')
        .update({ linked_user_deleted_at: null })
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: 'Przywrócono',
        description: 'Kontakt został przywrócony do właściciela',
      });

      fetchDeletedUserContacts();
    } catch (error: any) {
      console.error('Error restoring contact:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się przywrócić kontaktu',
        variant: 'destructive',
      });
    }
  };

  // Permanently delete a contact
  const permanentlyDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('team_contacts')
        .update({ is_active: false })
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: 'Usunięto',
        description: 'Kontakt został trwale usunięty',
      });

      fetchDeletedUserContacts();
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć kontaktu',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchUsers();
    fetchSettings();
    fetchDeletedUserContacts();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      role: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      search: '',
      userId: '',
      relationshipStatus: '',
    });
  };

  const hasFilters = filters.role || filters.relationshipStatus || filters.search || filters.userId;

  // Stats
  const stats = {
    total: contacts.length,
    clients: contacts.filter(c => c.role === 'client').length,
    partners: contacts.filter(c => c.role === 'partner').length,
    specialists: contacts.filter(c => c.role === 'specjalista').length,
    active: contacts.filter(c => c.relationship_status === 'active').length,
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Przegląd kontaktów
          </TabsTrigger>
          <TabsTrigger value="specialist-search" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Wyszukiwarka specjalistów
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Ustawienia modułu
          </TabsTrigger>
          <TabsTrigger value="deleted-users" className="flex items-center gap-2">
            <UserX className="w-4 h-4" />
            Usunięci użytkownicy
            {deletedUserContacts.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0.5">
                {deletedUserContacts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Wszystkich kontaktów</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">{stats.clients}</div>
                <p className="text-xs text-muted-foreground">Klientów</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">{stats.partners}</div>
                <p className="text-xs text-muted-foreground">Partnerów</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-purple-600">{stats.specialists}</div>
                <p className="text-xs text-muted-foreground">Specjalistów</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
                <p className="text-xs text-muted-foreground">Aktywnych</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtry
                </CardTitle>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Wyczyść filtry
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label className="text-xs">Szukaj</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Imię, nazwisko, EQID..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* User Filter */}
                <div className="space-y-2">
                  <Label className="text-xs">Właściciel kontaktu</Label>
                  <Select
                    value={filters.userId || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, userId: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wszyscy użytkownicy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszyscy użytkownicy</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Filter */}
                <div className="space-y-2">
                  <Label className="text-xs">Rola</Label>
                  <Select
                    value={filters.role || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, role: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wszystkie role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie role</SelectItem>
                      <SelectItem value="client">Klient</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="specjalista">Specjalista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-xs">Status relacji</Label>
                  <Select
                    value={filters.relationshipStatus || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, relationshipStatus: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wszystkie statusy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie statusy</SelectItem>
                      <SelectItem value="active">Aktywny</SelectItem>
                      <SelectItem value="suspended">Wstrzymany</SelectItem>
                      <SelectItem value="closed_success">Zamknięty - sukces</SelectItem>
                      <SelectItem value="closed_not_now">Zamknięty - nie teraz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contacts List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Lista kontaktów ({contacts.length})
              </CardTitle>
              <CardDescription>
                Widok tylko do odczytu - wszystkie kontakty wszystkich użytkowników
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamContactAccordion
                contacts={contacts}
                loading={loading}
                onEdit={() => {}}
                onDelete={() => {}}
                getContactHistory={getContactHistory}
                isAdmin={true}
                readOnly={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Specialist Search Tab */}
        <TabsContent value="specialist-search">
          <SpecialistSearchManagement />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Ustawienia modułu "Pure – Moja Lista Kontaktów"
              </CardTitle>
              <CardDescription>
                Konfiguruj widoczność pól i opcje eksportu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Settings */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Opcje eksportu
                </h4>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Zezwól na eksport kontaktów</Label>
                    <p className="text-sm text-muted-foreground">
                      Użytkownicy będą mogli eksportować swoje kontakty do plików Excel, HTML i Word
                    </p>
                  </div>
                  <Switch
                    checked={allowExport}
                    onCheckedChange={setAllowExport}
                  />
                </div>
              </div>

              {/* Field Visibility Info */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Widoczność pól
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Collapsed View Fields */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Widok zwinięty (zawsze widoczne)</Label>
                    <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                      {['first_name', 'last_name', 'role', 'eq_id', 'relationship_status'].map((field) => (
                        <div key={field} className="flex items-center gap-2 text-sm">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          {FIELD_LABELS[field] || field}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expanded View Fields */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Widok rozwinięty (po kliknięciu)</Label>
                    <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                      {['phone_number', 'email', 'address', 'profession', 'products', 'purchased_product', 'purchase_date', 'notes', 'reminder_date', 'reminder_note', 'next_contact_date'].map((field) => (
                        <div key={field} className="flex items-center gap-2 text-sm">
                          <span className="w-2 h-2 rounded-full bg-secondary" />
                          {FIELD_LABELS[field] || field}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Zapisywanie...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Zapisz ustawienia
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deleted Users Tab */}
        <TabsContent value="deleted-users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-destructive" />
                Kontakty z usuniętymi użytkownikami
              </CardTitle>
              <CardDescription>
                Kontakty, których powiązani użytkownicy zostali usunięci z systemu. Możesz je przywrócić (usunąć powiązanie) lub trwale usunąć.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDeleted ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : deletedUserContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserX className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Brak kontaktów z usuniętymi użytkownikami</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deletedUserContacts.map((contact) => {
                    const ownerUser = users.find(u => u.user_id === contact.user_id);
                    return (
                      <Card key={contact.id} className="border-destructive/30 bg-destructive/5">
                        <CardContent className="pt-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {contact.first_name} {contact.last_name}
                                </span>
                                {contact.eq_id && (
                                  <Badge variant="outline" className="text-xs">
                                    {contact.eq_id}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  {contact.role === 'client' ? 'Klient' : contact.role === 'partner' ? 'Partner' : 'Specjalista'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Właściciel kontaktu: {ownerUser ? `${ownerUser.first_name} ${ownerUser.last_name} (${ownerUser.email})` : 'Nieznany'}
                              </p>
                              <p className="text-xs text-destructive">
                                Użytkownik usunięty: {contact.linked_user_deleted_at 
                                  ? format(new Date(contact.linked_user_deleted_at), 'dd.MM.yyyy HH:mm', { locale: pl })
                                  : 'Nieznana data'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restoreContact(contact.id)}
                                className="gap-1"
                              >
                                <RotateCcw className="w-4 h-4" />
                                Przywróć
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => permanentlyDeleteContact(contact.id)}
                                className="gap-1"
                              >
                                <Trash2 className="w-4 h-4" />
                                Usuń trwale
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
