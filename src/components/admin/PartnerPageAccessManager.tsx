import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Globe, Search, UserPlus, Trash2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const PartnerPageAccessManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [userAccessList, setUserAccessList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [settingsRes, accessRes] = await Promise.all([
      supabase.from('partner_page_settings').select('*').limit(1).maybeSingle(),
      supabase.from('partner_page_user_access').select('*'),
    ]);
    setSettings(settingsRes.data);
    
    // Fetch profile info for each user with access
    if (accessRes.data && accessRes.data.length > 0) {
      const userIds = accessRes.data.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id')
        .in('user_id', userIds);
      
      const enriched = accessRes.data.map(access => ({
        ...access,
        profile: profiles?.find(p => p.user_id === access.user_id),
      }));
      setUserAccessList(enriched);
    } else {
      setUserAccessList([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateSetting = async (field: string, value: boolean) => {
    if (!settings) return;
    const { error } = await supabase
      .from('partner_page_settings')
      .update({ [field]: value })
      .eq('id', settings.id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } else {
      setSettings((prev: any) => ({ ...prev, [field]: value }));
      toast({ title: 'Zapisano' });
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email, eq_id')
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,eq_id.ilike.%${searchQuery}%`)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const grantAccess = async (userId: string) => {
    const { error } = await supabase.from('partner_page_user_access').insert({
      user_id: userId,
      is_enabled: true,
      granted_by: user?.id,
    });
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Info', description: 'Użytkownik już ma nadany dostęp' });
      } else {
        toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Dodano dostęp' });
      setSearchResults([]);
      setSearchQuery('');
      fetchData();
    }
  };

  const removeAccess = async (accessId: string) => {
    await supabase.from('partner_page_user_access').delete().eq('id', accessId);
    toast({ title: 'Usunięto dostęp' });
    fetchData();
  };

  const toggleAccess = async (accessId: string, enabled: boolean) => {
    await supabase.from('partner_page_user_access').update({ is_enabled: enabled }).eq('id', accessId);
    fetchData();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Global toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Ustawienia systemu stron partnerskich
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">System aktywny</Label>
              <p className="text-sm text-muted-foreground">Włącz/wyłącz cały system stron partnerskich</p>
            </div>
            <Switch
              checked={settings?.is_system_active || false}
              onCheckedChange={(v) => updateSetting('is_system_active', v)}
            />
          </div>

          <Separator />

          <h4 className="font-medium">Dostęp wg roli</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'enabled_for_partner', label: 'Partnerzy' },
              { key: 'enabled_for_specjalista', label: 'Specjaliści' },
              { key: 'enabled_for_client', label: 'Klienci' },
              { key: 'enabled_for_admin', label: 'Administratorzy' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <Label>{label}</Label>
                <Switch
                  checked={settings?.[key] || false}
                  onCheckedChange={(v) => updateSetting(key, v)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Dostęp indywidualny
          </CardTitle>
          <CardDescription>Nadaj dostęp konkretnym użytkownikom niezależnie od roli</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj po imieniu, emailu lub EQ ID..."
              onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            />
            <Button onClick={searchUsers} disabled={searching} variant="outline">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y">
              {searchResults.map(profile => (
                <div key={profile.user_id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                    <p className="text-sm text-muted-foreground">{profile.email} {profile.eq_id && `(${profile.eq_id})`}</p>
                  </div>
                  <Button size="sm" onClick={() => grantAccess(profile.user_id)}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Dodaj
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Current access list */}
          {userAccessList.length > 0 ? (
            <div className="border rounded-lg divide-y">
              {userAccessList.map(access => (
                <div key={access.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">
                        {access.profile?.first_name} {access.profile?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {access.profile?.email}
                      </p>
                    </div>
                    <Badge variant={access.is_enabled ? 'default' : 'secondary'}>
                      {access.is_enabled ? 'Aktywny' : 'Wyłączony'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={access.is_enabled}
                      onCheckedChange={(v) => toggleAccess(access.id, v)}
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeAccess(access.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Brak indywidualnie nadanych dostępów
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerPageAccessManager;
