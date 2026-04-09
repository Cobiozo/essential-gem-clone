import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Box, Search, UserPlus, Trash2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AssessmentContentEditor } from './purebox/AssessmentContentEditor';
import { OmegaContentEditor } from './purebox/OmegaContentEditor';

interface PureBoxElement {
  id: string;
  element_key: string;
  element_name: string;
  is_active: boolean;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_client: boolean;
  visible_to_specjalista: boolean;
}

interface UserAccess {
  id: string;
  user_id: string;
  element_key: string;
  is_enabled: boolean;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
    eq_id: string;
  };
}

export const PureBoxManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [elements, setElements] = useState<PureBoxElement[]>([]);
  const [userAccessList, setUserAccessList] = useState<UserAccess[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [settingsRes, accessRes] = await Promise.all([
      supabase.from('purebox_settings' as any).select('*'),
      supabase.from('purebox_user_access' as any).select('*'),
    ]);

    setElements((settingsRes.data as any[]) || []);

    if (accessRes.data && (accessRes.data as any[]).length > 0) {
      const userIds = (accessRes.data as any[]).map((a: any) => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id')
        .in('user_id', userIds);

      const enriched = (accessRes.data as any[]).map((access: any) => ({
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

  const updateElement = async (id: string, field: string, value: boolean) => {
    const { error } = await supabase
      .from('purebox_settings' as any)
      .update({ [field]: value } as any)
      .eq('id', id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } else {
      setElements(prev => prev.map(el => el.id === id ? { ...el, [field]: value } : el));
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
    if (!selectedElement) {
      toast({ title: 'Wybierz element', description: 'Wybierz element PureBox do którego chcesz nadać dostęp', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('purebox_user_access' as any).insert({
      user_id: userId,
      element_key: selectedElement,
      is_enabled: true,
      granted_by: user?.id,
    } as any);
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Info', description: 'Użytkownik już ma nadany dostęp do tego elementu' });
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
    await supabase.from('purebox_user_access' as any).delete().eq('id', accessId);
    toast({ title: 'Usunięto dostęp' });
    fetchData();
  };

  const toggleAccess = async (accessId: string, enabled: boolean) => {
    await supabase.from('purebox_user_access' as any).update({ is_enabled: enabled } as any).eq('id', accessId);
    fetchData();
  };

  const getElementName = (key: string) => elements.find(el => el.element_key === key)?.element_name || key;

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const masterElement = elements.find(el => el.element_key === 'purebox-master');
  const subElements = elements.filter(el => el.element_key !== 'purebox-master');
  const isMasterActive = masterElement?.is_active ?? false;

  const roles = [
    { key: 'visible_to_admin', label: 'Admin' },
    { key: 'visible_to_partner', label: 'Partner' },
    { key: 'visible_to_client', label: 'Klient' },
    { key: 'visible_to_specjalista', label: 'Specjalista' },
  ];

  return (
    <Tabs defaultValue="visibility" className="space-y-6">
      <TabsList>
        <TabsTrigger value="visibility">Widoczność</TabsTrigger>
        <TabsTrigger value="assessment">Ocena Umiejętności</TabsTrigger>
        <TabsTrigger value="omega">Dziennik Omega</TabsTrigger>
      </TabsList>

      <TabsContent value="visibility">
    <div className="space-y-6">
      {/* Elements & Role Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="w-5 h-5" />
            Elementy modułu PureBox
          </CardTitle>
          <CardDescription>Zarządzaj widocznością elementów dla poszczególnych ról</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Master toggle */}
          {masterElement && (
            <div className="flex items-center justify-between p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
              <div>
                <p className="font-semibold text-lg">Moduł PureBox</p>
                <p className="text-sm text-muted-foreground">Włącz/wyłącz cały moduł PureBox dla użytkowników</p>
              </div>
              <Switch
                checked={isMasterActive}
                onCheckedChange={(v) => updateElement(masterElement.id, 'is_active', v)}
              />
            </div>
          )}

          <Separator />

          <div className={!isMasterActive ? 'opacity-50 pointer-events-none' : ''}>
          {subElements.map(element => (
            <div key={element.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-base">{element.element_name}</p>
                  <p className="text-sm text-muted-foreground">{element.element_key}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Aktywny</Label>
                  <Switch
                    checked={element.is_active}
                    onCheckedChange={(v) => updateElement(element.id, 'is_active', v)}
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {roles.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-2 border rounded-lg">
                    <Label className="text-sm">{label}</Label>
                    <Switch
                      checked={(element as any)[key] || false}
                      onCheckedChange={(v) => updateElement(element.id, key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual User Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Dostęp indywidualny
          </CardTitle>
          <CardDescription>Nadaj dostęp konkretnym użytkownikom do wybranych elementów PureBox</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Element selector */}
          <Select value={selectedElement} onValueChange={setSelectedElement}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz element PureBox..." />
            </SelectTrigger>
            <SelectContent>
              {elements.map(el => (
                <SelectItem key={el.element_key} value={el.element_key}>
                  {el.element_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
                  <Button size="sm" onClick={() => grantAccess(profile.user_id)} disabled={!selectedElement}>
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
                    <Badge variant="outline">{getElementName(access.element_key)}</Badge>
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
      </TabsContent>

      <TabsContent value="assessment">
        <AssessmentContentEditor />
      </TabsContent>

      <TabsContent value="omega">
        <OmegaContentEditor />
      </TabsContent>
    </Tabs>
  );
};

export default PureBoxManagement;
