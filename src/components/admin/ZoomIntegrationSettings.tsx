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
      const { data: result, error } = await supabase.functions.invoke('zoom-check-status?test=true', {
        body: {}
      });

      if (error) {
        throw error;
      }

      if (result.status === 'active') {
        toast({
          title: t('admin.zoom.connectionActive'),
          description: t('admin.zoom.connectionActiveDesc'),
        });
      } else if (result.status === 'error') {
        toast({
          title: t('admin.zoom.connectionError'),
          description: result.message || t('admin.zoom.connectionErrorDesc'),
          variant: "destructive"
        });
      } else if (result.status === 'not_configured') {
        toast({
          title: t('admin.zoom.notConfigured'),
          description: t('admin.zoom.notConfiguredDesc'),
          variant: "destructive"
        });
      }

      // Reload settings to get updated status
      await loadSettings();
    } catch (error) {
      console.error('Error testing Zoom connection:', error);
      toast({
        title: t('toast.error'),
        description: t('admin.zoom.testConnectionError'),
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
        title: t('toast.saved'),
        description: t('admin.zoom.settingsSaved'),
      });
    } catch (error) {
      console.error('Error saving Zoom settings:', error);
      toast({
        title: t('toast.error'),
        description: t('admin.zoom.settingsSaveError'),
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
          {t('admin.zoom.statusActive')}
        </Badge>
      );
    } else if (settings.api_status === 'error') {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          {t('admin.zoom.statusError')}
        </Badge>
      );
    } else if (settings.is_configured) {
      return (
        <Badge variant="secondary">
          <AlertCircle className="w-3 h-3 mr-1" />
          {t('admin.zoom.statusConfigured')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Info className="w-3 h-3 mr-1" />
        {t('admin.zoom.notConfigured')}
      </Badge>
    );
  };

  const formatLastCheck = (dateStr: string | null) => {
    if (!dateStr) return t('common.never');
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
              <CardTitle>{t('admin.zoom.title')}</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>
            {t('admin.zoom.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('admin.zoom.lastTestConnection')}</span>
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
            {t('admin.zoom.testConnection')}
          </Button>
        </CardContent>
      </Card>

      {/* Default Meeting Settings Card - only show if configured */}
      {settings?.is_configured && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle>{t('admin.zoom.defaultMeetingOptions')}</CardTitle>
            </div>
            <CardDescription>
              {t('admin.zoom.defaultMeetingOptionsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('admin.zoom.waitingRoomEnabled')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('admin.zoom.waitingRoomDesc')}
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
                <Label>{t('admin.zoom.muteOnEntry')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('admin.zoom.muteOnEntryDesc')}
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
              <Label>{t('admin.zoom.autoRecording')}</Label>
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
                  <SelectItem value="none">{t('admin.zoom.recordingNone')}</SelectItem>
                  <SelectItem value="local">{t('admin.zoom.recordingLocal')}</SelectItem>
                  <SelectItem value="cloud">{t('admin.zoom.recordingCloud')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t('admin.zoom.defaultHostEmail')}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                {t('admin.zoom.defaultHostEmailDesc')}
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
            <CardTitle>{t('admin.zoom.howToConfigure')}</CardTitle>
            <CardDescription>
              {t('admin.zoom.howToConfigureDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>
                {t('admin.zoom.step1')}{" "}
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
              <li>{t('admin.zoom.step2')} <strong>{t('admin.zoom.step2Type')}</strong></li>
              <li>
                {t('admin.zoom.step3')}
                <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                  <li>meeting:write:admin</li>
                  <li>meeting:read:admin</li>
                  <li>user:read:admin</li>
                </ul>
              </li>
              <li>
                {t('admin.zoom.step4')}
                <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                  <li><code className="bg-muted px-1 rounded">ZOOM_ACCOUNT_ID</code></li>
                  <li><code className="bg-muted px-1 rounded">ZOOM_CLIENT_ID</code></li>
                  <li><code className="bg-muted px-1 rounded">ZOOM_CLIENT_SECRET</code></li>
                  <li><code className="bg-muted px-1 rounded">ZOOM_HOST_EMAIL</code> (opcjonalnie)</li>
                </ul>
              </li>
              <li>{t('admin.zoom.step5')}</li>
              <li>{t('admin.zoom.step6')}</li>
            </ol>

            <Separator />

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('https://marketplace.zoom.us/', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {t('admin.zoom.openZoomMarketplace')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ZoomIntegrationSettings;
