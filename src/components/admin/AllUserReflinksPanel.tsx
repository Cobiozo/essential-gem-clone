import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Trash2, Link2, RefreshCw, Plus, Copy, MousePointerClick, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getRoleLabel, AppRole, UserReflink } from '@/components/user-reflinks/types';
import { ReflinkStatusBadge } from '@/components/user-reflinks/ReflinkStatusBadge';
import { ReflinkQRCode } from '@/components/user-reflinks/ReflinkQRCode';

interface UserWithReflinks {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  eq_id: string | null;
  role: string;
  reflinks: UserReflink[];
}

export const AllUserReflinksPanel: React.FC = () => {
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserWithReflinks[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [linksFilter, setLinksFilter] = useState<string>('all');
  const [globalValidityDays, setGlobalValidityDays] = useState(30);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchGlobalSettings();
  }, []);

  const fetchGlobalSettings = async () => {
    try {
      const { data } = await supabase
        .from('reflink_global_settings')
        .select('setting_value')
        .eq('setting_key', 'link_validity_days')
        .single();
      
      if (data?.setting_value) {
        setGlobalValidityDays(parseInt(data.setting_value, 10) || 30);
      }
    } catch (error) {
      console.error('Error fetching global settings:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all active users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id, role')
        .eq('is_active', true)
        .order('last_name');
      
      if (profilesError) throw profilesError;

      // Fetch all user reflinks
      const { data: reflinksData, error: reflinksError } = await supabase
        .from('user_reflinks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (reflinksError) throw reflinksError;

      // Combine data
      const usersWithReflinks: UserWithReflinks[] = (profilesData || []).map(user => ({
        ...user,
        reflinks: (reflinksData || []).filter(r => r.creator_user_id === user.user_id) as UserReflink[]
      }));

      setUsers(usersWithReflinks);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać danych',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForUser = async (userId: string, eqId: string | null, targetRole: AppRole) => {
    setGeneratingFor(userId);
    try {
      // Generate unique code
      const { data: newCode, error: codeError } = await supabase.rpc('generate_user_reflink_code', {
        p_eq_id: eqId || 'anon'
      });
      
      if (codeError) throw codeError;

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + globalValidityDays);

      // Insert reflink on behalf of user
      const { error: insertError } = await supabase
        .from('user_reflinks')
        .insert({
          creator_user_id: userId,
          target_role: targetRole,
          reflink_code: newCode,
          expires_at: expiresAt.toISOString(),
        });
      
      if (insertError) throw insertError;

      toast({
        title: 'Wygenerowano!',
        description: `PureLink dla roli ${getRoleLabel(targetRole)} został utworzony`,
      });

      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error('Error generating reflink:', error);
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się wygenerować linku',
        variant: 'destructive',
      });
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('user_reflinks')
        .update({ is_active: !currentState, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setUsers(prev => prev.map(user => ({
        ...user,
        reflinks: user.reflinks.map(r => 
          r.id === id ? { ...r, is_active: !currentState } : r
        )
      })));
      
      toast({
        title: currentState ? 'Wyłączono' : 'Włączono',
        description: `Link został ${currentState ? 'wyłączony' : 'włączony'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_reflinks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setUsers(prev => prev.map(user => ({
        ...user,
        reflinks: user.reflinks.filter(r => r.id !== id)
      })));
      
      toast({
        title: 'Usunięto',
        description: 'Link został usunięty',
      });
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCopy = async (reflinkCode: string) => {
    try {
      const fullUrl = `${window.location.origin}/auth?ref=${reflinkCode}`;
      await navigator.clipboard.writeText(fullUrl);
      toast({
        title: 'Skopiowano!',
        description: fullUrl,
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się skopiować linku',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const matchesSearch = 
          fullName.includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.eq_id?.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }
      
      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }
      
      // Links filter
      if (linksFilter === 'with_links' && user.reflinks.length === 0) {
        return false;
      }
      if (linksFilter === 'without_links' && user.reflinks.length > 0) {
        return false;
      }
      
      return true;
    });
  }, [users, searchQuery, roleFilter, linksFilter]);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const usersWithLinks = users.filter(u => u.reflinks.length > 0).length;
    const totalLinks = users.reduce((sum, u) => sum + u.reflinks.length, 0);
    return { totalUsers, usersWithLinks, totalLinks };
  }, [users]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Ładowanie...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Wszystkie PureLinki użytkowników
        </CardTitle>
        <CardDescription>
          Zarządzaj linkami polecającymi wszystkich użytkowników. Kliknij w użytkownika, aby rozwinąć jego linki.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj użytkownika..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Rola użytkownika" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie role</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="specjalista">Specjalista</SelectItem>
              <SelectItem value="client">Klient</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={linksFilter} onValueChange={setLinksFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Linki" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy</SelectItem>
              <SelectItem value="with_links">Z linkami</SelectItem>
              <SelectItem value="without_links">Bez linków</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchData} size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Użytkownicy: <strong>{stats.totalUsers}</strong></span>
          <span>Z linkami: <strong>{stats.usersWithLinks}</strong></span>
          <span>Wszystkich linków: <strong>{stats.totalLinks}</strong></span>
          <span>Pokazano: <strong>{filteredUsers.length}</strong></span>
        </div>

        {/* Users Accordion */}
        <Accordion type="single" collapsible className="space-y-2">
          {filteredUsers.map((user) => (
            <AccordionItem 
              key={user.user_id} 
              value={user.user_id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 flex-1 text-left">
                  <div className="flex-1">
                    <span className="font-medium">
                      {user.first_name} {user.last_name}
                    </span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {getRoleLabel(user.role as AppRole)}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {user.email}
                  </span>
                  <Badge variant={user.reflinks.length > 0 ? "default" : "outline"} className="ml-2">
                    {user.reflinks.length} {user.reflinks.length === 1 ? 'link' : 'linków'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3">
                  {/* Generate button */}
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          disabled={generatingFor === user.user_id}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {generatingFor === user.user_id ? 'Generowanie...' : 'Generuj link'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleGenerateForUser(user.user_id, user.eq_id, 'client')}>
                          Dla Klienta
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateForUser(user.user_id, user.eq_id, 'partner')}>
                          Dla Partnera
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateForUser(user.user_id, user.eq_id, 'specjalista')}>
                          Dla Specjalisty
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span className="text-xs text-muted-foreground">
                      eq_id: {user.eq_id || 'brak'}
                    </span>
                  </div>

                  {/* User's reflinks */}
                  {user.reflinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Ten użytkownik nie ma jeszcze żadnych PureLinków.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {user.reflinks.map((reflink) => (
                        <div 
                          key={reflink.id} 
                          className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg"
                        >
                          <Badge variant="outline">
                            {getRoleLabel(reflink.target_role)}
                          </Badge>
                          <span className="font-mono text-xs flex-1 min-w-[150px]">
                            {reflink.reflink_code}
                          </span>
                          <ReflinkStatusBadge expiresAt={reflink.expires_at} />
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MousePointerClick className="w-3 h-3" />
                            {reflink.click_count}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserCheck className="w-3 h-3" />
                            {reflink.registration_count}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <ReflinkQRCode 
                              reflinkCode={reflink.reflink_code} 
                              targetRole={reflink.target_role} 
                            />
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleCopy(reflink.reflink_code)}
                              title="Kopiuj link"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Switch 
                              checked={reflink.is_active} 
                              onCheckedChange={() => handleToggle(reflink.id, reflink.is_active)}
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Usuń PureLink</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Czy na pewno chcesz usunąć ten link? 
                                    Statystyki kliknięć i rejestracji zostaną utracone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(reflink.id)}>
                                    Usuń
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {filteredUsers.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Brak użytkowników spełniających kryteria wyszukiwania
          </div>
        )}
      </CardContent>
    </Card>
  );
};
