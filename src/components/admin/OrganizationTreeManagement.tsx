import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, TreePine, Users, Eye, Settings, Layout } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganizationTreeSettings, OrganizationTreeSettings } from '@/hooks/useOrganizationTreeSettings';

export const OrganizationTreeManagement: React.FC = () => {
  const { settings, loading, updateSettings, refetch } = useOrganizationTreeSettings();
  const [localSettings, setLocalSettings] = useState<Partial<OrganizationTreeSettings>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleChange = <K extends keyof OrganizationTreeSettings>(
    key: K,
    value: OrganizationTreeSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateSettings(localSettings);
    setSaving(false);

    if (result.success) {
      toast.success('Ustawienia zapisane pomyślnie');
      setHasChanges(false);
    } else {
      toast.error(result.error || 'Błąd podczas zapisywania');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TreePine className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Struktura organizacji</CardTitle>
              <CardDescription>
                Konfiguracja wizualnego drzewa struktury zespołu dla użytkowników
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="is_enabled" className="text-base font-medium">
                Funkcja aktywna
              </Label>
              <p className="text-sm text-muted-foreground">
                Włącz lub wyłącz strukturę organizacji dla użytkowników
              </p>
            </div>
            <Switch
              id="is_enabled"
              checked={localSettings.is_enabled ?? true}
              onCheckedChange={(checked) => handleChange('is_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accordion settings */}
      <Accordion type="multiple" defaultValue={['access', 'data', 'params', 'graph']} className="space-y-4">
        {/* Access settings */}
        <AccordionItem value="access" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Dostęp do funkcji</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="flex items-center gap-2">
                    Administratorzy
                    <Badge variant="outline" className="text-xs">zawsze aktywne</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Administratorzy zawsze mają pełny dostęp do struktury
                  </p>
                </div>
                <Switch
                  checked={true}
                  disabled={true}
                  className="opacity-50"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Klienci</Label>
                  <p className="text-sm text-muted-foreground">
                    Czy klienci mogą widzieć swoją strukturę
                  </p>
                </div>
                <Switch
                  checked={localSettings.visible_to_clients ?? false}
                  onCheckedChange={(checked) => handleChange('visible_to_clients', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Partnerzy</Label>
                  <p className="text-sm text-muted-foreground">
                    Czy partnerzy mogą widzieć swoją organizację
                  </p>
                </div>
                <Switch
                  checked={localSettings.visible_to_partners ?? true}
                  onCheckedChange={(checked) => handleChange('visible_to_partners', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Specjaliści</Label>
                  <p className="text-sm text-muted-foreground">
                    Czy specjaliści mogą widzieć strukturę
                  </p>
                </div>
                <Switch
                  checked={localSettings.visible_to_specjalista ?? true}
                  onCheckedChange={(checked) => handleChange('visible_to_specjalista', checked)}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Data visibility settings */}
        <AccordionItem value="data" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>Widoczność danych w węzłach</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                <Label>Avatar / Inicjały</Label>
                <Switch
                  checked={localSettings.show_avatar ?? true}
                  onCheckedChange={(checked) => handleChange('show_avatar', checked)}
                />
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                <Label>Badge roli</Label>
                <Switch
                  checked={localSettings.show_role_badge ?? true}
                  onCheckedChange={(checked) => handleChange('show_role_badge', checked)}
                />
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                <Label>EQID</Label>
                <Switch
                  checked={localSettings.show_eq_id ?? false}
                  onCheckedChange={(checked) => handleChange('show_eq_id', checked)}
                />
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                <Label>Email</Label>
                <Switch
                  checked={localSettings.show_email ?? false}
                  onCheckedChange={(checked) => handleChange('show_email', checked)}
                />
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                <Label>Telefon</Label>
                <Switch
                  checked={localSettings.show_phone ?? false}
                  onCheckedChange={(checked) => handleChange('show_phone', checked)}
                />
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                <Label>Statystyki gałęzi</Label>
                <Switch
                  checked={localSettings.show_statistics ?? true}
                  onCheckedChange={(checked) => handleChange('show_statistics', checked)}
                />
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                <Label>Opiekun (upline)</Label>
                <Switch
                  checked={localSettings.show_upline ?? true}
                  onCheckedChange={(checked) => handleChange('show_upline', checked)}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Tree parameters */}
        <AccordionItem value="params" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Parametry drzewa</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Domyślny widok</Label>
                  <Select
                    value={localSettings.default_view ?? 'list'}
                    onValueChange={(value) => handleChange('default_view', value as 'list' | 'graph')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="list">Lista (accordion)</SelectItem>
                      <SelectItem value="graph">Graf wizualny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Maksymalna głębokość globalna</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={localSettings.max_depth ?? 10}
                    onChange={(e) => handleChange('max_depth', parseInt(e.target.value) || 10)}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-base font-medium">Maksymalna głębokość per rola</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Określ ile poziomów w dół może widzieć każda rola (0 = tylko siebie)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500">Partner</Badge>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={localSettings.partner_max_depth ?? 10}
                      onChange={(e) => handleChange('partner_max_depth', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-500">Specjalista</Badge>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={localSettings.specjalista_max_depth ?? 5}
                      onChange={(e) => handleChange('specjalista_max_depth', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500">Klient</Badge>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={localSettings.client_max_depth ?? 0}
                      onChange={(e) => handleChange('client_max_depth', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Graph settings */}
        <AccordionItem value="graph" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              <span>Ustawienia widoku graficznego</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rozmiar węzłów</Label>
                <Select
                  value={localSettings.graph_node_size ?? 'medium'}
                  onValueChange={(value) => handleChange('graph_node_size', value as 'small' | 'medium' | 'large')}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Mały</SelectItem>
                    <SelectItem value="medium">Średni</SelectItem>
                    <SelectItem value="large">Duży</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Linie łączące węzły</Label>
                  <p className="text-sm text-muted-foreground">
                    Pokaż wizualne połączenia między węzłami
                  </p>
                </div>
                <Switch
                  checked={localSettings.graph_show_lines ?? true}
                  onCheckedChange={(checked) => handleChange('graph_show_lines', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Możliwość zwijania/rozwijania</Label>
                  <p className="text-sm text-muted-foreground">
                    Pozwól użytkownikom zwijać i rozwijać gałęzie drzewa
                  </p>
                </div>
                <Switch
                  checked={localSettings.graph_expandable ?? true}
                  onCheckedChange={(checked) => handleChange('graph_expandable', checked)}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="min-w-32"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Zapisz ustawienia
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default OrganizationTreeManagement;
