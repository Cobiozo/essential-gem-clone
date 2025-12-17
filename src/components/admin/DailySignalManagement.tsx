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
import { Sparkles, Plus, Check, X, Trash2, Wand2, Edit, Calendar, Loader2 } from 'lucide-react';

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

export const DailySignalManagement: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SignalSettings | null>(null);
  const [signals, setSignals] = useState<DailySignal[]>([]);
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
      setSignals((signalsData as DailySignal[]) || []);
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
      const response = await supabase.functions.invoke('generate-daily-signal', {
        body: { tone: settings?.ai_tone || 'supportive' }
      });

      if (response.error) throw response.error;

      const { main_message, explanation } = response.data;

      // Save to database
      const { data: newSignalData, error } = await supabase
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

      if (error) throw error;

      setSignals([newSignalData as DailySignal, ...signals]);
      toast({
        title: 'Wygenerowano',
        description: settings?.generation_mode === 'auto' 
          ? 'Sygnał został wygenerowany i automatycznie zatwierdzony'
          : 'Sygnał został wygenerowany i czeka na zatwierdzenie'
      });
    } catch (error) {
      console.error('Error generating signal:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wygenerować sygnału',
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          <TabsTrigger value="library">Biblioteka sygnałów</TabsTrigger>
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
