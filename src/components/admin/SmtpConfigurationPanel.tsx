import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  Server, 
  Lock, 
  User, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Save, 
  TestTube,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';

interface SmtpSettings {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: string;
  smtp_username: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
  is_active: boolean;
  last_test_at: string | null;
  last_test_result: boolean | null;
  last_test_message: string | null;
}

export const SmtpConfigurationPanel: React.FC = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const encryptionOptions = [
    { value: 'ssl', label: t('admin.smtp.encryptionSsl'), port: 465 },
    { value: 'tls', label: t('admin.smtp.encryptionTls'), port: 587 },
    { value: 'none', label: t('admin.smtp.encryptionNone'), port: 25 },
  ];

  const [settings, setSettings] = useState<SmtpSettings>({
    id: '',
    smtp_host: '',
    smtp_port: 465,
    smtp_encryption: 'ssl',
    smtp_username: '',
    smtp_password: '',
    sender_email: '',
    sender_name: '',
    is_active: true,
    last_test_at: null,
    last_test_result: null,
    last_test_message: null,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching SMTP settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEncryptionChange = (encryption: string) => {
    const option = encryptionOptions.find(o => o.value === encryption);
    setSettings(prev => ({
      ...prev,
      smtp_encryption: encryption,
      smtp_port: option?.port || prev.smtp_port
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id, last_test_at, last_test_result, last_test_message, ...updateData } = settings;
      
      if (id) {
        const { error } = await supabase
          .from('smtp_settings')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('smtp_settings')
          .insert(updateData)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSettings(prev => ({ ...prev, id: data.id }));
        }
      }

      toast({
        title: t('toast.success'),
        description: t('admin.smtp.settingsSaved'),
      });
    } catch (error: any) {
      console.error('Error saving SMTP settings:', error);
      toast({
        title: t('toast.error'),
        description: error.message || t('admin.smtp.settingsSaveError'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.smtp_host || !settings.smtp_username || !settings.sender_email) {
      toast({
        title: t('common.warning'),
        description: t('admin.smtp.fillRequiredFields'),
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    try {
      // First save the settings
      await handleSave();

      // Call edge function to test SMTP connection
      const { data, error } = await supabase.functions.invoke('test-smtp-connection', {
        body: {
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          smtp_encryption: settings.smtp_encryption,
          smtp_username: settings.smtp_username,
          smtp_password: settings.smtp_password,
          sender_email: settings.sender_email,
          sender_name: settings.sender_name,
        }
      });

      if (error) throw error;

      const testResult = data?.success ?? false;
      const testMessage = data?.message || (testResult ? t('toast.testConnectionSuccess') : t('toast.testConnectionError'));

      // Update test results in database
      if (settings.id) {
        await supabase
          .from('smtp_settings')
          .update({
            last_test_at: new Date().toISOString(),
            last_test_result: testResult,
            last_test_message: testMessage,
          })
          .eq('id', settings.id);

        setSettings(prev => ({
          ...prev,
          last_test_at: new Date().toISOString(),
          last_test_result: testResult,
          last_test_message: testMessage,
        }));
      }

      toast({
        title: testResult ? t('toast.success') : t('toast.error'),
        description: testMessage,
        variant: testResult ? 'default' : 'destructive',
      });
    } catch (error: any) {
      console.error('Error testing SMTP:', error);
      
      const errorMessage = error.message || t('admin.smtp.testError');
      
      if (settings.id) {
        await supabase
          .from('smtp_settings')
          .update({
            last_test_at: new Date().toISOString(),
            last_test_result: false,
            last_test_message: errorMessage,
          })
          .eq('id', settings.id);

        setSettings(prev => ({
          ...prev,
          last_test_at: new Date().toISOString(),
          last_test_result: false,
          last_test_message: errorMessage,
        }));
      }

      toast({
        title: t('toast.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {t('admin.smtp.title')}
            </CardTitle>
            <CardDescription>
              {t('admin.smtp.description')}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSettings}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        {settings.last_test_at && (
          <Alert variant={settings.last_test_result ? 'default' : 'destructive'}>
            <div className="flex items-center gap-2">
              {settings.last_test_result ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <div>
                <AlertTitle className="flex items-center gap-2">
                  {settings.last_test_result ? t('admin.smtp.connectionWorks') : t('admin.smtp.connectionError')}
                  <Badge variant={settings.last_test_result ? 'default' : 'destructive'} className="text-xs">
                    {new Date(settings.last_test_at).toLocaleString('pl-PL')}
                  </Badge>
                </AlertTitle>
                <AlertDescription>
                  {settings.last_test_message || (settings.last_test_result 
                    ? `${t('admin.smtp.testEmailSent')} ${settings.sender_email}` 
                    : t('admin.smtp.checkSettings'))}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {/* SMTP Settings Form */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Host SMTP */}
          <div className="space-y-2">
            <Label htmlFor="smtp_host" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              {t('admin.smtp.smtpHost')}
            </Label>
            <Input
              id="smtp_host"
              placeholder={t('admin.smtp.smtpHostPlaceholder')}
              value={settings.smtp_host}
              onChange={(e) => setSettings(prev => ({ ...prev, smtp_host: e.target.value }))}
            />
          </div>

          {/* Port */}
          <div className="space-y-2">
            <Label htmlFor="smtp_port">{t('admin.smtp.port')}</Label>
            <Input
              id="smtp_port"
              type="number"
              placeholder="465"
              value={settings.smtp_port}
              onChange={(e) => setSettings(prev => ({ ...prev, smtp_port: parseInt(e.target.value) || 465 }))}
            />
          </div>

          {/* Encryption */}
          <div className="space-y-2">
            <Label htmlFor="smtp_encryption" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {t('admin.smtp.encryption')}
            </Label>
            <Select
              value={settings.smtp_encryption}
              onValueChange={handleEncryptionChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('admin.smtp.selectEncryption')} />
              </SelectTrigger>
              <SelectContent>
                {encryptionOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="smtp_username" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('admin.smtp.username')}
            </Label>
            <Input
              id="smtp_username"
              placeholder={t('admin.smtp.usernamePlaceholder')}
              value={settings.smtp_username}
              onChange={(e) => setSettings(prev => ({ ...prev, smtp_username: e.target.value }))}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="smtp_password">{t('admin.smtp.password')}</Label>
            <div className="relative">
              <Input
                id="smtp_password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={settings.smtp_password}
                onChange={(e) => setSettings(prev => ({ ...prev, smtp_password: e.target.value }))}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" />
              {t('admin.smtp.gmailAppPassword')}
            </p>
          </div>

          {/* Sender Email */}
          <div className="space-y-2">
            <Label htmlFor="sender_email">{t('admin.smtp.senderEmail')}</Label>
            <Input
              id="sender_email"
              type="email"
              placeholder={t('admin.smtp.senderEmailPlaceholder')}
              value={settings.sender_email}
              onChange={(e) => setSettings(prev => ({ ...prev, sender_email: e.target.value }))}
            />
          </div>
        </div>

        {/* Sender Name - full width */}
        <div className="space-y-2">
          <Label htmlFor="sender_name">{t('admin.smtp.senderName')}</Label>
          <Input
            id="sender_name"
            placeholder={t('admin.smtp.senderNamePlaceholder')}
            value={settings.sender_name}
            onChange={(e) => setSettings(prev => ({ ...prev, sender_name: e.target.value }))}
          />
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || !settings.smtp_host}
          >
            {testing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4 mr-2" />
            )}
            {t('admin.smtp.testConnection')}
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t('admin.smtp.saveSettings')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmtpConfigurationPanel;
