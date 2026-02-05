import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Eye, Search, X, UserPlus } from 'lucide-react';
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

interface UserOverride {
  id: string;
  user_id: string;
  is_visible: boolean;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface SearchResult {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
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

  // Per-user visibility state
  const [userOverrides, setUserOverrides] = useState<UserOverride[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

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

  const fetchUserOverrides = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_user_visibility')
        .select('id, user_id, is_visible');

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch profile details for each override
        const userIds = data.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email, role')
          .in('user_id', userIds);

        const enrichedOverrides: UserOverride[] = data.map(override => {
          const profile = profiles?.find(p => p.user_id === override.user_id);
          return {
            id: override.id,
            user_id: override.user_id,
            is_visible: override.is_visible,
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            email: profile?.email || '',
            role: profile?.role || 'client',
          };
        });

        setUserOverrides(enrichedOverrides);
      }
    } catch (error) {
      console.error('Error fetching user overrides:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchUserOverrides();
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

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, role, avatar_url')
        .eq('is_active', true)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter out users who already have overrides
      const existingUserIds = userOverrides.map(o => o.user_id);
      const filtered = (data || []).filter(u => !existingUserIds.includes(u.user_id));
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const addUserOverride = async (user: SearchResult, isVisible: boolean) => {
    try {
      const { data, error } = await supabase
        .from('chat_user_visibility')
        .insert({
          user_id: user.user_id,
          is_visible: isVisible,
        })
        .select()
        .single();

      if (error) throw error;

      setUserOverrides(prev => [...prev, {
        id: data.id,
        user_id: user.user_id,
        is_visible: isVisible,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
      }]);

      setSearchQuery('');
      setSearchResults([]);
      queryClient.invalidateQueries({ queryKey: ['chat-sidebar-visibility'] });
      toast.success(`Dodano nadpisanie dla ${user.first_name} ${user.last_name}`);
    } catch (error) {
      console.error('Error adding user override:', error);
      toast.error('Błąd dodawania nadpisania');
    }
  };

  const updateUserOverride = async (overrideId: string, isVisible: boolean) => {
    try {
      const { error } = await supabase
        .from('chat_user_visibility')
        .update({ is_visible: isVisible })
        .eq('id', overrideId);

      if (error) throw error;

      setUserOverrides(prev => prev.map(o => 
        o.id === overrideId ? { ...o, is_visible: isVisible } : o
      ));
      
      queryClient.invalidateQueries({ queryKey: ['chat-sidebar-visibility'] });
      toast.success('Widoczność zaktualizowana');
    } catch (error) {
      console.error('Error updating user override:', error);
      toast.error('Błąd aktualizacji');
    }
  };

  const removeUserOverride = async (overrideId: string) => {
    try {
      const { error } = await supabase
        .from('chat_user_visibility')
        .delete()
        .eq('id', overrideId);

      if (error) throw error;

      setUserOverrides(prev => prev.filter(o => o.id !== overrideId));
      queryClient.invalidateQueries({ queryKey: ['chat-sidebar-visibility'] });
      toast.success('Nadpisanie usunięte');
    } catch (error) {
      console.error('Error removing user override:', error);
      toast.error('Błąd usuwania');
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'partner': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'specjalista': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
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
    <div className="space-y-6">
      {/* Role-based visibility */}
      <Card>
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

      {/* Per-user visibility overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Widoczność per użytkownik
          </CardTitle>
          <CardDescription>
            Nadpisz ustawienia roli dla konkretnych użytkowników
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search for users */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              placeholder="Szukaj użytkownika po imieniu, nazwisku lub e-mailu..."
              className="pl-9"
            />
            
            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map(user => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge className={getRoleBadgeClass(user.role)} variant="secondary">
                        {user.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addUserOverride(user, false)}
                        className="text-xs"
                      >
                        Ukryj
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => addUserOverride(user, true)}
                        className="text-xs"
                      >
                        Pokaż
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {searchLoading && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg p-4 text-center">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            )}
          </div>

          {/* List of current overrides */}
          {userOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Brak indywidualnych nadpisań. Użyj wyszukiwarki powyżej, aby dodać użytkownika.
            </p>
          ) : (
            <div className="space-y-2">
              {userOverrides.map(override => (
                <div
                  key={override.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {override.first_name?.charAt(0)}{override.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {override.first_name} {override.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{override.email}</p>
                    </div>
                    <Badge className={getRoleBadgeClass(override.role)} variant="secondary">
                      {override.role}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">
                      {override.is_visible ? 'Widoczny' : 'Ukryty'}
                    </Label>
                    <Switch
                      checked={override.is_visible}
                      onCheckedChange={(checked) => updateUserOverride(override.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUserOverride(override.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
