import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Zap, Info, Eye, EyeOff, Save, TestTube } from 'lucide-react';

const PROVIDER_TEMPLATES = [
  {
    name: 'Lovable AI Gateway',
    api_url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    model: 'google/gemini-2.5-flash',
    description: 'Domyślny dostawca (wymaga LOVABLE_API_KEY)',
  },
  {
    name: 'OpenAI',
    api_url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    description: 'OpenAI API — GPT-4o, GPT-4o-mini',
  },
  {
    name: 'Google Gemini (OpenAI-compatible)',
    api_url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.5-flash',
    description: 'Google AI Studio — Gemini 2.5 Flash/Pro',
  },
  {
    name: 'Groq',
    api_url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    description: 'Groq — szybkie modele open-source',
  },
];

export const AiProviderManagement: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; time?: number } | null>(null);

  const [configId, setConfigId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState('Lovable AI Gateway');
  const [apiUrl, setApiUrl] = useState('https://ai.gateway.lovable.dev/v1/chat/completions');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [isActive, setIsActive] = useState(false);
  const [lastTestAt, setLastTestAt] = useState<string | null>(null);
  const [lastTestResult, setLastTestResult] = useState<boolean | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_provider_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfigId(data.id);
        setProviderName(data.provider_name);
        setApiUrl(data.api_url);
        setModel(data.model);
        setIsActive(data.is_active);
        setLastTestAt(data.last_test_at);
        setLastTestResult(data.last_test_result);
        setHasExistingKey(!!data.api_key_encrypted);
        setApiKey(''); // Never show encrypted key
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateName: string) => {
    const template = PROVIDER_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      setProviderName(template.name);
      setApiUrl(template.api_url);
      setModel(template.model);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        provider_name: providerName,
        api_url: apiUrl,
        model,
        is_active: isActive,
      };

      // Only update key if user provided a new one
      if (apiKey.trim()) {
        // Encrypt the API key via RPC
        const { data: encrypted, error: encryptError } = await supabase
          .rpc('encrypt_api_key', { plain_key: apiKey });
        
        if (encryptError) throw encryptError;
        updateData.api_key_encrypted = encrypted;
      }

      if (configId) {
        const { error } = await supabase
          .from('ai_provider_config')
          .update(updateData)
          .eq('id', configId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('ai_provider_config')
          .insert(updateData)
          .select()
          .single();
        if (error) throw error;
        setConfigId(data.id);
      }

      if (apiKey.trim()) {
        setHasExistingKey(true);
        setApiKey('');
      }

      toast({ title: 'Zapisano', description: 'Konfiguracja dostawcy AI została zapisana.' });
      fetchConfig();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: 'Błąd zapisu', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const testKey = apiKey.trim() || undefined;
      
      const { data, error } = await supabase.functions.invoke('test-ai-provider', {
        body: {
          api_url: apiUrl,
          api_key: testKey || 'will-use-default',
          model,
        },
      });

      if (error) throw error;

      setTestResult({
        success: data.success,
        message: data.success ? `${data.message} (${data.response_time_ms}ms)` : data.error,
        time: data.response_time_ms,
      });

      // Update test result in DB
      if (configId) {
        await supabase
          .from('ai_provider_config')
          .update({ last_test_at: new Date().toISOString(), last_test_result: data.success })
          .eq('id', configId);
        setLastTestAt(new Date().toISOString());
        setLastTestResult(data.success);
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Konfiguracja dostawcy AI
          </CardTitle>
          <CardDescription>
            Zarządzaj dostawcą API dla wszystkich funkcji AI w systemie. Domyślnie używany jest Lovable AI Gateway.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status banner */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {isActive 
                ? `Aktywny dostawca: ${providerName}. Wszystkie funkcje AI używają tego dostawcy.`
                : 'Konfiguracja nieaktywna — system używa domyślnego Lovable AI Gateway.'
              }
            </AlertDescription>
          </Alert>

          {/* Template selector */}
          <div className="space-y-2">
            <Label>Szablon dostawcy</Label>
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz szablon..." />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_TEMPLATES.map(t => (
                  <SelectItem key={t.name} value={t.name}>
                    <div className="flex flex-col">
                      <span>{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Form fields */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider-name">Nazwa dostawcy</Label>
              <Input
                id="provider-name"
                value={providerName}
                onChange={e => setProviderName(e.target.value)}
                placeholder="np. OpenAI, Google Gemini"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-url">API URL</Label>
              <Input
                id="api-url"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder="https://api.openai.com/v1/chat/completions"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">
                Klucz API
                {hasExistingKey && (
                  <Badge variant="outline" className="ml-2 text-xs">Zapisany (zaszyfrowany)</Badge>
                )}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={hasExistingKey ? '••••••• (wpisz nowy aby zmienić)' : 'sk-... lub AIza...'}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                  type="button"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Klucz jest szyfrowany w bazie danych. Puste pole = bez zmian.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="gpt-4o, gemini-2.5-flash, llama-3.3-70b-versatile"
              />
            </div>
          </div>

          <Separator />

          {/* Active switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Aktywny override</Label>
              <p className="text-sm text-muted-foreground">
                Wyłączenie przywraca domyślne korzystanie z Lovable AI Gateway
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Last test info */}
          {lastTestAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {lastTestResult ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              Ostatni test: {new Date(lastTestAt).toLocaleString('pl-PL')} — {lastTestResult ? 'sukces' : 'błąd'}
            </div>
          )}

          {/* Test result */}
          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button onClick={handleTest} disabled={testing || !apiUrl || !model} variant="outline">
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
              Testuj połączenie
            </Button>
            <Button onClick={handleSave} disabled={saving || !providerName || !apiUrl || !model}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Zapisz konfigurację
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
