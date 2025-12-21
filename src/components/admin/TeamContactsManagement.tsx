import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Settings, Eye, Download, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TeamContactAccordion } from '@/components/team-contacts/TeamContactAccordion';
import type { TeamContact, TeamContactFilters, TeamContactHistory } from '@/components/team-contacts/types';

interface UserProfile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  eq_id: string | null;
}

export const TeamContactsManagement: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<TeamContact[]>([]);
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
  const [settings, setSettings] = useState({
    allowExport: true,
    allowExportExcel: true,
    allowExportHtml: true,
    allowExportWord: true,
    showCollapsedFields: ['first_name', 'last_name', 'role', 'eq_id'],
    showExpandedFields: ['phone_number', 'email', 'address', 'profession', 'products', 'notes', 'reminder_date'],
  });

  const fetchContacts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('team_contacts')
        .select('*')
        .eq('is_active', true)
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

  useEffect(() => {
    fetchContacts();
    fetchUsers();
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
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Ustawienia modułu
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Eksport Excel</Label>
                      <p className="text-xs text-muted-foreground">Pozwól na eksport do .xlsx</p>
                    </div>
                    <Switch
                      checked={settings.allowExportExcel}
                      onCheckedChange={(checked) => setSettings({ ...settings, allowExportExcel: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Eksport HTML</Label>
                      <p className="text-xs text-muted-foreground">Pozwól na podgląd HTML</p>
                    </div>
                    <Switch
                      checked={settings.allowExportHtml}
                      onCheckedChange={(checked) => setSettings({ ...settings, allowExportHtml: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Eksport Word</Label>
                      <p className="text-xs text-muted-foreground">Pozwól na eksport do .docx</p>
                    </div>
                    <Switch
                      checked={settings.allowExportWord}
                      onCheckedChange={(checked) => setSettings({ ...settings, allowExportWord: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Field Visibility Settings */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Widoczność pól
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Collapsed View Fields */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Widok zwinięty (zawsze widoczne)</Label>
                    <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                      {['first_name', 'last_name', 'role', 'eq_id', 'relationship_status'].map((field) => (
                        <div key={field} className="flex items-center justify-between">
                          <span className="text-sm">{getFieldLabel(field)}</span>
                          <Switch
                            checked={settings.showCollapsedFields.includes(field)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSettings({
                                  ...settings,
                                  showCollapsedFields: [...settings.showCollapsedFields, field],
                                });
                              } else {
                                setSettings({
                                  ...settings,
                                  showCollapsedFields: settings.showCollapsedFields.filter(f => f !== field),
                                });
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expanded View Fields */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Widok rozwinięty (po kliknięciu)</Label>
                    <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                      {['phone_number', 'email', 'address', 'profession', 'products', 'purchased_product', 'purchase_date', 'notes', 'reminder_date', 'reminder_note', 'next_contact_date'].map((field) => (
                        <div key={field} className="flex items-center justify-between">
                          <span className="text-sm">{getFieldLabel(field)}</span>
                          <Switch
                            checked={settings.showExpandedFields.includes(field)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSettings({
                                  ...settings,
                                  showExpandedFields: [...settings.showExpandedFields, field],
                                });
                              } else {
                                setSettings({
                                  ...settings,
                                  showExpandedFields: settings.showExpandedFields.filter(f => f !== field),
                                });
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full md:w-auto">
                Zapisz ustawienia
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper function to get field labels
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
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
    start_date: 'Data rozpoczęcia',
    collaboration_level: 'Poziom współpracy',
  };
  return labels[field] || field;
}
