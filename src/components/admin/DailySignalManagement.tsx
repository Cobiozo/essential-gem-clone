import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Plus, Check, X, Trash2, Wand2, Edit, Calendar, Loader2, BarChart3, Users, Eye, EyeOff } from 'lucide-react';

interface DailySignal {
  id: string;
  main_message: string;
  explanation: string;
  is_approved: boolean;
  is_used: boolean;
  scheduled_date: string | null;
  generated_by_ai: boolean;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface SignalSettings {
  id: string;
  is_enabled: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  generation_mode: string;
  ai_tone: string;
}

interface Statistics {
  totalSignals: number;
  approvedSignals: number;
  pendingSignals: number;
  usedSignals: number;
  aiGenerated: number;
  manuallyCreated: number;
  usersWithEnabled: number;
  usersWithDisabled: number;
  totalUsers: number;
}

export const DailySignalManagement: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SignalSettings | null>(null);
  const [signals, setSignals] = useState<DailySignal[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingSignal, setEditingSignal] = useState<DailySignal | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSignal, setNewSignal] = useState({
    main_message: '',
    explanation: '',
    scheduled_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('daily_signal_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      if (settingsData) {
        setSettings(settingsData as SignalSettings);
      }

      // Fetch all signals
      const { data: signalsData, error: signalsError } = await supabase
        .from('daily_signals')
        .select('*')
        .order('created_at', { ascending: false });

      if (signalsError) throw signalsError;
      const signalsList = (signalsData as DailySignal[]) || [];
      setSignals(signalsList);

      // Calculate statistics
      const { data: preferencesData } = await supabase
        .from('user_signal_preferences')
        .select('show_daily_signal');

      const prefs = preferencesData || [];
      const stats: Statistics = {
        totalSignals: signalsList.length,
        approvedSignals: signalsList.filter(s => s.is_approved).length,
        pendingSignals: signalsList.filter(s => !s.is_approved).length,
        usedSignals: signalsList.filter(s => s.is_used).length,
        aiGenerated: signalsList.filter(s => s.generated_by_ai).length,
        manuallyCreated: signalsList.filter(s => !s.generated_by_ai).length,
        usersWithEnabled: prefs.filter(p => p.show_daily_signal).length,
        usersWithDisabled: prefs.filter(p => !p.show_daily_signal).length,
        totalUsers: prefs.length
      };
      setStatistics(stats);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać danych',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<SignalSettings>) => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('daily_signal_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings({ ...settings, ...updates });
      toast({
        title: 'Zapisano',
        description: 'Ustawienia zostały zaktualizowane'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać ustawień',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const generateSignalWithAI = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-signal', {
        body: { tone: settings?.ai_tone || 'supportive' }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Błąd funkcji AI');
      }

      if (data?.error) {
        console.error('AI error:', data.error);
        throw new Error(data.error);
      }

      const { main_message, explanation } = data;
      
      if (!main_message || !explanation) {
        throw new Error('AI nie zwróciło poprawnych danych');
      }

      // Save to database
      const { data: newSignalData, error: insertError } = await supabase
        .from('daily_signals')
        .insert({
          main_message,
          explanation,
          generated_by_ai: true,
          created_by: user?.id,
          is_approved: settings?.generation_mode === 'auto'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSignals([newSignalData as DailySignal, ...signals]);
      
      // Refresh statistics
      fetchData();
      
      toast({
        title: 'Wygenerowano sygnał',
        description: settings?.generation_mode === 'auto' 
          ? 'Sygnał został wygenerowany i automatycznie zatwierdzony'
          : 'Sygnał został wygenerowany i czeka na zatwierdzenie'
      });
    } catch (error) {
      console.error('Error generating signal:', error);
      toast({
        title: 'Błąd generowania',
        description: error instanceof Error ? error.message : 'Nie udało się wygenerować sygnału',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const approveSignal = async (signalId: string) => {
    try {
      const { error } = await supabase
        .from('daily_signals')
        .update({
          is_approved: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', signalId);

      if (error) throw error;

      setSignals(signals.map(s => 
        s.id === signalId 
          ? { ...s, is_approved: true, approved_by: user?.id || null, approved_at: new Date().toISOString() }
          : s
      ));
      
      toast({
        title: 'Zatwierdzono',
        description: 'Sygnał został zatwierdzony do publikacji'
      });
    } catch (error) {
      console.error('Error approving signal:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zatwierdzić sygnału',
        variant: 'destructive'
      });
    }
  };

  const rejectSignal = async (signalId: string) => {
    try {
      const { error } = await supabase
        .from('daily_signals')
        .update({ is_approved: false })
        .eq('id', signalId);

      if (error) throw error;

      setSignals(signals.map(s => 
        s.id === signalId ? { ...s, is_approved: false } : s
      ));
      
      toast({
        title: 'Odrzucono',
        description: 'Sygnał został odrzucony'
      });
    } catch (error) {
      console.error('Error rejecting signal:', error);
    }
  };

  const deleteSignal = async (signalId: string) => {
    try {
      const { error } = await supabase
        .from('daily_signals')
        .delete()
        .eq('id', signalId);

      if (error) throw error;

      setSignals(signals.filter(s => s.id !== signalId));
      toast({
        title: 'Usunięto',
        description: 'Sygnał został usunięty'
      });
    } catch (error) {
      console.error('Error deleting signal:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć sygnału',
        variant: 'destructive'
      });
    }
  };

  const saveNewSignal = async () => {
    if (!newSignal.main_message || !newSignal.explanation) {
      toast({
        title: 'Błąd',
        description: 'Wypełnij wszystkie wymagane pola',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('daily_signals')
        .insert({
          main_message: newSignal.main_message,
          explanation: newSignal.explanation,
          scheduled_date: newSignal.scheduled_date || null,
          generated_by_ai: false,
          created_by: user?.id,
          is_approved: true
        })
        .select()
        .single();

      if (error) throw error;

      setSignals([data as DailySignal, ...signals]);
      setShowAddDialog(false);
      setNewSignal({ main_message: '', explanation: '', scheduled_date: '' });
      
      toast({
        title: 'Dodano',
        description: 'Nowy sygnał został dodany'
      });
    } catch (error) {
      console.error('Error saving signal:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać sygnału',
        variant: 'destructive'
      });
    }
  };

  const updateSignal = async () => {
    if (!editingSignal) return;

    try {
      const { error } = await supabase
        .from('daily_signals')
        .update({
          main_message: editingSignal.main_message,
          explanation: editingSignal.explanation,
          scheduled_date: editingSignal.scheduled_date
        })
        .eq('id', editingSignal.id);

      if (error) throw error;

      setSignals(signals.map(s => 
        s.id === editingSignal.id ? editingSignal : s
      ));
      setEditingSignal(null);
      
      toast({
        title: 'Zapisano',
        description: 'Sygnał został zaktualizowany'
      });
    } catch (error) {
      console.error('Error updating signal:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować sygnału',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          <TabsTrigger value="library">Biblioteka sygnałów</TabsTrigger>
          <TabsTrigger value="statistics">Statystyki</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* Global Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Ustawienia globalne
              </CardTitle>
              <CardDescription>
                Kontroluj wyświetlanie i generowanie Sygnału Dnia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_enabled" className="text-base font-medium">
                    Włącz Sygnał Dnia
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Globalnie włącza lub wyłącza funkcję
                  </p>
                </div>
                <Switch
                  id="is_enabled"
                  checked={settings?.is_enabled || false}
                  onCheckedChange={(checked) => updateSettings({ is_enabled: checked })}
                  disabled={saving}
                />
              </div>

              <div className="border-t pt-6">
                <Label className="text-base font-medium mb-4 block">
                  Widoczność dla ról
                </Label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="visible_clients">Klienci</Label>
                    <Switch
                      id="visible_clients"
                      checked={settings?.visible_to_clients || false}
                      onCheckedChange={(checked) => updateSettings({ visible_to_clients: checked })}
                      disabled={saving}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="visible_partners">Partnerzy</Label>
                    <Switch
                      id="visible_partners"
                      checked={settings?.visible_to_partners || false}
                      onCheckedChange={(checked) => updateSettings({ visible_to_partners: checked })}
                      disabled={saving}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="visible_specjalista">Specjaliści</Label>
                    <Switch
                      id="visible_specjalista"
                      checked={settings?.visible_to_specjalista || false}
                      onCheckedChange={(checked) => updateSettings({ visible_to_specjalista: checked })}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div>
                  <Label htmlFor="generation_mode" className="text-base font-medium">
                    Tryb generowania
                  </Label>
                  <Select
                    value={settings?.generation_mode || 'semi_auto'}
                    onValueChange={(value) => updateSettings({ generation_mode: value })}
                    disabled={saving}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatyczny (AI bez akceptacji)</SelectItem>
                      <SelectItem value="semi_auto">Półautomatyczny (AI + akceptacja)</SelectItem>
                      <SelectItem value="manual">Manualny (tylko ręczne wpisy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ai_tone" className="text-base font-medium">
                    Ton AI
                  </Label>
                  <Select
                    value={settings?.ai_tone || 'supportive'}
                    onValueChange={(value) => updateSettings({ ai_tone: value })}
                    disabled={saving}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supportive">Wspierający</SelectItem>
                      <SelectItem value="motivational">Motywacyjny</SelectItem>
                      <SelectItem value="calm">Spokojny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-6 mt-6">
          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj ręcznie
            </Button>
            <Button 
              variant="secondary" 
              onClick={generateSignalWithAI}
              disabled={generating || settings?.generation_mode === 'manual'}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Generuj z AI
            </Button>
          </div>

          {/* Signals List */}
          <div className="space-y-4">
            {signals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Brak sygnałów. Dodaj pierwszy sygnał ręcznie lub wygeneruj z AI.
                </CardContent>
              </Card>
            ) : (
              signals.map((signal) => (
                <Card key={signal.id} className={!signal.is_approved ? 'border-yellow-300' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {signal.generated_by_ai && (
                            <Badge variant="secondary" className="text-xs">
                              <Wand2 className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          {signal.is_approved ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Zatwierdzony
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                              Oczekuje
                            </Badge>
                          )}
                          {signal.scheduled_date && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {signal.scheduled_date}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-lg font-medium">"{signal.main_message}"</p>
                        <p className="text-sm text-muted-foreground">{signal.explanation}</p>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {!signal.is_approved && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => approveSignal(signal.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => rejectSignal(signal.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSignal(signal)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => deleteSignal(signal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6 mt-6">
          {statistics && (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Wszystkie sygnały
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics.totalSignals}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {statistics.approvedSignals} zatwierdzonych, {statistics.pendingSignals} oczekujących
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Źródło sygnałów
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-xl font-bold flex items-center gap-1">
                          <Wand2 className="w-4 h-4 text-purple-500" />
                          {statistics.aiGenerated}
                        </div>
                        <p className="text-xs text-muted-foreground">AI</p>
                      </div>
                      <div>
                        <div className="text-xl font-bold flex items-center gap-1">
                          <Edit className="w-4 h-4 text-blue-500" />
                          {statistics.manuallyCreated}
                        </div>
                        <p className="text-xs text-muted-foreground">Ręczne</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Preferencje użytkowników
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-xl font-bold flex items-center gap-1 text-green-600">
                          <Eye className="w-4 h-4" />
                          {statistics.usersWithEnabled}
                        </div>
                        <p className="text-xs text-muted-foreground">Włączone</p>
                      </div>
                      <div>
                        <div className="text-xl font-bold flex items-center gap-1 text-red-600">
                          <EyeOff className="w-4 h-4" />
                          {statistics.usersWithDisabled}
                        </div>
                        <p className="text-xs text-muted-foreground">Wyłączone</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Szczegółowe statystyki
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Wykorzystane sygnały</span>
                      <span className="font-medium">{statistics.usedSignals}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Dostępne do wyświetlenia</span>
                      <span className="font-medium">{statistics.approvedSignals - statistics.usedSignals}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Oczekujące na zatwierdzenie</span>
                      <span className="font-medium">{statistics.pendingSignals}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Użytkownicy z zapisanymi preferencjami</span>
                      <span className="font-medium">{statistics.totalUsers}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Signal Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj nowy sygnał</DialogTitle>
            <DialogDescription>
              Stwórz własny Sygnał Dnia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="main_message">Główna treść *</Label>
              <Textarea
                id="main_message"
                placeholder="Wpisz główne przesłanie..."
                value={newSignal.main_message}
                onChange={(e) => setNewSignal({ ...newSignal, main_message: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="explanation">Dlaczego dziś ten sygnał? *</Label>
              <Textarea
                id="explanation"
                placeholder="Wpisz wyjaśnienie..."
                value={newSignal.explanation}
                onChange={(e) => setNewSignal({ ...newSignal, explanation: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="scheduled_date">Data wyświetlenia (opcjonalne)</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={newSignal.scheduled_date}
                onChange={(e) => setNewSignal({ ...newSignal, scheduled_date: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={saveNewSignal}>
              Dodaj sygnał
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Signal Dialog */}
      <Dialog open={!!editingSignal} onOpenChange={() => setEditingSignal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj sygnał</DialogTitle>
          </DialogHeader>
          {editingSignal && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit_main_message">Główna treść</Label>
                <Textarea
                  id="edit_main_message"
                  value={editingSignal.main_message}
                  onChange={(e) => setEditingSignal({ ...editingSignal, main_message: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="edit_explanation">Dlaczego dziś ten sygnał?</Label>
                <Textarea
                  id="edit_explanation"
                  value={editingSignal.explanation}
                  onChange={(e) => setEditingSignal({ ...editingSignal, explanation: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="edit_scheduled_date">Data wyświetlenia</Label>
                <Input
                  id="edit_scheduled_date"
                  type="date"
                  value={editingSignal.scheduled_date || ''}
                  onChange={(e) => setEditingSignal({ ...editingSignal, scheduled_date: e.target.value || null })}
                  className="mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSignal(null)}>
              Anuluj
            </Button>
            <Button onClick={updateSignal}>
              Zapisz zmiany
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
