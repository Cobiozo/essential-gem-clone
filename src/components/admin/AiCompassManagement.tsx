import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Compass, Settings, Users, BarChart3, Plus, Pencil, Trash2, 
  Save, UserCheck, Briefcase, GraduationCap, Download, Shield
} from 'lucide-react';

interface Settings {
  id: string;
  is_enabled: boolean;
  enabled_for_partners: boolean;
  enabled_for_specjalista: boolean;
  enabled_for_clients: boolean;
  allow_export: boolean;
  ai_learning_enabled: boolean;
  ai_system_prompt: string;
  allow_delete_contacts: boolean;
  allow_delete_history: boolean;
  allow_edit_contacts: boolean;
  allow_multiple_decisions: boolean;
  data_retention_days: number | null;
  show_today_dashboard: boolean;
  show_contact_timeline: boolean;
}

interface ContactType {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  is_system: boolean;
  is_active: boolean;
  position: number;
}

interface ContactStage {
  id: string;
  contact_type_id: string;
  name: string;
  description: string;
  position: number;
  is_active: boolean;
}

interface SessionStats {
  total_sessions: number;
  act_decisions: number;
  wait_decisions: number;
  positive_feedback: number;
  negative_feedback: number;
  total_contacts: number;
  active_contacts: number;
}

interface LearningPattern {
  id: string;
  contact_type_id: string;
  stage_id: string;
  pattern_type: string;
  optimal_timing_days: number;
  success_rate: number;
  sample_count: number;
}

