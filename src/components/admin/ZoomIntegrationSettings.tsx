import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Video, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Settings2,
  Loader2,
  AlertCircle,
  Info
} from "lucide-react";

interface ZoomSettings {
  id: string;
  is_configured: boolean;
  api_status: string | null;
  last_api_check_at: string | null;
  default_waiting_room: boolean;
  default_mute_on_entry: boolean;
  default_auto_recording: string;
  default_host_email: string | null;
}

const ZoomIntegrationSettings = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ZoomSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('zoom_integration_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading Zoom settings:', error);
      }
      
      setSettings(data);
    } catch (error) {
      console.error('Error loading Zoom settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Błąd",
          description: "Musisz być zalogowany",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('zoom-check-status', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      // Add test=true query parameter by calling again
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoom-check-status?test=true`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.status === 'active') {
        toast({
          title: "Połączenie aktywne",
          description: "Integracja z Zoom API działa prawidłowo",
        });
      } else if (result.status === 'error') {
        toast({
          title: "Błąd połączenia",
          description: result.error || "Nie udało się połączyć z Zoom API",
          variant: "destructive"
        });
      } else if (result.status === 'not_configured') {
        toast({
          title: "Nieskonfigurowane",
          description: "Brak skonfigurowanych kluczy API Zoom",
          variant: "destructive"
        });
      }

      // Reload settings to get updated status
      await loadSettings();
    } catch (error) {
      console.error('Error testing Zoom connection:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się przetestować połączenia",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const saveSettings = async (updates: Partial<ZoomSettings>) => {
    if (!settings?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('zoom_integration_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings({ ...settings, ...updates });
      toast({
        title: "Zapisano",
        description: "Ustawienia Zoom zostały zaktualizowane",
      });
    } catch (error) {
      console.error('Error saving Zoom settings:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać ustawień",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = () => {
    if (!settings) return null;
    
    if (settings.api_status === 'active') {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Aktywne
        </Badge>
      );
    } else if (settings.api_status === 'error') {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Błąd
        </Badge>
      );
    } else if (settings.is_configured) {
      return (
        <Badge variant="secondary">
          <AlertCircle className="w-3 h-3 mr-1" />
          Skonfigurowane
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Info className="w-3 h-3 mr-1" />
        Nieskonfigurowane
      </Badge>
    );
  };

  const formatLastCheck = (dateStr: string | null) => {
    if (!dateStr) return "Nigdy";
    const date = new Date(dateStr);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Integration Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <CardTitle>Integracja Zoom API</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>
            Automatyczne generowanie linków do spotkań Zoom
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ostatni test połączenia:</span>
            <span>{formatLastCheck(settings?.last_api_check_at || null)}</span>
          </div>
          
          <Button 
            onClick={testConnection} 
            disabled={testing}
            variant="outline"
            className="w-full"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Testuj połączenie
          </Button>
        </CardContent>
      </Card>

      {/* Default Meeting Settings Card - only show if configured */}
      {settings?.is_configured && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle>Domyślne opcje spotkań</CardTitle>
            </div>
            <CardDescription>
              Te ustawienia będą stosowane dla nowo generowanych spotkań Zoom
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Poczekalnia włączona</Label>
                <p className="text-sm text-muted-foreground">
                  Uczestnicy muszą zostać wpuszczeni przez hosta
                </p>
              </div>
              <Switch
                checked={settings.default_waiting_room}
                onCheckedChange={(checked) => 
                  saveSettings({ default_waiting_room: checked })
                }
                disabled={saving}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Wycisz przy wejściu</Label>
                <p className="text-sm text-muted-foreground">
                  Uczestnicy są wyciszeni po dołączeniu
                </p>
              </div>
              <Switch
                checked={settings.default_mute_on_entry}
                onCheckedChange={(checked) => 
                  saveSettings({ default_mute_on_entry: checked })
                }
                disabled={saving}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Automatyczne nagrywanie</Label>
              <Select
                value={settings.default_auto_recording}
                onValueChange={(value) => 
                  saveSettings({ default_auto_recording: value })
                }
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak nagrywania</SelectItem>
                  <SelectItem value="local">Nagrywanie lokalne</SelectItem>
                  <SelectItem value="cloud">Nagrywanie w chmurze</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Domyślny email hosta</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Email konta Zoom do tworzenia spotkań (pozostaw puste aby użyć domyślnego)
              </p>
              <Input
                placeholder="email@example.com"
                value={settings.default_host_email || ''}
                onChange={(e) => 
                  saveSettings({ default_host_email: e.target.value || null })
                }
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Instructions Card - show if not configured */}
      {!settings?.is_configured && (
        <Card>
          <CardHeader>
            <CardTitle>Jak skonfigurować integrację Zoom</CardTitle>
            <CardDescription>
              Wykonaj poniższe kroki aby włączyć automatyczne generowanie linków Zoom
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>
                Przejdź do{" "}
                <a 
                  href="https://marketplace.zoom.us/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Zoom Marketplace
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Utwórz nową aplikację typu <strong>Server-to-Server OAuth</strong></li>
              <li>
                Nadaj aplikacji następujące uprawnienia (Scopes):
                <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                  <li>meeting:write:admin</li>
                  <li>meeting:read:admin</li>
                  <li>user:read:admin</li>
                </ul>
              </li>
              <li>
                Dodaj sekrety w ustawieniach Supabase Edge Functions:
                <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                  <li><code className="bg-muted px-1 rounded">ZOOM_ACCOUNT_ID</code></li>
                  <li><code className="bg-muted px-1 rounded">ZOOM_CLIENT_ID</code></li>
                  <li><code className="bg-muted px-1 rounded">ZOOM_CLIENT_SECRET</code></li>
                  <li><code className="bg-muted px-1 rounded">ZOOM_HOST_EMAIL</code> (opcjonalnie)</li>
                </ul>
              </li>
              <li>Aktywuj aplikację w Zoom Marketplace</li>
              <li>Wróć tutaj i kliknij "Testuj połączenie"</li>
            </ol>

            <Separator />

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('https://marketplace.zoom.us/', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Otwórz Zoom Marketplace
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ZoomIntegrationSettings;
