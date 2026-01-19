import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, ArrowRight, RefreshCw, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatPermission {
  id: string;
  sender_role: string;
  target_role: string;
  is_enabled: boolean;
  allow_individual: boolean;
  allow_group: boolean;
  description: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  partner: 'Partner',
  specjalista: 'Specjalista',
  client: 'Klient',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  partner: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  specjalista: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  client: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

export const ChatPermissionsManagement = () => {
  const [permissions, setPermissions] = useState<ChatPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_permissions')
        .select('*')
        .order('sender_role', { ascending: true })
        .order('target_role', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Błąd pobierania uprawnień');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const updatePermission = async (id: string, field: keyof ChatPermission, value: boolean) => {
    setSaving(id);
    try {
      const { error } = await supabase
        .from('chat_permissions')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      setPermissions(prev =>
        prev.map(p => p.id === id ? { ...p, [field]: value } : p)
      );
      toast.success('Uprawnienia zaktualizowane');
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Błąd aktualizacji uprawnień');
    } finally {
      setSaving(null);
    }
  };

  // Group permissions by sender role
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.sender_role]) {
      acc[perm.sender_role] = [];
    }
    acc[perm.sender_role].push(perm);
    return acc;
  }, {} as Record<string, ChatPermission[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
              <MessageSquare className="h-5 w-5" />
              Kierunki komunikacji
            </CardTitle>
            <CardDescription className="mt-1">
              Konfiguruj kto może wysyłać wiadomości do kogo w systemie
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPermissions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Info box */}
        <div className="bg-muted/50 p-4 rounded-lg mb-6 flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Jak działają uprawnienia</p>
            <p>
              Włączenie kierunku pozwala użytkownikom z danej roli wysyłać wiadomości prywatne do użytkowników docelowej roli.
              Administrator zawsze może wysyłać wiadomości do wszystkich.
            </p>
          </div>
        </div>

        {/* Permissions grouped by sender */}
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([senderRole, perms]) => (
            <div key={senderRole}>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={ROLE_COLORS[senderRole]}>
                  {ROLE_LABELS[senderRole]}
                </Badge>
                <span className="text-sm text-muted-foreground">może pisać do:</span>
              </div>
              
              <div className="space-y-3 ml-4">
                {perms.map(perm => (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className={ROLE_COLORS[perm.target_role]}>
                        {ROLE_LABELS[perm.target_role]}
                      </Badge>
                      {perm.description && (
                        <span className="text-sm text-muted-foreground hidden sm:inline">
                          {perm.description}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Individual messages toggle */}
                      <div className="flex items-center gap-2">
                        <Label 
                          htmlFor={`individual-${perm.id}`}
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          1:1
                        </Label>
                        <Switch
                          id={`individual-${perm.id}`}
                          checked={perm.is_enabled && perm.allow_individual}
                          onCheckedChange={(checked) => {
                            if (!perm.is_enabled && checked) {
                              updatePermission(perm.id, 'is_enabled', true);
                            }
                            updatePermission(perm.id, 'allow_individual', checked);
                          }}
                          disabled={saving === perm.id}
                        />
                      </div>

                      {/* Group messages toggle */}
                      <div className="flex items-center gap-2">
                        <Label 
                          htmlFor={`group-${perm.id}`}
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Grupy
                        </Label>
                        <Switch
                          id={`group-${perm.id}`}
                          checked={perm.is_enabled && perm.allow_group}
                          onCheckedChange={(checked) => {
                            if (!perm.is_enabled && checked) {
                              updatePermission(perm.id, 'is_enabled', true);
                            }
                            updatePermission(perm.id, 'allow_group', checked);
                          }}
                          disabled={saving === perm.id}
                        />
                      </div>

                      <Separator orientation="vertical" className="h-6" />

                      {/* Main toggle */}
                      <div className="flex items-center gap-2">
                        <Label 
                          htmlFor={`enabled-${perm.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {perm.is_enabled ? 'Aktywny' : 'Wyłączony'}
                        </Label>
                        <Switch
                          id={`enabled-${perm.id}`}
                          checked={perm.is_enabled}
                          onCheckedChange={(checked) => updatePermission(perm.id, 'is_enabled', checked)}
                          disabled={saving === perm.id}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {permissions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Brak skonfigurowanych kierunków komunikacji</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
