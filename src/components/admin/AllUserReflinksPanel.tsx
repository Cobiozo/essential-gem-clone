import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Trash2, Link2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getRoleLabel, AppRole } from '@/components/user-reflinks/types';
import { ReflinkStatusBadge } from '@/components/user-reflinks/ReflinkStatusBadge';

interface UserReflinkWithCreator {
  id: string;
  creator_user_id: string;
  target_role: AppRole;
  reflink_code: string;
  is_active: boolean;
  click_count: number;
  registration_count: number;
  created_at: string;
  expires_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    eq_id: string | null;
    role: string;
  } | null;
}

export const AllUserReflinksPanel: React.FC = () => {
  const { toast } = useToast();
  
  const [reflinks, setReflinks] = useState<UserReflinkWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingExpired, setDeletingExpired] = useState(false);

  useEffect(() => {
    fetchReflinks();
  }, []);

  const fetchReflinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_reflinks')
        .select(`
          *,
          profiles:creator_user_id (
            first_name,
            last_name,
            email,
            eq_id,
            role
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReflinks((data as unknown as UserReflinkWithCreator[]) || []);
    } catch (error: any) {
      console.error('Error fetching reflinks:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać listy linków',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('user_reflinks')
        .update({ is_active: !currentState, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      setReflinks(prev => 
        prev.map(r => r.id === id ? { ...r, is_active: !currentState } : r)
      );
      
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
      
      setReflinks(prev => prev.filter(r => r.id !== id));
      
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

  const handleDeleteExpired = async () => {
    setDeletingExpired(true);
    try {
      const { error } = await supabase
        .from('user_reflinks')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (error) throw error;
      
      // Refetch to update the list
      await fetchReflinks();
      
      toast({
        title: 'Usunięto wygasłe linki',
        description: `Usunięto linki które wygasły`,
      });
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeletingExpired(false);
    }
  };

  const filteredReflinks = useMemo(() => {
    return reflinks.filter(reflink => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const creatorName = `${reflink.profiles?.first_name || ''} ${reflink.profiles?.last_name || ''}`.toLowerCase();
        const matchesSearch = 
          reflink.reflink_code.toLowerCase().includes(query) ||
          creatorName.includes(query) ||
          reflink.profiles?.email?.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }
      
      // Role filter
      if (roleFilter !== 'all' && reflink.target_role !== roleFilter) {
        return false;
      }
      
      // Status filter
      const now = new Date();
      const expiresAt = new Date(reflink.expires_at);
      const isExpired = expiresAt < now;
      
      if (statusFilter === 'active' && (!reflink.is_active || isExpired)) {
        return false;
      }
      if (statusFilter === 'inactive' && reflink.is_active) {
        return false;
      }
      if (statusFilter === 'expired' && !isExpired) {
        return false;
      }
      
      return true;
    });
  }, [reflinks, searchQuery, roleFilter, statusFilter]);

  const expiredCount = useMemo(() => {
    const now = new Date();
    return reflinks.filter(r => new Date(r.expires_at) < now).length;
  }, [reflinks]);

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
          Zarządzaj wszystkimi linkami polecającymi wygenerowanymi przez użytkowników
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po kodzie, nazwisku lub emailu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Rola docelowa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie role</SelectItem>
              <SelectItem value="client">Klient</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="specjalista">Specjalista</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="active">Aktywne</SelectItem>
              <SelectItem value="inactive">Nieaktywne</SelectItem>
              <SelectItem value="expired">Wygasłe</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchReflinks} size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Łącznie: <strong>{reflinks.length}</strong></span>
          <span>Pokazano: <strong>{filteredReflinks.length}</strong></span>
          {expiredCount > 0 && (
            <span className="text-destructive">Wygasłych: <strong>{expiredCount}</strong></span>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod linku</TableHead>
                <TableHead>Rola docelowa</TableHead>
                <TableHead>Twórca</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Wygasa</TableHead>
                <TableHead className="text-center">Klikn.</TableHead>
                <TableHead className="text-center">Rej.</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReflinks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Brak linków spełniających kryteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredReflinks.map((reflink) => (
                  <TableRow key={reflink.id}>
                    <TableCell className="font-mono text-xs">
                      {reflink.reflink_code}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getRoleLabel(reflink.target_role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {reflink.profiles?.first_name} {reflink.profiles?.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {reflink.profiles?.email}
                        </span>
                        <Badge variant="secondary" className="w-fit mt-1 text-xs">
                          {getRoleLabel(reflink.profiles?.role as AppRole)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={reflink.is_active}
                        onCheckedChange={() => handleToggle(reflink.id, reflink.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <ReflinkStatusBadge expiresAt={reflink.expires_at} />
                    </TableCell>
                    <TableCell className="text-center">
                      {reflink.click_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {reflink.registration_count}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Delete expired button */}
        {expiredCount > 0 && (
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deletingExpired}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Usuń wygasłe linki ({expiredCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usuń wszystkie wygasłe linki</AlertDialogTitle>
                  <AlertDialogDescription>
                    Czy na pewno chcesz usunąć {expiredCount} wygasłych linków?
                    Ta operacja jest nieodwracalna.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteExpired}>
                    Usuń wszystkie wygasłe
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