export const AiCompassManagement: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [stages, setStages] = useState<ContactStage[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [patterns, setPatterns] = useState<LearningPattern[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editingType, setEditingType] = useState<ContactType | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [selectedTypeForStages, setSelectedTypeForStages] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadSettings(),
      loadContactTypes(),
      loadStats(),
      loadPatterns()
    ]);
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from('ai_compass_settings')
      .select('*')
      .single();
    setSettings(data);
  };

  const loadContactTypes = async () => {
    const { data: types } = await supabase
      .from('ai_compass_contact_types')
      .select('*')
      .order('position');
    setContactTypes(types || []);

    const { data: stagesData } = await supabase
      .from('ai_compass_contact_stages')
      .select('*')
      .order('position');
    setStages(stagesData || []);
  };

  const loadStats = async () => {
    const { data: sessions } = await supabase
      .from('ai_compass_sessions')
      .select('ai_decision, user_feedback');

    const { data: contacts, count: contactsCount } = await supabase
      .from('ai_compass_contacts')
      .select('is_active', { count: 'exact' });

    const activeContacts = contacts?.filter(c => c.is_active).length || 0;

    if (sessions) {
      setStats({
        total_sessions: sessions.length,
        act_decisions: sessions.filter(s => s.ai_decision === 'ACT').length,
        wait_decisions: sessions.filter(s => s.ai_decision === 'WAIT').length,
        positive_feedback: sessions.filter(s => s.user_feedback === 'positive').length,
        negative_feedback: sessions.filter(s => s.user_feedback === 'negative').length,
        total_contacts: contactsCount || 0,
        active_contacts: activeContacts,
      });
    }
  };

  const loadPatterns = async () => {
    const { data } = await supabase
      .from('ai_compass_learning_patterns')
      .select('*')
      .order('success_rate', { ascending: false });
    setPatterns(data || []);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);

    const { error } = await supabase
      .from('ai_compass_settings')
      .update({
        is_enabled: settings.is_enabled,
        enabled_for_partners: settings.enabled_for_partners,
        enabled_for_specjalista: settings.enabled_for_specjalista,
        enabled_for_clients: settings.enabled_for_clients,
        allow_export: settings.allow_export,
        ai_learning_enabled: settings.ai_learning_enabled,
        ai_system_prompt: settings.ai_system_prompt,
        allow_delete_contacts: settings.allow_delete_contacts,
        allow_delete_history: settings.allow_delete_history,
        allow_edit_contacts: settings.allow_edit_contacts,
        allow_multiple_decisions: settings.allow_multiple_decisions,
        data_retention_days: settings.data_retention_days,
        show_today_dashboard: settings.show_today_dashboard,
        show_contact_timeline: settings.show_contact_timeline,
      })
      .eq('id', settings.id);

    setIsSaving(false);
    if (error) {
      toast.error('Błąd zapisu ustawień');
    } else {
      toast.success('Ustawienia zapisane');
    }
  };

  const handleAddContactType = async () => {
    if (!newTypeName.trim()) return;

    const maxPosition = Math.max(...contactTypes.map(t => t.position), 0);
    const { error } = await supabase
      .from('ai_compass_contact_types')
      .insert({
        name: newTypeName,
        description: newTypeDescription,
        position: maxPosition + 1,
        is_system: false
      });

    if (!error) {
      setNewTypeName('');
      setNewTypeDescription('');
      loadContactTypes();
      toast.success('Dodano typ kontaktu');
    }
  };

  const handleUpdateContactType = async (type: ContactType) => {
    const { error } = await supabase
      .from('ai_compass_contact_types')
      .update({
        name: type.name,
        description: type.description,
        is_active: type.is_active
      })
      .eq('id', type.id);

    if (!error) {
      setEditingType(null);
      loadContactTypes();
      toast.success('Zaktualizowano typ kontaktu');
    }
  };

  const handleDeleteContactType = async (id: string) => {
    const type = contactTypes.find(t => t.id === id);
    if (type?.is_system) {
      toast.error('Nie można usunąć systemowego typu kontaktu');
      return;
    }

    const { error } = await supabase
      .from('ai_compass_contact_types')
      .delete()
      .eq('id', id);

    if (!error) {
      loadContactTypes();
      toast.success('Usunięto typ kontaktu');
    }
  };

  const handleAddStage = async (typeId: string, stageName: string) => {
    const typeStages = stages.filter(s => s.contact_type_id === typeId);
    const maxPosition = Math.max(...typeStages.map(s => s.position), 0);

    const { error } = await supabase
      .from('ai_compass_contact_stages')
      .insert({
        contact_type_id: typeId,
        name: stageName,
        position: maxPosition + 1
      });

    if (!error) {
      loadContactTypes();
      toast.success('Dodano etap');
    }
  };

  const handleExportAllData = async () => {
    const { data: sessions } = await supabase
      .from('ai_compass_sessions')
      .select('*, profiles:user_id(first_name, last_name, email)')
      .order('created_at', { ascending: false });

    if (!sessions) return;

    const headers = ['Data', 'Użytkownik', 'Email', 'Typ kontaktu', 'Etap', 'Kontekst', 'Decyzja', 'Uzasadnienie', 'Wiadomość', 'Feedback'];
    const rows = sessions.map(s => [
      new Date(s.created_at).toLocaleString('pl'),
      `${(s as any).profiles?.first_name || ''} ${(s as any).profiles?.last_name || ''}`.trim(),
      (s as any).profiles?.email || '',
      contactTypes.find(t => t.id === s.contact_type_id)?.name || '',
      stages.find(st => st.id === s.stage_id)?.name || '',
      s.context_description,
      s.ai_decision,
      s.ai_reasoning || '',
      s.generated_message || '',
      s.user_feedback || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-compass-all-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Wyeksportowano wszystkie dane');
  };

  if (!settings) {
    return <div className="flex justify-center p-8">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            Pure AI-Compass - Zarządzanie
          </h2>
          <p className="text-muted-foreground">Konfiguracja modułu wsparcia decyzji</p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" />Ustawienia</TabsTrigger>
          <TabsTrigger value="policies"><Shield className="h-4 w-4 mr-2" />Polityki</TabsTrigger>
          <TabsTrigger value="types"><Users className="h-4 w-4 mr-2" />Typy kontaktów</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="h-4 w-4 mr-2" />Statystyki</TabsTrigger>
          <TabsTrigger value="learning"><GraduationCap className="h-4 w-4 mr-2" />Uczenie AI</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Podstawowe ustawienia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Moduł włączony</Label>
                  <p className="text-sm text-muted-foreground">Globalne włączenie/wyłączenie modułu</p>
                </div>
                <Switch
                  checked={settings.is_enabled}
                  onCheckedChange={v => setSettings({...settings, is_enabled: v})}
                />
              </div>

              <div className="border-t pt-4">
                <Label className="mb-3 block">Dostęp dla ról</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      <span>Partnerzy</span>
                    </div>
                    <Switch
                      checked={settings.enabled_for_partners}
                      onCheckedChange={v => setSettings({...settings, enabled_for_partners: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>Specjaliści</span>
                    </div>
                    <Switch
                      checked={settings.enabled_for_specjalista}
                      onCheckedChange={v => setSettings({...settings, enabled_for_specjalista: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      <span>Klienci</span>
                    </div>
                    <Switch
                      checked={settings.enabled_for_clients}
                      onCheckedChange={v => setSettings({...settings, enabled_for_clients: v})}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Eksport danych</Label>
                    <p className="text-sm text-muted-foreground">Pozwól użytkownikom eksportować historię</p>
                  </div>
                  <Switch
                    checked={settings.allow_export}
                    onCheckedChange={v => setSettings({...settings, allow_export: v})}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Uczenie AI</Label>
                    <p className="text-sm text-muted-foreground">Agreguj anonimowe dane do uczenia</p>
                  </div>
                  <Switch
                    checked={settings.ai_learning_enabled}
                    onCheckedChange={v => setSettings({...settings, ai_learning_enabled: v})}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-3 block">Funkcje widoku</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Dashboard "Dziś do zrobienia"</Label>
                      <p className="text-sm text-muted-foreground">Pokazuj widok z priorytetowymi kontaktami</p>
                    </div>
                    <Switch
                      checked={settings.show_today_dashboard}
                      onCheckedChange={v => setSettings({...settings, show_today_dashboard: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Timeline kontaktu</Label>
                      <p className="text-sm text-muted-foreground">Pokazuj wizualną oś czasu dla kontaktów</p>
                    </div>
                    <Switch
                      checked={settings.show_contact_timeline}
                      onCheckedChange={v => setSettings({...settings, show_contact_timeline: v})}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <Label>Prompt systemowy AI</Label>
                <Textarea
                  value={settings.ai_system_prompt || ''}
                  onChange={e => setSettings({...settings, ai_system_prompt: e.target.value})}
                  rows={6}
                  placeholder="Instrukcje dla AI..."
                />
              </div>

              <Button onClick={handleSaveSettings} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Polityka danych i kontrola</CardTitle>
              <CardDescription>Kontroluj co użytkownicy mogą robić ze swoimi danymi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Kasowanie kontaktów</Label>
                  <p className="text-sm text-muted-foreground">Pozwól użytkownikom usuwać swoje kontakty</p>
                </div>
                <Switch
                  checked={settings.allow_delete_contacts}
                  onCheckedChange={v => setSettings({...settings, allow_delete_contacts: v})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Kasowanie historii</Label>
                  <p className="text-sm text-muted-foreground">Pozwól użytkownikom usuwać historię decyzji AI</p>
                </div>
                <Switch
                  checked={settings.allow_delete_history}
                  onCheckedChange={v => setSettings({...settings, allow_delete_history: v})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Edycja kontaktów</Label>
                  <p className="text-sm text-muted-foreground">Pozwól użytkownikom edytować dane kontaktów</p>
                </div>
                <Switch
                  checked={settings.allow_edit_contacts}
                  onCheckedChange={v => setSettings({...settings, allow_edit_contacts: v})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Wielokrotne decyzje AI</Label>
                  <p className="text-sm text-muted-foreground">Pozwól generować wiele decyzji AI dla jednego kontaktu</p>
                </div>
                <Switch
                  checked={settings.allow_multiple_decisions}
                  onCheckedChange={v => setSettings({...settings, allow_multiple_decisions: v})}
                />
              </div>

              <div className="border-t pt-4 space-y-2">
                <Label>Retencja danych (dni)</Label>
                <p className="text-sm text-muted-foreground">Automatyczne archiwizowanie danych po określonej liczbie dni (puste = bez limitu)</p>
                <Input
                  type="number"
                  min={0}
                  value={settings.data_retention_days || ''}
                  onChange={e => setSettings({...settings, data_retention_days: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="np. 365"
                  className="w-32"
                />
              </div>

              <Button onClick={handleSaveSettings} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Zapisywanie...' : 'Zapisz polityki'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Typy kontaktów</CardTitle>
              <CardDescription>Zarządzaj predefiniowanymi i własnymi typami kontaktów</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nazwa nowego typu..."
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                />
                <Input
                  placeholder="Opis (opcjonalnie)"
                  value={newTypeDescription}
                  onChange={e => setNewTypeDescription(e.target.value)}
                />
                <Button onClick={handleAddContactType}>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Opis</TableHead>
                    <TableHead>Etapy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactTypes.map(type => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">
                        {type.name}
                        {type.is_system && (
                          <Badge variant="secondary" className="ml-2">System</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{type.description}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedTypeForStages(type.id)}
                            >
                              {stages.filter(s => s.contact_type_id === type.id).length} etapów
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Etapy: {type.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Nowy etap..."
                                  id={`new-stage-${type.id}`}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      handleAddStage(type.id, (e.target as HTMLInputElement).value);
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }}
                                />
                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    const input = document.getElementById(`new-stage-${type.id}`) as HTMLInputElement;
                                    if (input?.value) {
                                      handleAddStage(type.id, input.value);
                                      input.value = '';
                                    }
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <ScrollArea className="h-[200px]">
                                <div className="space-y-2">
                                  {stages.filter(s => s.contact_type_id === type.id).map(stage => (
                                    <div key={stage.id} className="flex items-center justify-between p-2 rounded bg-muted">
                                      <span>{stage.name}</span>
                                      <Badge variant={stage.is_active ? 'default' : 'secondary'}>
                                        {stage.is_active ? 'Aktywny' : 'Nieaktywny'}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? 'default' : 'secondary'}>
                          {type.is_active ? 'Aktywny' : 'Nieaktywny'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => setEditingType(type)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edytuj typ kontaktu</DialogTitle>
                              </DialogHeader>
                              {editingType && (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Nazwa</Label>
                                    <Input
                                      value={editingType.name}
                                      onChange={e => setEditingType({...editingType, name: e.target.value})}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Opis</Label>
                                    <Textarea
                                      value={editingType.description || ''}
                                      onChange={e => setEditingType({...editingType, description: e.target.value})}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <Label>Aktywny</Label>
                                    <Switch
                                      checked={editingType.is_active}
                                      onCheckedChange={v => setEditingType({...editingType, is_active: v})}
                                    />
                                  </div>
                                  <Button onClick={() => handleUpdateContactType(editingType)}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Zapisz
                                  </Button>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          {!type.is_system && (
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => handleDeleteContactType(type.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Łączna liczba sesji</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.total_sessions || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Decyzje DZIAŁAJ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{stats?.act_decisions || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Decyzje POCZEKAJ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">{stats?.wait_decisions || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pozytywny feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {stats?.total_sessions ? Math.round((stats.positive_feedback / stats.total_sessions) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Łączna liczba kontaktów</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.total_contacts || 0}</p>
                <p className="text-sm text-muted-foreground">
                  Aktywnych: {stats?.active_contacts || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Śr. decyzji na kontakt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {stats?.active_contacts ? (stats.total_sessions / stats.active_contacts).toFixed(1) : 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Eksport danych</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportAllData}>
                <Download className="h-4 w-4 mr-2" />
                Eksportuj wszystkie sesje (CSV)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wzorce uczenia AI</CardTitle>
              <CardDescription>Agregowane dane z historii decyzji</CardDescription>
            </CardHeader>
            <CardContent>
              {patterns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Brak danych do uczenia. Wzorce pojawią się po zebraniu większej liczby sesji.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Typ kontaktu</TableHead>
                      <TableHead>Etap</TableHead>
                      <TableHead>Typ wzorca</TableHead>
                      <TableHead>Optymalny czas (dni)</TableHead>
                      <TableHead>Skuteczność</TableHead>
                      <TableHead>Próbki</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patterns.map(pattern => (
                      <TableRow key={pattern.id}>
                        <TableCell>
                          {contactTypes.find(t => t.id === pattern.contact_type_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {stages.find(s => s.id === pattern.stage_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={pattern.pattern_type === 'success' ? 'default' : 'secondary'}>
                            {pattern.pattern_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{pattern.optimal_timing_days || '-'}</TableCell>
                        <TableCell>
                          {pattern.success_rate ? `${Math.round(pattern.success_rate * 100)}%` : '-'}
                        </TableCell>
                        <TableCell>{pattern.sample_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
