import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, Shield, Lock } from 'lucide-react';
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

  const { data: settings, isLoading } = useQuery({
    queryKey: ['security-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_settings')
        .select('*');
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
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('security_settings')
          .update({
            setting_value: update.setting_value as any,
            updated_at: new Date().toISOString(),
          })
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
    setMfaRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
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
          <CardDescription>
            Konfiguracja automatycznego wykrywania współdzielenia kont
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Maksymalna liczba różnych miast w ciągu godziny</Label>
            <Input
              type="number"
              min={2}
              max={10}
              value={maxCities}
              onChange={(e) => setMaxCities(Number(e.target.value))}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Jeśli konto zaloguje się z tylu lub więcej różnych miast w ciągu godziny, zostanie oznaczone jako podejrzane.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Automatyczna blokada sesji przy anomalii</Label>
              <p className="text-xs text-muted-foreground">
                Automatycznie wyloguj użytkownika ze wszystkich urządzeń po wykryciu anomalii
              </p>
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
          <CardDescription>
            Wymuszenie MFA dla wybranych ról użytkowników
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Wymuszenie MFA</Label>
              <p className="text-xs text-muted-foreground">
                Użytkownicy z wybranymi rolami będą musieli skonfigurować MFA aby uzyskać dostęp
              </p>
            </div>
            <Switch checked={mfaEnforcement} onCheckedChange={setMfaEnforcement} />
          </div>

          {mfaEnforcement && (
            <div className="space-y-2">
              <Label>Role wymagające MFA:</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((role) => (
                  <label key={role.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={mfaRoles.includes(role.value)}
                      onCheckedChange={() => toggleMfaRole(role.value)}
                    />
                    <span className="text-sm">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Zapisz ustawienia
      </Button>
    </div>
  );
};
