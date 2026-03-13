import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldOff, Search, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExemptUser {
  id: string;
  user_id: string;
  reason: string | null;
  created_at: string;
}

interface SearchResult {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  eq_id: string;
  role: string;
}

export const MfaExemptionSection: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [reason, setReason] = useState('');

  const { data: exemptUsers, isLoading } = useQuery({
    queryKey: ['mfa-exempt-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfa_exempt_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ExemptUser[];
    },
  });

  // Get profiles for exempt user IDs
  const { data: exemptProfiles } = useQuery({
    queryKey: ['mfa-exempt-profiles', exemptUsers?.map(u => u.user_id)],
    enabled: !!exemptUsers && exemptUsers.length > 0,
    queryFn: async () => {
      const userIds = exemptUsers!.map(u => u.user_id);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id')
        .in('user_id', userIds);
      if (error) throw error;
      return data;
    },
  });

  const searchUsers = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id, role')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .limit(10);
      if (error) throw error;
      // Filter out already exempt users
      const exemptIds = new Set(exemptUsers?.map(u => u.user_id) || []);
      setSearchResults((data || []).filter(u => !exemptIds.has(u.user_id)) as SearchResult[]);
    } catch (err: any) {
      toast({ title: 'Błąd wyszukiwania', description: err.message, variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const addExemption = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('mfa_exempt_users').insert({
        user_id: userId,
        exempted_by: user?.id,
        reason: reason || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-exempt-users'] });
      setSearchResults([]);
      setSearchQuery('');
      setReason('');
      toast({ title: 'Użytkownik wykluczony z MFA' });
    },
    onError: (err: any) => {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    },
  });

  const removeExemption = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mfa_exempt_users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-exempt-users'] });
      toast({ title: 'Wykluczenie usunięte' });
    },
    onError: (err: any) => {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    },
  });

  const getProfileForUser = (userId: string) => {
    return exemptProfiles?.find(p => p.user_id === userId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldOff className="w-5 h-5" />
          Użytkownicy wykluczeni z MFA
        </CardTitle>
        <CardDescription>
          Wskaż użytkowników, których weryfikacja dwuskładnikowa nie będzie dotyczyć
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label>Wyszukaj użytkownika</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Imię, nazwisko lub email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') searchUsers(); }}
            />
            <Button variant="outline" onClick={searchUsers} disabled={searching || searchQuery.length < 2}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Reason */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <Label>Powód wykluczenia (opcjonalnie)</Label>
            <Input
              placeholder="np. Konto testowe, VIP..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="space-y-1 border rounded-md divide-y">
            {searchResults.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-3">
                <div className="text-sm">
                  <span className="font-medium">{user.first_name} {user.last_name}</span>
                  <span className="text-muted-foreground ml-2">{user.email}</span>
                  <span className="text-xs text-muted-foreground ml-2">({user.role})</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addExemption.mutate(user.user_id)}
                  disabled={addExemption.isPending}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Wyklucz
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Current exemptions */}
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : exemptUsers && exemptUsers.length > 0 ? (
          <div className="space-y-1 border rounded-md divide-y">
            {exemptUsers.map((exempt) => {
              const profile = getProfileForUser(exempt.user_id);
              return (
                <div key={exempt.id} className="flex items-center justify-between p-3">
                  <div className="text-sm">
                    <span className="font-medium">
                      {profile ? `${profile.first_name} ${profile.last_name}` : exempt.user_id}
                    </span>
                    {profile && <span className="text-muted-foreground ml-2">{profile.email}</span>}
                    {exempt.reason && (
                      <span className="text-xs text-muted-foreground ml-2">— {exempt.reason}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeExemption.mutate(exempt.id)}
                    disabled={removeExemption.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Brak wykluczonych użytkowników
          </p>
        )}
      </CardContent>
    </Card>
  );
};
