import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Search, ShieldOff, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserResult {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  eq_id: string;
}

export const AdminMfaResetSection: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<UserResult | null>(null);
  const [resetting, setResetting] = useState(false);

  const searchUsers = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,eq_id.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .limit(10);
      if (error) throw error;
      setSearchResults((data || []) as UserResult[]);
    } catch (err: any) {
      toast({ title: 'Błąd wyszukiwania', description: err.message, variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const resetMfa = async () => {
    if (!confirmUser) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-mfa', {
        body: { target_user_id: confirmUser.user_id },
      });
      if (error) throw error;

      toast({
        title: 'MFA zresetowane',
        description: `Usunięto ${data.deleted_count} faktor(ów) MFA dla ${confirmUser.first_name} ${confirmUser.last_name}. Użytkownik zostanie poproszony o ponowną konfigurację.`,
      });
      setSearchResults([]);
      setSearchQuery('');
    } catch (err: any) {
      toast({ title: 'Błąd resetu MFA', description: err.message, variant: 'destructive' });
    } finally {
      setResetting(false);
      setConfirmUser(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="w-5 h-5" />
            Reset MFA użytkownika
          </CardTitle>
          <CardDescription>
            Resetuj authenticator (TOTP) dla wybranego użytkownika. Po resecie użytkownik będzie musiał skonfigurować MFA ponownie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Wyszukaj użytkownika</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Imię, nazwisko, email lub EQ ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') searchUsers(); }}
              />
              <Button variant="outline" onClick={searchUsers} disabled={searching || searchQuery.length < 2}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-1 border rounded-md divide-y">
              {searchResults.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between p-3">
                  <div className="text-sm">
                    <span className="font-medium">{user.first_name} {user.last_name}</span>
                    <span className="text-muted-foreground ml-2">{user.email}</span>
                    {user.eq_id && <span className="text-xs text-muted-foreground ml-2">({user.eq_id})</span>}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmUser(user)}
                    disabled={resetting}
                  >
                    <ShieldOff className="w-4 h-4 mr-1" />
                    Resetuj MFA
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmUser} onOpenChange={(open) => { if (!open) setConfirmUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Potwierdź reset MFA
            </AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz zresetować MFA dla użytkownika{' '}
              <strong>{confirmUser?.first_name} {confirmUser?.last_name}</strong> ({confirmUser?.email})?
              <br /><br />
              Wszystkie skonfigurowane authenticatory zostaną usunięte. Użytkownik będzie musiał skonfigurować MFA ponownie przy następnym logowaniu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={resetMfa}
              disabled={resetting}
            >
              {resetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Resetuj MFA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};