import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Clock, Save, Link2, RefreshCw, List } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getRoleLabel, AppRole } from '@/components/user-reflinks/types';
import { AllUserReflinksPanel } from './AllUserReflinksPanel';

interface GenerationSettings {
  id: string;
  role: AppRole;
  can_generate: boolean;
  allowed_target_roles: AppRole[];
  max_links_per_user: number;
}

const ALL_ROLES: AppRole[] = ['admin', 'partner', 'specjalista', 'client'];

export const UserReflinksSettings: React.FC = () => {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshStats, setLastRefreshStats] = useState<{updated_count: number} | null>(null);
  
  const [validityDays, setValidityDays] = useState('30');
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch global validity
      const { data: globalData } = await supabase
        .from('reflink_global_settings')
        .select('setting_value')
        .eq('setting_key', 'link_validity_days')
        .single();
      
      if (globalData) {
        setValidityDays(globalData.setting_value);
      }
      
      // Fetch generation settings
      const { data: genData } = await supabase
        .from('reflink_generation_settings')
        .select('*')
        .order('role');
      
      if (genData) {
        setGenerationSettings(genData as unknown as GenerationSettings[]);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveValidity = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('reflink_global_settings')
        .update({ 
          setting_value: validityDays,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'link_validity_days');
      
      if (error) throw error;
      
      toast({
        title: 'Zapisano',
        description: 'Okres ważności linków został zaktualizowany',
      });
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się zapisać ustawień',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCanGenerate = async (role: AppRole, canGenerate: boolean) => {
    try {
      const { error } = await supabase
        .from('reflink_generation_settings')
        .update({ 
          can_generate: canGenerate,
          updated_at: new Date().toISOString()
        })
        .eq('role', role);
      
      if (error) throw error;
      
      setGenerationSettings(prev => 
        prev.map(s => s.role === role ? { ...s, can_generate: canGenerate } : s)
      );
      
      toast({
        title: 'Zapisano',
        description: `Generowanie dla roli "${getRoleLabel(role)}" ${canGenerate ? 'włączone' : 'wyłączone'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateMaxLinks = async (role: AppRole, maxLinks: number) => {
    try {
      const { error } = await supabase
        .from('reflink_generation_settings')
        .update({ 
          max_links_per_user: maxLinks,
          updated_at: new Date().toISOString()
        })
        .eq('role', role);
      
      if (error) throw error;
      
      setGenerationSettings(prev => 
        prev.map(s => s.role === role ? { ...s, max_links_per_user: maxLinks } : s)
      );
      
      toast({ title: 'Zapisano' });
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleTargetRole = async (settingsRole: AppRole, targetRole: AppRole, enabled: boolean) => {
    const current = generationSettings.find(s => s.role === settingsRole);
    if (!current) return;
    
    const newTargetRoles: AppRole[] = enabled
      ? [...current.allowed_target_roles, targetRole]
      : current.allowed_target_roles.filter(r => r !== targetRole);
    
    try {
      const { error } = await supabase
        .from('reflink_generation_settings')
        .update({ 
          allowed_target_roles: newTargetRoles,
          updated_at: new Date().toISOString()
        })
        .eq('role', settingsRole);
      
      if (error) throw error;
      
      setGenerationSettings(prev => 
        prev.map(s => s.role === settingsRole ? { ...s, allowed_target_roles: newTargetRoles } : s)
      );
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleResetAllReflinks = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.rpc('reset_all_active_reflinks');
      
      if (error) throw error;
      
      const result = data as { reset_count: number };
      setLastRefreshStats({ updated_count: result.reset_count });
      toast({
        title: 'Zresetowano',
        description: `Zresetowano ${result.reset_count} aktywnych linków (wyłączono i włączono)`,
      });
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Ładowanie...
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="settings" className="space-y-6">
      <TabsList>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="w-4 h-4" />
          Ustawienia
        </TabsTrigger>
        <TabsTrigger value="all-links" className="gap-2">
          <List className="w-4 h-4" />
          Wszystkie linki
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="space-y-6">
      {/* Global validity setting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Ważność linków afiliacyjnych
          </CardTitle>
          <CardDescription>
            Okres ważności nowo tworzonych linków przez użytkowników
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={validityDays} onValueChange={setValidityDays}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dni</SelectItem>
                <SelectItem value="60">60 dni</SelectItem>
                <SelectItem value="90">90 dni</SelectItem>
                <SelectItem value="180">180 dni</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSaveValidity} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Zapisz
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Zmiana dotyczy tylko NOWYCH linków. Istniejące linki zachowują swoją datę wygaśnięcia.
          </p>
        </CardContent>
      </Card>

      {/* Per-role generation settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Ustawienia generowania linków
          </CardTitle>
          <CardDescription>
            Określ, które role mogą tworzyć własne linki polecające
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {generationSettings.map((setting) => (
              <div key={setting.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{getRoleLabel(setting.role)}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Max {setting.max_links_per_user} linków
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`can-gen-${setting.role}`} className="text-sm">
                      Może generować
                    </Label>
                    <Switch
                      id={`can-gen-${setting.role}`}
                      checked={setting.can_generate}
                      onCheckedChange={(checked) => handleToggleCanGenerate(setting.role, checked)}
                    />
                  </div>
                </div>
                
                {setting.can_generate && (
                  <>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-2 block">Limit linków</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={setting.max_links_per_user}
                          onChange={(e) => handleUpdateMaxLinks(setting.role, parseInt(e.target.value) || 1)}
                          className="w-24"
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-2 block">Dozwolone role docelowe</Label>
                        <div className="flex flex-wrap gap-2">
                          {ALL_ROLES.map((role) => (
                            <label key={role} className="flex items-center gap-1.5 text-sm">
                              <Checkbox
                                checked={setting.allowed_target_roles.includes(role)}
                                onCheckedChange={(checked) => 
                                  handleToggleTargetRole(setting.role, role, !!checked)
                                }
                              />
                              {getRoleLabel(role)}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Global management section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Zarządzanie globalne
          </CardTitle>
          <CardDescription>
            Zresetuj wszystkie aktywne purelinki aby naprawić ewentualne problemy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleResetAllReflinks} 
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Zresetuj wszystkie aktywne linki
            </Button>
            {lastRefreshStats && (
              <Badge variant="secondary">
                Zresetowano: {lastRefreshStats.updated_count} linków
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Ta operacja wyłączy i ponownie włączy wszystkie aktywne purelinki.
            Użyj tego jeśli linki nie działają poprawnie.
          </p>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="all-links">
        <AllUserReflinksPanel />
      </TabsContent>
    </Tabs>
  );
};
