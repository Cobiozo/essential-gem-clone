import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Eye, EyeOff, PlugZap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface PayUSettings {
  pos_id: string;
  client_id: string;
  client_secret: string;
  md5_key: string;
  second_md5_key: string;
  environment: 'sandbox' | 'production';
  is_enabled: boolean;
  notes: string;
}

const empty: PayUSettings = {
  pos_id: '', client_id: '', client_secret: '', md5_key: '',
  second_md5_key: '', environment: 'sandbox', is_enabled: false, notes: '',
};

const PaymentsAdminPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showMd5, setShowMd5] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<PayUSettings>(empty);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('payu_settings')
        .select('id, pos_id, client_id, client_secret, md5_key, second_md5_key, environment, is_enabled, notes')
        .limit(1)
        .maybeSingle();
      if (error) toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      if (data) {
        setRowId(data.id);
        setSettings({
          pos_id: data.pos_id || '',
          client_id: data.client_id || '',
          client_secret: data.client_secret || '',
          md5_key: data.md5_key || '',
          second_md5_key: data.second_md5_key || '',
          environment: (data.environment as any) || 'sandbox',
          is_enabled: !!data.is_enabled,
          notes: data.notes || '',
        });
      }
      setLoading(false);
    })();
  }, [toast]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const save = async () => {
    setSaving(true);
    try {
      if (!rowId) {
        const { data, error } = await supabase.from('payu_settings').insert(settings).select('id').single();
        if (error) throw error;
        setRowId(data.id);
      } else {
        const { error } = await supabase.from('payu_settings').update(settings).eq('id', rowId);
        if (error) throw error;
      }
      toast({ title: 'Zapisano ustawienia PayU' });
    } catch (e: any) {
      toast({ title: 'Błąd zapisu', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true); setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('payu-test-connection');
      if (error) throw error;
      if (data?.ok) {
        setTestResult({ ok: true, message: `Połączono ze środowiskiem: ${data.environment}` });
      } else {
        setTestResult({ ok: false, message: data?.error || 'Nieznany błąd' });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    } finally { setTesting(false); }
  };

  const fullyConfigured = settings.pos_id && settings.client_id && settings.client_secret && settings.md5_key;

  if (loading) {
    return <DashboardLayout backTo={{ label: 'Panel admina', path: '/admin' }}>
      <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
    </DashboardLayout>;
  }

  return (
    <DashboardLayout backTo={{ label: 'Panel admina', path: '/admin' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PlugZap className="w-6 h-6 text-primary" />
            Ustawienia płatności PayU
          </h1>
          <p className="text-muted-foreground mt-1">
            Wprowadź dane z panelu PayU (POS). Sandbox służy do testów — produkcja do prawdziwych płatności.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Status integracji</CardTitle>
            <Badge variant={fullyConfigured ? 'default' : 'secondary'}>
              {fullyConfigured ? '✅ Skonfigurowane' : '⚠️ Brak danych'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 border rounded-md">
              <div>
                <div className="font-medium text-sm">Włącz płatności PayU na platformie</div>
                <p className="text-xs text-muted-foreground">Gdy wyłączone — opcja PayU znika z checkoutu mimo poprawnej konfiguracji.</p>
              </div>
              <Switch checked={settings.is_enabled} onCheckedChange={(v) => setSettings({ ...settings, is_enabled: v })} />
            </div>

            <div>
              <Label>Środowisko *</Label>
              <Select value={settings.environment} onValueChange={(v: any) => setSettings({ ...settings, environment: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (testy)</SelectItem>
                  <SelectItem value="production">Produkcja (prawdziwe płatności)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>POS ID *</Label>
                <Input value={settings.pos_id} onChange={(e) => setSettings({ ...settings, pos_id: e.target.value.trim() })} placeholder="np. 145227" />
              </div>
              <div>
                <Label>Client ID *</Label>
                <Input value={settings.client_id} onChange={(e) => setSettings({ ...settings, client_id: e.target.value.trim() })} placeholder="OAuth Client ID" />
              </div>
            </div>

            <div>
              <Label>Client Secret *</Label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={settings.client_secret}
                  onChange={(e) => setSettings({ ...settings, client_secret: e.target.value.trim() })}
                  placeholder="OAuth Client Secret"
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowSecret(!showSecret)}>
                  {showSecret ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Klucz MD5 (drugi klucz / signature key) *</Label>
              <div className="relative">
                <Input
                  type={showMd5 ? 'text' : 'password'}
                  value={settings.md5_key}
                  onChange={(e) => setSettings({ ...settings, md5_key: e.target.value.trim() })}
                  placeholder="Klucz do podpisów (weryfikacja webhooków)"
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowMd5(!showMd5)}>
                  {showMd5 ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Drugi klucz MD5 (opcjonalnie)</Label>
              <Input
                value={settings.second_md5_key}
                onChange={(e) => setSettings({ ...settings, second_md5_key: e.target.value.trim() })}
                placeholder="Używany przy rotacji kluczy"
              />
            </div>

            <div>
              <Label>Notatki wewnętrzne</Label>
              <Input value={settings.notes} onChange={(e) => setSettings({ ...settings, notes: e.target.value })} placeholder="np. data ostatniej rotacji klucza" />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Zapisz
              </Button>
              <Button variant="outline" onClick={test} disabled={testing || !fullyConfigured}>
                {testing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlugZap className="w-4 h-4 mr-1" />}
                Testuj połączenie
              </Button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-md text-sm flex items-start gap-2 ${testResult.ok ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>
                {testResult.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Gdzie znaleźć dane?</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>1. Zaloguj się do panelu <a className="underline" target="_blank" rel="noreferrer" href="https://secure.payu.com">PayU Merchant</a> (lub <a className="underline" target="_blank" rel="noreferrer" href="https://secure.snd.payu.com">sandbox</a>).</p>
            <p>2. Wejdź w <strong>Punkt płatności (POS)</strong> → skopiuj <strong>POS ID</strong>, <strong>Client ID</strong>, <strong>Client Secret</strong> i <strong>Drugi klucz (MD5)</strong>.</p>
            <p>3. W konfiguracji PowiadomieŃ ustaw URL: <code className="bg-muted px-1 rounded">{import.meta.env.VITE_SUPABASE_URL}/functions/v1/payu-webhook</code></p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentsAdminPage;
