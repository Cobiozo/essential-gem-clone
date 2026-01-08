import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Save, Wrench, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import MaintenanceBanner from '@/components/MaintenanceBanner';

interface MaintenanceSettings {
  id: string;
  is_enabled: boolean;
  title: string;
  message: string;
  planned_end_time: string | null;
}

const MaintenanceModeManagement: React.FC = () => {
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [title, setTitle] = useState('Przerwa techniczna');
  const [message, setMessage] = useState('Trwają prace serwisowe. Prosimy o cierpliwość.');
  const [plannedEndTime, setPlannedEndTime] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_mode')
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setIsEnabled(data.is_enabled);
        setTitle(data.title || 'Przerwa techniczna');
        setMessage(data.message || 'Trwają prace serwisowe. Prosimy o cierpliwość.');
        setPlannedEndTime(data.planned_end_time ? 
          format(new Date(data.planned_end_time), "yyyy-MM-dd'T'HH:mm") : '');
      }
    } catch (error) {
      console.error('Error fetching maintenance settings:', error);
      toast.error('Błąd podczas pobierania ustawień serwisowych');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('maintenance_mode')
        .update({
          is_enabled: isEnabled,
          title,
          message,
          planned_end_time: plannedEndTime ? new Date(plannedEndTime).toISOString() : null,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success(isEnabled ? 
        'Tryb serwisowy włączony - strona logowania jest zablokowana' : 
        'Ustawienia zapisane');
      
      fetchSettings();
    } catch (error) {
      console.error('Error saving maintenance settings:', error);
      toast.error('Błąd podczas zapisywania ustawień');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggle = async (enabled: boolean) => {
    if (!settings?.id) return;

    setIsEnabled(enabled);
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('maintenance_mode')
        .update({
          is_enabled: enabled,
          title,
          message,
          planned_end_time: plannedEndTime ? new Date(plannedEndTime).toISOString() : null,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success(enabled ? 
        '🔧 Tryb serwisowy WŁĄCZONY - logowanie zablokowane' : 
        '✅ Tryb serwisowy WYŁĄCZONY - logowanie dostępne');
      
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      toast.error('Błąd podczas zmiany trybu');
      setIsEnabled(!enabled); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Ładowanie ustawień...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={isEnabled ? 'border-amber-500 bg-amber-500/5' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isEnabled ? 'bg-amber-500/20' : 'bg-muted'}`}>
                <Wrench className={`h-5 w-5 ${isEnabled ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <CardTitle>Tryb serwisowy</CardTitle>
                <CardDescription>
                  {isEnabled ? 
                    'Strona logowania i rejestracji jest zablokowana' : 
                    'Użytkownicy mogą się normalnie logować i rejestrować'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="maintenance-switch" className="text-sm font-medium">
                {isEnabled ? 'AKTYWNY' : 'Wyłączony'}
              </Label>
              <Switch
                id="maintenance-switch"
                checked={isEnabled}
                onCheckedChange={handleQuickToggle}
                disabled={saving}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Konfiguracja banera</CardTitle>
          <CardDescription>
            Ustaw treść i czas zakończenia prac serwisowych
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł banera</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Przerwa techniczna"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Treść komunikatu</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Trwają prace serwisowe. Prosimy o cierpliwość."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="planned-end">Planowany czas zakończenia prac</Label>
            <Input
              id="planned-end"
              type="datetime-local"
              value={plannedEndTime}
              onChange={(e) => setPlannedEndTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Pozostaw puste, jeśli czas zakończenia jest nieznany
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Podgląd
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      {isEnabled && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Uwaga!</p>
                <p className="text-sm text-muted-foreground">
                  Tryb serwisowy jest aktywny. Użytkownicy nie mogą się logować ani rejestrować.
                  Pamiętaj, aby wyłączyć tryb serwisowy po zakończeniu prac.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl">
            <Button 
              className="absolute top-4 right-4 z-[10000]" 
              variant="secondary"
              onClick={() => setShowPreview(false)}
            >
              Zamknij podgląd
            </Button>
            <MaintenanceBanner 
              maintenance={{
                title,
                message,
                planned_end_time: plannedEndTime ? new Date(plannedEndTime).toISOString() : null
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceModeManagement;
