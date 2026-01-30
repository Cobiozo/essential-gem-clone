import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ChatVisibilitySettings {
  id: string;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_specjalista: boolean;
  visible_to_client: boolean;
}

const ROLES = [
  { key: 'visible_to_admin', label: 'Administrator', description: 'Administratorzy widzą moduł Czat', badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { key: 'visible_to_partner', label: 'Partner', description: 'Partnerzy widzą moduł Czat', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { key: 'visible_to_specjalista', label: 'Specjalista', description: 'Specjaliści widzą moduł Czat', badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { key: 'visible_to_client', label: 'Klient', description: 'Klienci widzą moduł Czat', badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
] as const;

export const ChatSidebarVisibilityCard = () => {
  const [settings, setSettings] = useState<ChatVisibilitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sidebar_visibility')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching chat visibility settings:', error);
      toast.error('Błąd pobierania ustawień widoczności');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateVisibility = async (field: keyof ChatVisibilitySettings, value: boolean) => {
    if (!settings) return;
    
    setSaving(field);
    try {
      const { error } = await supabase
        .from('chat_sidebar_visibility')
        .update({ [field]: value })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, [field]: value } : null);
      
      // Invalidate cache so sidebar updates
      queryClient.invalidateQueries({ queryKey: ['chat-sidebar-visibility'] });
      
      toast.success('Widoczność zaktualizowana');
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Błąd aktualizacji widoczności');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Widoczność modułu Czat
        </CardTitle>
        <CardDescription>
          Kontroluj, które role widzą pozycję "Czat" w menu bocznym
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ROLES.map(role => (
            <div
              key={role.key}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Badge className={role.badgeClass}>
                  {role.label}
                </Badge>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {role.description}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Label 
                  htmlFor={role.key}
                  className="text-sm font-medium cursor-pointer"
                >
                  {settings?.[role.key] ? 'Widoczny' : 'Ukryty'}
                </Label>
                <Switch
                  id={role.key}
                  checked={settings?.[role.key] ?? true}
                  onCheckedChange={(checked) => updateVisibility(role.key, checked)}
                  disabled={saving === role.key}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
