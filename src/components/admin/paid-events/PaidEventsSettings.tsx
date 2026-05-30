import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, Settings, Eye, EyeOff, Building, PlugZap, CheckCircle2, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PaidEventsUserOverrides } from './PaidEventsUserOverrides';

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
interface TestState {
  ok: boolean;
  message: string;
  testedAt: string | null;
  environment?: string;
}
const emptyPayU: PayUSettings = {
  pos_id: '', client_id: '', client_secret: '', md5_key: '',
  second_md5_key: '', environment: 'sandbox', is_enabled: false, notes: '',
};

const PayUConfigCard: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);
  const [showMd5, setShowMd5] = React.useState(false);
  const [rowId, setRowId] = React.useState<string | null>(null);
  const [settings, setSettings] = React.useState<PayUSettings>(emptyPayU);
  const [testState, setTestState] = React.useState<TestState | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('payu_settings')
        .select('id, pos_id, client_id, client_secret, md5_key, second_md5_key, environment, is_enabled, notes, last_test_at, last_test_ok, last_test_message')
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
        if (data.last_test_at) {
          setTestState({
            ok: !!data.last_test_ok,
            message: data.last_test_message || '',
            testedAt: data.last_test_at,
            environment: data.environment || undefined,
          });
        }
      }
      setLoading(false);
    })();
  }, [toast]);

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
      toast({ title: 'Zapisano konfigurację PayU' });
    } catch (e: any) {
      toast({ title: 'Błąd zapisu', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('payu-test-connection');
      if (error) throw error;
      const testedAt = data?.tested_at || new Date().toISOString();
      if (data?.ok) {
        setTestState({ ok: true, message: data?.message || `Połączono ze środowiskiem: ${data.environment}`, testedAt, environment: data.environment });
        toast({ title: 'Test PayU OK', description: `Środowisko: ${data.environment}` });
      } else {
        setTestState({ ok: false, message: data?.error || data?.message || 'Nieznany błąd', testedAt });
        toast({ title: 'Test PayU nie powiódł się', description: data?.error || 'Sprawdź dane', variant: 'destructive' });
      }
    } catch (e: any) {
      setTestState({ ok: false, message: e.message, testedAt: new Date().toISOString() });
      toast({ title: 'Błąd testu', description: e.message, variant: 'destructive' });
    } finally { setTesting(false); }
  };

  const fullyConfigured = !!(settings.pos_id && settings.client_id && settings.client_secret && settings.md5_key);
  const canEnable = fullyConfigured && testState?.ok === true;
  const badge = () => {
    if (!fullyConfigured) return <Badge variant="secondary">⚠️ Brak danych</Badge>;
    if (!testState) return <Badge variant="outline">Skonfigurowane — nieprzetestowane</Badge>;
    if (testState.ok) return <Badge className="bg-emerald-500 hover:bg-emerald-500/90">✅ Aktywne</Badge>;
    return <Badge variant="destructive">❌ Test nieudany</Badge>;
  };

  if (loading) {
    return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><PlugZap className="w-5 h-5" /> Konfiguracja PayU</CardTitle>
          <CardDescription>Dane z panelu PayU (POS). Po wpisaniu wykonaj test połączenia.</CardDescription>
        </div>
        {badge()}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 p-3 border rounded-md">
          <div>
            <div className="font-medium text-sm">Włącz płatności PayU na platformie</div>
            <p className="text-xs text-muted-foreground">
              {canEnable ? 'Klienci mogą wybrać PayU/BLIK podczas zakupu biletu.' : 'Najpierw uzupełnij dane i wykonaj udany test połączenia.'}
            </p>
          </div>
          <Switch
            checked={settings.is_enabled}
            disabled={!canEnable}
            onCheckedChange={(v) => setSettings({ ...settings, is_enabled: v })}
          />
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
            <Input className="mt-1" value={settings.pos_id} onChange={(e) => setSettings({ ...settings, pos_id: e.target.value.trim() })} placeholder="np. 145227" />
          </div>
          <div>
            <Label>Client ID *</Label>
            <Input className="mt-1" value={settings.client_id} onChange={(e) => setSettings({ ...settings, client_id: e.target.value.trim() })} placeholder="OAuth Client ID" />
          </div>
        </div>

        <div>
          <Label>Client Secret *</Label>
          <div className="relative mt-1">
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
          <Label>Klucz MD5 (signature key) *</Label>
          <div className="relative mt-1">
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
          <Input className="mt-1" value={settings.second_md5_key} onChange={(e) => setSettings({ ...settings, second_md5_key: e.target.value.trim() })} placeholder="Używany przy rotacji kluczy" />
        </div>

        <div>
          <Label>Notatki wewnętrzne</Label>
          <Input className="mt-1" value={settings.notes} onChange={(e) => setSettings({ ...settings, notes: e.target.value })} placeholder="np. data ostatniej rotacji klucza" />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={save} disabled={saving} variant="outline">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Zapisz konfigurację PayU
          </Button>
          <Button onClick={test} disabled={testing || !fullyConfigured} title={!fullyConfigured ? 'Uzupełnij wszystkie wymagane pola' : ''}>
            {testing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlugZap className="w-4 h-4 mr-1" />}
            Testuj połączenie PayU
          </Button>
        </div>

        {testState && (
          <div className={`p-4 rounded-md border text-sm space-y-2 ${testState.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
            <div className="flex items-start gap-2">
              {testState.ok ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />}
              <div className="flex-1">
                <div className="font-semibold">{testState.ok ? 'Połączenie z PayU działa' : 'Połączenie z PayU nie powiodło się'}</div>
                <div className="opacity-90 break-words">{testState.message}</div>
                {testState.environment && (<div className="text-xs opacity-75 mt-1">Środowisko: <strong>{testState.environment}</strong></div>)}
              </div>
            </div>
            {testState.testedAt && (
              <div className="flex items-center gap-1.5 text-xs opacity-80 pt-1 border-t border-current/10">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Ostatni test:{' '}
                  <strong>{format(new Date(testState.testedAt), 'd MMM yyyy, HH:mm:ss', { locale: pl })}</strong>{' '}
                  ({formatDistanceToNow(new Date(testState.testedAt), { addSuffix: true, locale: pl })})
                </span>
              </div>
            )}
          </div>
        )}
        {!testState && fullyConfigured && (
          <div className="p-3 rounded-md border border-dashed text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Brak historii testu — kliknij „Testuj połączenie PayU”.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface PaidEventsSettingsData {
  id: string;
  is_enabled: boolean;
  default_currency: string | null;
  payu_environment: string | null;
  payu_merchant_id: string | null;
  payu_pos_id: string | null;
  company_name: string | null;
  company_nip: string | null;
  company_address: string | null;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_client: boolean;
  visible_to_specjalista: boolean;
}

export const PaidEventsSettings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['paid-events-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_events_settings')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Return default if no settings exist
      if (!data) {
        return {
          id: '',
          is_enabled: true,
          default_currency: 'PLN',
          payu_environment: 'sandbox',
          payu_merchant_id: null,
          payu_pos_id: null,
          company_name: null,
          company_nip: null,
          company_address: null,
          visible_to_admin: true,
          visible_to_partner: true,
          visible_to_client: true,
          visible_to_specjalista: true,
        } as PaidEventsSettingsData;
      }
      
      return data as PaidEventsSettingsData;
    },
  });

  const [formData, setFormData] = React.useState<Partial<PaidEventsSettingsData>>({});

  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PaidEventsSettingsData>) => {
      if (settings?.id) {
        const { error } = await supabase
          .from('paid_events_settings')
          .update(data)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('paid_events_settings')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-events-settings'] });
      toast({ title: 'Ustawienia zapisane' });
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Ustawienia ogólne
          </CardTitle>
          <CardDescription>
            Globalne ustawienia modułu płatnych wydarzeń
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Moduł aktywny</Label>
              <p className="text-sm text-muted-foreground">
                Włącz lub wyłącz cały moduł płatnych wydarzeń
              </p>
            </div>
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
            />
          </div>

          <div>
            <Label htmlFor="currency">Domyślna waluta</Label>
            <Input
              id="currency"
              value={formData.default_currency || 'PLN'}
              onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
              className="mt-1 max-w-[160px]"
              maxLength={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Dane firmy
          </CardTitle>
          <CardDescription>
            Informacje widoczne na biletach i fakturach
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company_name">Nazwa firmy</Label>
            <Input
              id="company_name"
              value={formData.company_name || ''}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Nazwa organizatora"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_nip">NIP</Label>
              <Input
                id="company_nip"
                value={formData.company_nip || ''}
                onChange={(e) => setFormData({ ...formData, company_nip: e.target.value })}
                placeholder="1234567890"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="company_address">Adres</Label>
              <Input
                id="company_address"
                value={formData.company_address || ''}
                onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                placeholder="ul. Przykładowa 1, 00-000 Miasto"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Widoczność modułu
          </CardTitle>
          <CardDescription>
            Określ, które role mogą widzieć moduł płatnych wydarzeń
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.visible_to_admin}
                onCheckedChange={(checked) => setFormData({ ...formData, visible_to_admin: checked })}
              />
              <Label>Administratorzy</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.visible_to_partner}
                onCheckedChange={(checked) => setFormData({ ...formData, visible_to_partner: checked })}
              />
              <Label>Partnerzy</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.visible_to_specjalista}
                onCheckedChange={(checked) => setFormData({ ...formData, visible_to_specjalista: checked })}
              />
              <Label>Specjaliści</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.visible_to_client}
                onCheckedChange={(checked) => setFormData({ ...formData, visible_to_client: checked })}
              />
              <Label>Klienci</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-user visibility overrides */}
      <PaidEventsUserOverrides />

      {/* PayU full configuration (writes to payu_settings) */}
      <PayUConfigCard />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz ustawienia'}
        </Button>
      </div>
    </div>
  );
};
