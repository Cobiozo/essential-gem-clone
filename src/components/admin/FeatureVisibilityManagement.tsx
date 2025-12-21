import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Shield, Menu, User, Zap, MousePointer } from 'lucide-react';
import { invalidateFeatureVisibilityCache } from '@/hooks/useFeatureVisibility';

interface FeatureVisibility {
  id: string;
  feature_key: string;
  feature_name: string;
  feature_category: string;
  description: string | null;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_client: boolean;
  visible_to_specjalista: boolean;
  is_system: boolean;
  position: number;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  menu: { label: 'Menu główne', icon: <Menu className="h-4 w-4" /> },
  my_account: { label: 'Moje konto', icon: <User className="h-4 w-4" /> },
  feature: { label: 'Funkcje', icon: <Zap className="h-4 w-4" /> },
  action: { label: 'Akcje', icon: <MousePointer className="h-4 w-4" /> },
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  partner: 'Partner',
  client: 'Klient',
  specjalista: 'Specjalista',
};

export const FeatureVisibilityManagement: React.FC = () => {
  const [features, setFeatures] = useState<FeatureVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_visibility')
        .select('*')
        .order('position');

      if (error) throw error;
      setFeatures(data || []);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast.error('Błąd podczas pobierania ustawień widoczności');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleToggle = async (
    featureId: string, 
    role: 'admin' | 'partner' | 'client' | 'specjalista',
    currentValue: boolean
  ) => {
    const columnName = `visible_to_${role}` as keyof FeatureVisibility;
    setUpdating(`${featureId}-${role}`);

    try {
      const { error } = await supabase
        .from('feature_visibility')
        .update({ [columnName]: !currentValue })
        .eq('id', featureId);

      if (error) throw error;

      // Update local state
      setFeatures(prev => prev.map(f => 
        f.id === featureId 
          ? { ...f, [columnName]: !currentValue }
          : f
      ));

      // Invalidate cache for immediate update across app
      invalidateFeatureVisibilityCache();

      toast.success('Ustawienia widoczności zaktualizowane');
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Błąd podczas aktualizacji');
    } finally {
      setUpdating(null);
    }
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.feature_category]) {
      acc[feature.feature_category] = [];
    }
    acc[feature.feature_category].push(feature);
    return acc;
  }, {} as Record<string, FeatureVisibility[]>);

  const categories = Object.keys(groupedFeatures);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Zarządzanie widocznością funkcji</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uprawnienia ról</CardTitle>
          <CardDescription>
            Określ, które funkcje są widoczne dla poszczególnych ról użytkowników.
            Wyłączone funkcje nie będą renderowane w interfejsie - użytkownicy nie zobaczą
            żadnych szarych przycisków ani komunikatów o braku dostępu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={categories[0]} className="w-full">
            <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
              {categories.map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  className="flex items-center gap-2"
                >
                  {CATEGORY_LABELS[category]?.icon}
                  {CATEGORY_LABELS[category]?.label || category}
                  <Badge variant="secondary" className="ml-1">
                    {groupedFeatures[category].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => (
              <TabsContent key={category} value={category} className="space-y-4">
                <div className="rounded-lg border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Funkcja</th>
                        {Object.entries(ROLE_LABELS).map(([key, label]) => (
                          <th key={key} className="text-center p-3 font-medium w-24">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedFeatures[category].map(feature => (
                        <tr key={feature.id} className="border-b last:border-0">
                          <td className="p-3">
                            <div className="font-medium">{feature.feature_name}</div>
                            {feature.description && (
                              <div className="text-sm text-muted-foreground">
                                {feature.description}
                              </div>
                            )}
                          </td>
                          {(['admin', 'partner', 'client', 'specjalista'] as const).map(role => {
                            const columnName = `visible_to_${role}` as keyof FeatureVisibility;
                            const isVisible = feature[columnName] as boolean;
                            const isUpdating = updating === `${feature.id}-${role}`;
                            const isAdminFeature = role === 'admin' && feature.feature_key === 'menu.admin';

                            return (
                              <td key={role} className="text-center p-3">
                                <div className="flex justify-center">
                                  {isUpdating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Switch
                                      checked={isVisible}
                                      onCheckedChange={() => handleToggle(feature.id, role, isVisible)}
                                      disabled={isAdminFeature}
                                    />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informacje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Zasada nadrzędna:</strong> Jeśli funkcja jest wyłączona dla danej roli, 
            element NIE ISTNIEJE w interfejsie - brak szarych przycisków, brak komunikatów 
            o braku dostępu.
          </p>
          <p>
            <strong>Natychmiastowa aktualizacja:</strong> Zmiany są widoczne natychmiast 
            bez potrzeby odświeżania strony.
          </p>
          <p>
            <strong>Admin:</strong> Administrator zawsze ma dostęp do wszystkich funkcji 
            niezależnie od ustawień (oprócz jawnego wyłączenia dostępu do panelu admina).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureVisibilityManagement;
