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
import { 
  Sparkles, Plus, Check, X, Trash2, Wand2, Edit, Calendar, Loader2, 
  BarChart3, Users, Eye, EyeOff, Heart, Zap, Cloud, Filter 
} from 'lucide-react';

interface DailySignal {
  id: string;
  main_message: string;
  explanation: string;
  signal_type: string;
  source: string;
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
  display_frequency: string;
  animation_type: string;
  animation_intensity: string;
}

interface Statistics {
  totalSignals: number;
  activeSignals: number;
  inactiveSignals: number;
  usedSignals: number;
  aiGenerated: number;
  adminCreated: number;
  byType: { supportive: number; motivational: number; calm: number };
  usersWithEnabled: number;
  usersWithDisabled: number;
  totalUsers: number;
}

const SIGNAL_TYPES = {
  supportive: { label: 'Wspierający', icon: Heart, color: 'text-pink-600 bg-pink-100' },
  motivational: { label: 'Motywacyjny', icon: Zap, color: 'text-amber-600 bg-amber-100' },
  calm: { label: 'Spokojny', icon: Cloud, color: 'text-blue-600 bg-blue-100' }
};

const GENERATION_COUNTS = [5, 10, 25, 50];

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
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Generation settings
  const [generateCount, setGenerateCount] = useState(5);
  const [generateTone, setGenerateTone] = useState('supportive');
  
  // Library filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [newSignal, setNewSignal] = useState({
    main_message: '',
    explanation: '',
    signal_type: 'supportive',
    scheduled_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
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

      const { data: signalsData, error: signalsError } = await supabase
        .from('daily_signals')
        .select('*')
        .order('created_at', { ascending: false });

      if (signalsError) throw signalsError;
      const signalsList = (signalsData as DailySignal[]) || [];
      setSignals(signalsList);

      const { data: preferencesData } = await supabase
        .from('user_signal_preferences')
        .select('show_daily_signal');

      const prefs = preferencesData || [];
      const stats: Statistics = {
        totalSignals: signalsList.length,
        activeSignals: signalsList.filter(s => s.is_approved).length,
        inactiveSignals: signalsList.filter(s => !s.is_approved).length,
        usedSignals: signalsList.filter(s => s.is_used).length,
        aiGenerated: signalsList.filter(s => s.source === 'ai' || s.generated_by_ai).length,
        adminCreated: signalsList.filter(s => s.source === 'admin' || !s.generated_by_ai).length,
        byType: {
          supportive: signalsList.filter(s => s.signal_type === 'supportive' || !s.signal_type).length,
          motivational: signalsList.filter(s => s.signal_type === 'motivational').length,
          calm: signalsList.filter(s => s.signal_type === 'calm').length,
        },
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
      toast({ title: 'Zapisano', description: 'Ustawienia zostały zaktualizowane' });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zapisać ustawień', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const generateSignalsWithAI = async () => {
    setGenerating(true);
    setGenerationProgress(0);
    setShowGenerateDialog(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-signal', {
        body: { tone: generateTone, count: generateCount }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Błąd funkcji AI');
      }

      if (data?.error) {
        console.error('AI error:', data.error);
        throw new Error(data.error);
      }

      // Handle single or multiple signals
      const generatedSignals = data.signals || [data];
      
      if (!generatedSignals.length) {
        throw new Error('AI nie zwróciło poprawnych danych');
      }

      // Save all signals to database
      const signalsToInsert = generatedSignals.map((s: any) => ({
        main_message: s.main_message,
        explanation: s.explanation,
        signal_type: s.signal_type || generateTone,
        source: 'ai',
        generated_by_ai: true,
        created_by: user?.id,
        is_approved: settings?.generation_mode === 'auto'
      }));

      const { data: insertedSignals, error: insertError } = await supabase
        .from('daily_signals')
        .insert(signalsToInsert)
        .select();

      if (insertError) throw insertError;

      setSignals([...(insertedSignals as DailySignal[]), ...signals]);
      fetchData();
      
      toast({
        title: `Wygenerowano ${generatedSignals.length} sygnałów`,
        description: settings?.generation_mode === 'auto' 
          ? 'Sygnały zostały automatycznie zatwierdzone'
          : 'Sygnały czekają na zatwierdzenie'
      });
    } catch (error) {
      console.error('Error generating signals:', error);
      toast({
        title: 'Błąd generowania',
        description: error instanceof Error ? error.message : 'Nie udało się wygenerować sygnałów',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
    }
  };

  const toggleSignalStatus = async (signalId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('daily_signals')
        .update({
          is_approved: newStatus,
          ...(newStatus ? { approved_by: user?.id, approved_at: new Date().toISOString() } : {})
        })
        .eq('id', signalId);

      if (error) throw error;

      setSignals(signals.map(s => 
        s.id === signalId 
          ? { ...s, is_approved: newStatus, approved_by: newStatus ? user?.id || null : s.approved_by, approved_at: newStatus ? new Date().toISOString() : s.approved_at }
          : s
      ));
      
      toast({
        title: newStatus ? 'Aktywowano' : 'Dezaktywowano',
        description: newStatus ? 'Sygnał jest teraz dostępny w rotacji' : 'Sygnał został wyłączony z rotacji'
      });
    } catch (error) {
      console.error('Error toggling signal:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zmienić statusu', variant: 'destructive' });
    }
  };

  const deleteSignal = async (signalId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten sygnał?')) return;
    
    try {
      const { error } = await supabase
        .from('daily_signals')
        .delete()
        .eq('id', signalId);

      if (error) throw error;

      setSignals(signals.filter(s => s.id !== signalId));
      toast({ title: 'Usunięto', description: 'Sygnał został usunięty' });
    } catch (error) {
      console.error('Error deleting signal:', error);
      toast({ title: 'Błąd', description: 'Nie udało się usunąć sygnału', variant: 'destructive' });
    }
  };

  const saveNewSignal = async () => {
    if (!newSignal.main_message || !newSignal.explanation) {
      toast({ title: 'Błąd', description: 'Wypełnij wszystkie wymagane pola', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('daily_signals')
        .insert({
          main_message: newSignal.main_message,
          explanation: newSignal.explanation,
          signal_type: newSignal.signal_type,
          source: 'admin',
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
      setNewSignal({ main_message: '', explanation: '', signal_type: 'supportive', scheduled_date: '' });
      
      toast({ title: 'Dodano', description: 'Nowy sygnał został dodany do biblioteki' });
    } catch (error) {
      console.error('Error saving signal:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zapisać sygnału', variant: 'destructive' });
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
          signal_type: editingSignal.signal_type,
          scheduled_date: editingSignal.scheduled_date
        })
        .eq('id', editingSignal.id);

      if (error) throw error;

      setSignals(signals.map(s => s.id === editingSignal.id ? editingSignal : s));
      setEditingSignal(null);
      
      toast({ title: 'Zapisano', description: 'Sygnał został zaktualizowany' });
    } catch (error) {
      console.error('Error updating signal:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować sygnału', variant: 'destructive' });
    }
  };

  const filteredSignals = signals.filter(s => {
    if (filterType !== 'all' && (s.signal_type || 'supportive') !== filterType) return false;
    if (filterSource !== 'all') {
      const isAi = s.source === 'ai' || s.generated_by_ai;
      if (filterSource === 'ai' && !isAi) return false;
      if (filterSource === 'admin' && isAi) return false;
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && !s.is_approved) return false;
      if (filterStatus === 'inactive' && s.is_approved) return false;
    }
    return true;
  });

  const getTypeBadge = (type: string) => {
    const typeInfo = SIGNAL_TYPES[type as keyof typeof SIGNAL_TYPES] || SIGNAL_TYPES.supportive;
    const Icon = typeInfo.icon;
    return (
      <Badge variant="secondary" className={`text-xs ${typeInfo.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {typeInfo.label}
      </Badge>
    );
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
          <TabsTrigger value="library">Biblioteka ({signals.length})</TabsTrigger>
          <TabsTrigger value="statistics">Statystyki</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Ustawienia globalne
              </CardTitle>
              <CardDescription>Kontroluj wyświetlanie i generowanie Sygnału Dnia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_enabled" className="text-base font-medium">Włącz Sygnał Dnia</Label>
                  <p className="text-sm text-muted-foreground">Globalnie włącza lub wyłącza funkcję</p>
                </div>
                <Switch
                  id="is_enabled"
                  checked={settings?.is_enabled || false}
                  onCheckedChange={(checked) => updateSettings({ is_enabled: checked })}
                  disabled={saving}
                />
              </div>

              <div className="border-t pt-6">
                <div>
                  <Label className="text-base font-medium">Częstotliwość wyświetlania</Label>
                  <p className="text-sm text-muted-foreground mb-2">Jak często użytkownicy widzą Sygnał Dnia</p>
                  <Select
                    value={settings?.display_frequency || 'daily'}
                    onValueChange={(value) => updateSettings({ display_frequency: value })}
                    disabled={saving}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Raz dziennie</SelectItem>
                      <SelectItem value="every_login">Przy każdym logowaniu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-6">
                <Label className="text-base font-medium mb-4 block">Widoczność dla ról</Label>
                <div className="space-y-4">
                  {[
                    { key: 'visible_to_clients', label: 'Klienci' },
                    { key: 'visible_to_partners', label: 'Partnerzy' },
                    { key: 'visible_to_specjalista', label: 'Specjaliści' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label htmlFor={key}>{label}</Label>
                      <Switch
                        id={key}
                        checked={(settings as any)?.[key] || false}
                        onCheckedChange={(checked) => updateSettings({ [key]: checked })}
                        disabled={saving}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div>
                  <Label className="text-base font-medium">Tryb generowania</Label>
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

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-sm font-medium">Animacja pojawiania się</Label>
                    <Select
                      value={settings?.animation_type || 'fade-in'}
                      onValueChange={(value) => updateSettings({ animation_type: value })}
                      disabled={saving}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Brak animacji</SelectItem>
                        <SelectItem value="fade-in">Fade In</SelectItem>
                        <SelectItem value="slide-up">Slide Up</SelectItem>
                        <SelectItem value="slide-down">Slide Down</SelectItem>
                        <SelectItem value="scale-in">Scale In (Zoom)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Intensywność animacji</Label>
                    <Select
                      value={settings?.animation_intensity || 'subtle'}
                      onValueChange={(value) => updateSettings({ animation_intensity: value })}
                      disabled={saving}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Wyłączona</SelectItem>
                        <SelectItem value="subtle">Subtelna (domyślna)</SelectItem>
                        <SelectItem value="enhanced">Wzmocniona</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-6 mt-6">
          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj własny
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setShowGenerateDialog(true)}
              disabled={generating || settings?.generation_mode === 'manual'}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {generating ? `Generowanie...` : 'Generuj z AI'}
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie typy</SelectItem>
                    <SelectItem value="supportive">Wspierający</SelectItem>
                    <SelectItem value="motivational">Motywacyjny</SelectItem>
                    <SelectItem value="calm">Spokojny</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Źródło" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie źródła</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie statusy</SelectItem>
                    <SelectItem value="active">Aktywne</SelectItem>
                    <SelectItem value="inactive">Nieaktywne</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground ml-auto">
                  {filteredSignals.length} z {signals.length} sygnałów
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Signals List */}
          <div className="space-y-4">
            {filteredSignals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {signals.length === 0 
                    ? 'Brak sygnałów. Dodaj pierwszy sygnał ręcznie lub wygeneruj z AI.'
                    : 'Brak sygnałów pasujących do filtrów.'}
                </CardContent>
              </Card>
            ) : (
              filteredSignals.map((signal) => (
                <Card key={signal.id} className={!signal.is_approved ? 'border-muted opacity-75' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {getTypeBadge(signal.signal_type || 'supportive')}
                          <Badge variant="outline" className="text-xs">
                            {signal.source === 'ai' || signal.generated_by_ai ? (
                              <><Wand2 className="w-3 h-3 mr-1" />AI</>
                            ) : (
                              <><Edit className="w-3 h-3 mr-1" />Admin</>
                            )}
                          </Badge>
                          {signal.is_approved ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <Eye className="w-3 h-3 mr-1" />Aktywny
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs">
                              <EyeOff className="w-3 h-3 mr-1" />Nieaktywny
                            </Badge>
                          )}
                          {signal.scheduled_date && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />{signal.scheduled_date}
                            </Badge>
                          )}
                          {signal.is_used && (
                            <Badge variant="secondary" className="text-xs">Wykorzystany</Badge>
                          )}
                        </div>
                        
                        <p className="text-lg font-medium">"{signal.main_message}"</p>
                        <p className="text-sm text-muted-foreground">{signal.explanation}</p>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={signal.is_approved ? "outline" : "default"}
                          onClick={() => toggleSignalStatus(signal.id, signal.is_approved)}
                          title={signal.is_approved ? 'Dezaktywuj' : 'Aktywuj'}
                        >
                          {signal.is_approved ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
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
                          className="text-destructive hover:bg-destructive/10"
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

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6 mt-6">
          {statistics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Wszystkie</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics.totalSignals}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {statistics.activeSignals} aktywnych, {statistics.inactiveSignals} nieaktywnych
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Źródło</CardTitle>
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
                          {statistics.adminCreated}
                        </div>
                        <p className="text-xs text-muted-foreground">Admin</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Typy sygnałów</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-pink-500" />
                        <span className="text-sm font-medium">{statistics.byType.supportive}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span className="text-sm font-medium">{statistics.byType.motivational}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Cloud className="w-3 h-3 text-blue-500" />
                        <span className="text-sm font-medium">{statistics.byType.calm}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Użytkownicy</CardTitle>
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
                        <div className="text-xl font-bold flex items-center gap-1 text-muted-foreground">
                          <EyeOff className="w-4 h-4" />
                          {statistics.usersWithDisabled}
                        </div>
                        <p className="text-xs text-muted-foreground">Wyłączone</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

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
                      <span className="text-sm text-muted-foreground">Dostępne do wyświetlenia (aktywne)</span>
                      <span className="font-medium">{statistics.activeSignals - statistics.usedSignals}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Sygnały wspierające</span>
                      <span className="font-medium">{statistics.byType.supportive}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Sygnały motywacyjne</span>
                      <span className="font-medium">{statistics.byType.motivational}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Sygnały spokojne</span>
                      <span className="font-medium">{statistics.byType.calm}</span>
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

      {/* Generate Signals Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Generuj sygnały z AI
            </DialogTitle>
            <DialogDescription>
              Wybierz liczbę sygnałów i ton generowania
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-sm font-medium">Ilość sygnałów</Label>
              <div className="flex gap-2 mt-2">
                {GENERATION_COUNTS.map((count) => (
                  <Button
                    key={count}
                    variant={generateCount === count ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGenerateCount(count)}
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Ton sygnałów</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Object.entries(SIGNAL_TYPES).map(([key, { label, icon: Icon, color }]) => (
                  <Button
                    key={key}
                    variant={generateTone === key ? "default" : "outline"}
                    size="sm"
                    className={generateTone === key ? '' : 'hover:bg-muted'}
                    onClick={() => setGenerateTone(key)}
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={generateSignalsWithAI} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              Generuj {generateCount} sygnałów
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Signal Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj własny sygnał</DialogTitle>
            <DialogDescription>Stwórz własny Sygnał Dnia (źródło: admin)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="signal_type">Typ sygnału *</Label>
              <Select
                value={newSignal.signal_type}
                onValueChange={(value) => setNewSignal({ ...newSignal, signal_type: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SIGNAL_TYPES).map(([key, { label, icon: Icon }]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="main_message">Główna treść *</Label>
              <Textarea
                id="main_message"
                placeholder="Wpisz główne przesłanie (max 15 słów)..."
                value={newSignal.main_message}
                onChange={(e) => setNewSignal({ ...newSignal, main_message: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="explanation">Dlaczego dziś ten sygnał? *</Label>
              <Textarea
                id="explanation"
                placeholder="Wpisz wyjaśnienie (max 20 słów)..."
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
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Anuluj</Button>
            <Button onClick={saveNewSignal}>Dodaj sygnał</Button>
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
                <Label htmlFor="edit_signal_type">Typ sygnału</Label>
                <Select
                  value={editingSignal.signal_type || 'supportive'}
                  onValueChange={(value) => setEditingSignal({ ...editingSignal, signal_type: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SIGNAL_TYPES).map(([key, { label, icon: Icon }]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            <Button variant="outline" onClick={() => setEditingSignal(null)}>Anuluj</Button>
            <Button onClick={updateSignal}>Zapisz zmiany</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
