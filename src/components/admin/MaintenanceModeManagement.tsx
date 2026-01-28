import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Save, Wrench, Eye, Key, Copy, RefreshCw, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import MaintenanceBanner from '@/components/MaintenanceBanner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMultiFormProtection } from '@/hooks/useFormProtection';

interface MaintenanceSettings {
  id: string;
  is_enabled: boolean;
  title: string;
  message: string;
  planned_end_time: string | null;
  bypass_key: string | null;
}

const MaintenanceModeManagement: React.FC = () => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEnableWarning, setShowEnableWarning] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [title, setTitle] = useState(t('admin.maintenance.defaultTitle'));
  const [message, setMessage] = useState(t('admin.maintenance.defaultMessage'));
  const [plannedEndTime, setPlannedEndTime] = useState('');
  const [bypassKey, setBypassKey] = useState<string | null>(null);

  // Protect form from page refresh on tab switch
  useMultiFormProtection(showPreview, showEnableWarning);

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
        setSettings(data as MaintenanceSettings);
        setIsEnabled(data.is_enabled || false);
        setTitle(data.title || t('admin.maintenance.defaultTitle'));
        setMessage(data.message || t('admin.maintenance.defaultMessage'));
        setPlannedEndTime(data.planned_end_time ? 
          format(new Date(data.planned_end_time), "yyyy-MM-dd'T'HH:mm") : '');
        setBypassKey(data.bypass_key || null);
      }
    } catch (error) {
      console.error('Error fetching maintenance settings:', error);
      toast.error(t('admin.maintenance.fetchError'));
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
        t('admin.maintenance.enabledSuccess') : 
        t('admin.maintenance.savedSuccess'));
      
      fetchSettings();
    } catch (error) {
      console.error('Error saving maintenance settings:', error);
      toast.error(t('admin.maintenance.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const sendBypassEmail = async () => {
    setSendingEmail(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('send-maintenance-bypass-email', {
        body: { origin: window.location.origin },
      });

      if (error) throw error;

      toast.success(t('admin.maintenance.bypassEmailSent') + ': ' + data.email);
    } catch (error) {
      console.error('Error sending bypass email:', error);
      toast.error(t('admin.maintenance.bypassEmailError'));
    } finally {
      setSendingEmail(false);
    }
  };

  const regenerateBypassKey = async () => {
    if (!settings?.id) return;

    try {
      // Generate new random 32-char hex key
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const newKey = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('maintenance_mode')
        .update({ bypass_key: newKey })
        .eq('id', settings.id);

      if (error) throw error;

      setBypassKey(newKey);
      toast.success(t('admin.maintenance.bypassKeyGenerated'));
    } catch (error) {
      console.error('Error regenerating bypass key:', error);
      toast.error(t('admin.maintenance.bypassKeyError'));
    }
  };

  const copyBypassLink = () => {
    const link = `${window.location.origin}/auth?admin=${bypassKey}`;
    navigator.clipboard.writeText(link);
    toast.success(t('admin.maintenance.linkCopied'));
  };

  const handleQuickToggle = async (enabled: boolean) => {
    if (enabled) {
      // Show warning dialog before enabling
      setShowEnableWarning(true);
      return;
    }
    // Disable without warning
    await performToggle(false);
  };

  const confirmEnableMaintenance = async () => {
    setShowEnableWarning(false);
    await performToggle(true);
    
    // Automatically send bypass email after enabling
    await sendBypassEmail();
  };

  const performToggle = async (enabled: boolean) => {
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
        t('admin.maintenance.modeEnabled') : 
        t('admin.maintenance.modeDisabled'));
      
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      toast.error(t('admin.maintenance.toggleError'));
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
          <p className="mt-2 text-muted-foreground">{t('admin.maintenance.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  const bypassLink = `${window.location.origin}/auth?admin=${bypassKey}`;

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
                <CardTitle>{t('admin.maintenance.title')}</CardTitle>
                <CardDescription>
                  {isEnabled ? 
                    t('admin.maintenance.statusBlocked') : 
                    t('admin.maintenance.statusNormal')}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="maintenance-switch" className="text-sm font-medium">
                {isEnabled ? t('admin.maintenance.active') : t('admin.maintenance.inactive')}
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

      {/* Bypass Link Card - shown when enabled */}
      {isEnabled && bypassKey && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">{t('admin.maintenance.bypassLinkTitle')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('admin.maintenance.bypassLinkDescription')}
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="text-xs break-all flex-1 font-mono">
                {bypassLink}
              </code>
              <Button size="sm" variant="outline" onClick={copyBypassLink}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={sendBypassEmail} disabled={sendingEmail}>
                <Mail className="h-3 w-3 mr-1" />
                {sendingEmail ? t('admin.maintenance.sending') : t('admin.maintenance.sendToEmail')}
              </Button>
              <Button size="sm" variant="ghost" onClick={regenerateBypassKey}>
                <RefreshCw className="h-3 w-3 mr-1" />
                {t('admin.maintenance.newKey')}
              </Button>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              ✉️ {t('admin.maintenance.emailSentAutomatically')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('admin.maintenance.bannerConfigTitle')}</CardTitle>
          <CardDescription>
            {t('admin.maintenance.bannerConfigDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('admin.maintenance.bannerTitleLabel')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('admin.maintenance.defaultTitle')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t('admin.maintenance.messageLabel')}</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('admin.maintenance.defaultMessage')}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="planned-end">{t('admin.maintenance.plannedEndLabel')}</Label>
            <Input
              id="planned-end"
              type="datetime-local"
              value={plannedEndTime}
              onChange={(e) => setPlannedEndTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.maintenance.plannedEndHint')}
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('admin.maintenance.saving') : t('admin.maintenance.saveSettings')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('admin.maintenance.preview')}
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
                <p className="font-medium text-destructive">{t('admin.maintenance.warningTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('admin.maintenance.warningDescription')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enable Warning Dialog */}
      <AlertDialog open={showEnableWarning} onOpenChange={setShowEnableWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('admin.maintenance.enableWarningTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {t('admin.maintenance.enableWarningDescription')}
                </p>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    📧 {t('admin.maintenance.enableWarningEmail')}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('admin.maintenance.confirmQuestion')}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEnableMaintenance}>
              {t('admin.maintenance.confirmEnable')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl">
            <Button 
              className="absolute top-4 right-4 z-[10000]" 
              variant="secondary"
              onClick={() => setShowPreview(false)}
            >
              {t('admin.maintenance.closePreview')}
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
