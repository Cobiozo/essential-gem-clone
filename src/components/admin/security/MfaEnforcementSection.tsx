import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, Search, Trash2, UserPlus, Mail, Lock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnforcedUser {
  id: string;
  user_id: string;
  reason: string | null;
  enforced_method: string | null;
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

export const MfaEnforcementSection: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [reason, setReason] = useState('');
  const [enforcedMethod, setEnforcedMethod] = useState<string>('totp');

  const { data: enforcedUsers, isLoading } = useQuery({
    queryKey: ['mfa-enforced-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfa_enforced_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EnforcedUser[];
    },
  });

  const { data: enforcedProfiles } = useQuery({
    queryKey: ['mfa-enforced-profiles', enforcedUsers?.map(u => u.user_id)],
    enabled: !!enforcedUsers && enforcedUsers.length > 0,
    queryFn: async () => {
      const userIds = enforcedUsers!.map(u => u.user_id);
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
      const enforcedIds = new Set(enforcedUsers?.map(u => u.user_id) || []);
      setSearchResults((data || []).filter(u => !enforcedIds.has(u.user_id)) as SearchResult[]);
    } catch (err: any) {
      toast({ title: 'Błąd wyszukiwania', description: err.message, variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const addEnforcement = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('mfa_enforced_users').insert({
        user_id: userId,
        enforced_by: user?.id,
        reason: reason || null,
        enforced_method: enforcedMethod,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-enforced-users'] });
      setSearchResults([]);
      setSearchQuery('');
      setReason('');
      setEnforcedMethod('totp');
      toast({ title: 'MFA wymuszone dla użytkownika' });
    },
    onError: (err: any) => {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    },
  });

  const removeEnforcement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mfa_enforced_users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-enforced-users'] });
      toast({ title: 'Wymuszenie MFA usunięte' });
    },
    onError: (err: any) => {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    },
  });

  const getProfileForUser = (userId: string) => {
    return enforcedProfiles?.find(p => p.user_id === userId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Użytkownicy z wymuszonym MFA
        </CardTitle>
        <CardDescription>
          Wskaż użytkowników, którym MFA będzie wymuszone niezależnie od ustawień roli
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

        {/* Method & Reason */}
        {searchResults.length > 0 && (
          <>
            <div className="space-y-3">
              <Label className="font-medium">Metoda weryfikacji</Label>
              <RadioGroup value={enforcedMethod} onValueChange={setEnforcedMethod} className="space-y-2">
                <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="email" id="enforce-email" />
                  <Label htmlFor="enforce-email" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="font-medium">Kod email</div>
                      <div className="text-xs text-muted-foreground">6-cyfrowy kod wysyłany na email</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="totp" id="enforce-totp" />
                  <Label htmlFor="enforce-totp" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Lock className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="font-medium">Aplikacja Authenticator</div>
                      <div className="text-xs text-muted-foreground">Google Authenticator, Authy itp.</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="both" id="enforce-both" />
                  <Label htmlFor="enforce-both" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Shield className="w-4 h-4 text-purple-500" />
                    <div>
                      <div className="font-medium">Obie metody</div>
                      <div className="text-xs text-muted-foreground">Użytkownik wybiera przy logowaniu</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Powód wymuszenia (opcjonalnie)</Label>
              <Input
                placeholder="np. Konto wrażliwe, dostęp do danych finansowych..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </>
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
                  onClick={() => addEnforcement.mutate(user.user_id)}
                  disabled={addEnforcement.isPending}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Wymuś MFA
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Current enforcements */}
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : enforcedUsers && enforcedUsers.length > 0 ? (
          <div className="space-y-1 border rounded-md divide-y">
            {enforcedUsers.map((enforced) => {
              const profile = getProfileForUser(enforced.user_id);
              return (
                <div key={enforced.id} className="flex items-center justify-between p-3">
                  <div className="text-sm">
                    <span className="font-medium">
                      {profile ? `${profile.first_name} ${profile.last_name}` : enforced.user_id}
                    </span>
                    {profile && <span className="text-muted-foreground ml-2">{profile.email}</span>}
                    {enforced.enforced_method && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {enforced.enforced_method === 'email' ? 'Email' : enforced.enforced_method === 'totp' ? 'Authenticator' : 'Obie'}
                      </Badge>
                    )}
                    {enforced.reason && (
                      <span className="text-xs text-muted-foreground ml-2">— {enforced.reason}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeEnforcement.mutate(enforced.id)}
                    disabled={removeEnforcement.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Brak użytkowników z wymuszonym MFA
          </p>
        )}
      </CardContent>
    </Card>
  );
};
