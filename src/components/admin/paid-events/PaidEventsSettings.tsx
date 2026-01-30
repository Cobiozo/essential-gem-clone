import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Settings, Eye, AlertTriangle, Building } from 'lucide-react';

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency">Domyślna waluta</Label>
              <Input
                id="currency"
                value={formData.default_currency || 'PLN'}
                onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
                className="mt-1"
                maxLength={3}
              />
            </div>
            <div>
              <Label htmlFor="payu_environment">Środowisko PayU</Label>
              <Select 
                value={formData.payu_environment || 'sandbox'} 
                onValueChange={(value) => setFormData({ ...formData, payu_environment: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (testowe)</SelectItem>
                  <SelectItem value="production">Production (produkcyjne)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payu_merchant_id">PayU Merchant ID</Label>
              <Input
                id="payu_merchant_id"
                value={formData.payu_merchant_id || ''}
                onChange={(e) => setFormData({ ...formData, payu_merchant_id: e.target.value })}
                placeholder="ID sprzedawcy"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="payu_pos_id">PayU POS ID</Label>
              <Input
                id="payu_pos_id"
                value={formData.payu_pos_id || ''}
                onChange={(e) => setFormData({ ...formData, payu_pos_id: e.target.value })}
                placeholder="ID punktu płatności"
                className="mt-1"
              />
            </div>
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

      {/* PayU Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Konfiguracja PayU
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Aby płatności działały poprawnie, musisz skonfigurować następujące sekrety w Supabase:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><code className="bg-muted px-1 rounded">PAYU_CLIENT_ID</code> - ID klienta OAuth</li>
            <li><code className="bg-muted px-1 rounded">PAYU_CLIENT_SECRET</code> - Secret klienta OAuth</li>
            <li><code className="bg-muted px-1 rounded">PAYU_MERCHANT_POS_ID</code> - ID punktu płatności</li>
            <li><code className="bg-muted px-1 rounded">PAYU_SECOND_KEY</code> - Drugi klucz MD5 do weryfikacji podpisów</li>
          </ul>
          <p className="pt-2">
            <strong>Sandbox:</strong> Używaj danych z panelu testowego PayU (secure.snd.payu.com)<br />
            <strong>Produkcja:</strong> Używaj danych z panelu produkcyjnego PayU (secure.payu.com)
          </p>
        </CardContent>
      </Card>

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
