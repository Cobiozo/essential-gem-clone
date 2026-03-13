import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Shield, Lock, Mail, Send, FileText } from 'lucide-react';
import { MfaExemptionSection } from './MfaExemptionSection';
import { useToast } from '@/hooks/use-toast';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'partner', label: 'Partner' },
  { value: 'specjalista', label: 'Specjalista' },
  { value: 'client', label: 'Klient' },
];

export const SecuritySettings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [maxCities, setMaxCities] = useState(3);
  const [autoBlock, setAutoBlock] = useState(true);
  const [mfaEnforcement, setMfaEnforcement] = useState(false);
  const [mfaRoles, setMfaRoles] = useState<string[]>([]);
  const [mfaMethod, setMfaMethod] = useState('totp');
  const [reportEnabled, setReportEnabled] = useState(false);
  const [reportEmail, setReportEmail] = useState('');
  const [reportFrequency, setReportFrequency] = useState('weekly');
  const [sendingTestReport, setSendingTestReport] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['security-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('security_settings').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (settings) {
      for (const s of settings) {
        switch (s.setting_key) {
          case 'max_cities_per_hour':
            setMaxCities(Number(s.setting_value) || 3);
            break;
          case 'auto_block_on_anomaly':
            setAutoBlock(s.setting_value === true);
            break;
          case 'mfa_enforcement':
            setMfaEnforcement(s.setting_value === true);
            break;
          case 'mfa_required_roles':
            setMfaRoles(Array.isArray(s.setting_value) ? (s.setting_value as string[]) : []);
            break;
          case 'mfa_method':
            setMfaMethod(typeof s.setting_value === 'string' ? s.setting_value : 'totp');
            break;
          case 'report_enabled':
            setReportEnabled(s.setting_value === true);
            break;
          case 'report_email':
            setReportEmail(typeof s.setting_value === 'string' ? s.setting_value : '');
            break;
          case 'report_frequency':
            setReportFrequency(typeof s.setting_value === 'string' ? s.setting_value : 'weekly');
            break;
        }
      }
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { setting_key: 'max_cities_per_hour', setting_value: maxCities },
        { setting_key: 'auto_block_on_anomaly', setting_value: autoBlock },
        { setting_key: 'mfa_enforcement', setting_value: mfaEnforcement },
        { setting_key: 'mfa_required_roles', setting_value: mfaRoles },
        { setting_key: 'mfa_method', setting_value: mfaMethod },
        { setting_key: 'report_enabled', setting_value: reportEnabled },
        { setting_key: 'report_email', setting_value: reportEmail },
        { setting_key: 'report_frequency', setting_value: reportFrequency },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('security_settings')
          .update({ setting_value: update.setting_value as any, updated_at: new Date().toISOString() })
          .eq('setting_key', update.setting_key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
      toast({ title: 'Ustawienia zapisane' });
    },
    onError: (error: any) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  const toggleMfaRole = (role: string) => {
    setMfaRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const sendTestReport = async () => {
    if (!reportEmail) {
      toast({ title: 'Błąd', description: 'Podaj adres email', variant: 'destructive' });
      return;
    }
    setSendingTestReport(true);
    try {
      const { error } = await supabase.functions.invoke('send-security-report', {
        body: { email: reportEmail },
      });
      if (error) throw error;
      toast({ title: 'Raport wysłany', description: `Raport testowy został wysłany na ${reportEmail}` });
    } catch (error: any) {
      toast({ title: 'Błąd wysyłki', description: error.message, variant: 'destructive' });
    } finally {
      setSendingTestReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Anomaly Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Detekcja anomalii
          </CardTitle>
          <CardDescription>Konfiguracja automatycznego wykrywania współdzielenia kont</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Maksymalna liczba różnych miast w ciągu godziny</Label>
            <Input type="number" min={2} max={10} value={maxCities} onChange={(e) => setMaxCities(Number(e.target.value))} className="w-32" />
            <p className="text-xs text-muted-foreground">
              Jeśli konto zaloguje się z tylu lub więcej różnych miast w ciągu godziny, zostanie oznaczone jako podejrzane.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatyczna blokada sesji przy anomalii</Label>
              <p className="text-xs text-muted-foreground">Automatycznie wyloguj użytkownika ze wszystkich urządzeń po wykryciu anomalii</p>
            </div>
            <Switch checked={autoBlock} onCheckedChange={setAutoBlock} />
          </div>
        </CardContent>
      </Card>

      {/* MFA Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Uwierzytelnianie dwuskładnikowe (MFA)
          </CardTitle>
          <CardDescription>Wymuszenie MFA i wybór metody weryfikacji</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Wymuszenie MFA</Label>
              <p className="text-xs text-muted-foreground">
                Użytkownicy z wybranymi rolami będą musieli skonfigurować MFA
              </p>
            </div>
            <Switch checked={mfaEnforcement} onCheckedChange={setMfaEnforcement} />
          </div>

          {mfaEnforcement && (
            <>
              {/* MFA Method selection */}
              <div className="space-y-3">
                <Label className="font-medium">Metoda weryfikacji</Label>
                <RadioGroup value={mfaMethod} onValueChange={setMfaMethod} className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="email" id="mfa-email" />
                    <Label htmlFor="mfa-email" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="font-medium">Kod email</div>
                        <div className="text-xs text-muted-foreground">6-cyfrowy kod wysyłany na adres email użytkownika</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="totp" id="mfa-totp" />
                    <Label htmlFor="mfa-totp" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Lock className="w-4 h-4 text-green-500" />
                      <div>
                        <div className="font-medium">Aplikacja Authenticator</div>
                        <div className="text-xs text-muted-foreground">Google Authenticator, Authy, Microsoft Authenticator</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="both" id="mfa-both" />
                    <Label htmlFor="mfa-both" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Shield className="w-4 h-4 text-purple-500" />
                      <div>
                        <div className="font-medium">Obie metody</div>
                        <div className="text-xs text-muted-foreground">Użytkownik wybiera preferowaną metodę przy logowaniu</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Roles requiring MFA */}
              <div className="space-y-2">
                <Label>Role wymagające MFA:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <label key={role.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={mfaRoles.includes(role.value)} onCheckedChange={() => toggleMfaRole(role.value)} />
                      <span className="text-sm">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Raporty bezpieczeństwa
          </CardTitle>
          <CardDescription>Automatyczne raporty ze statystykami bezpieczeństwa wysyłane na email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Włącz automatyczne raporty</Label>
              <p className="text-xs text-muted-foreground">Raporty będą wysyłane z wybraną częstotliwością</p>
            </div>
            <Switch checked={reportEnabled} onCheckedChange={setReportEnabled} />
          </div>

          <div className="space-y-2">
            <Label>Adres email na raporty</Label>
            <Input
              type="email"
              placeholder="admin@firma.pl"
              value={reportEmail}
              onChange={(e) => setReportEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Częstotliwość</Label>
            <Select value={reportFrequency} onValueChange={setReportFrequency}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Codziennie</SelectItem>
                <SelectItem value="weekly">Co tydzień</SelectItem>
                <SelectItem value="monthly">Co miesiąc</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={sendTestReport} disabled={sendingTestReport || !reportEmail}>
            {sendingTestReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Wyślij raport testowy
          </Button>
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Zapisz ustawienia
      </Button>
    </div>
  );
};
