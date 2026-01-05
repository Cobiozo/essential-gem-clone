import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GuardianSearchInput, Guardian } from '@/components/auth/GuardianSearchInput';
import { AlertTriangle, Loader2, Save } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  eq_id?: string;
  is_active: boolean;
  upline_eq_id?: string | null;
  guardian_name?: string | null;
}

interface UserEditDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const UserEditDialog: React.FC<UserEditDialogProps> = ({
  user,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [eqId, setEqId] = useState('');
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [originalGuardianEqId, setOriginalGuardianEqId] = useState<string | null>(null);
  const [loadingGuardian, setLoadingGuardian] = useState(false);

  // Load user data when dialog opens
  useEffect(() => {
    if (user && open) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEqId(user.eq_id || '');
      setOriginalGuardianEqId(user.upline_eq_id || null);
      
      // Load current guardian data if exists
      if (user.upline_eq_id) {
        loadGuardian(user.upline_eq_id);
      } else {
        setGuardian(null);
      }
    }
  }, [user, open]);

  const loadGuardian = async (eqIdToLoad: string) => {
    setLoadingGuardian(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, eq_id, email')
        .eq('eq_id', eqIdToLoad)
        .single();

      if (!error && data) {
        setGuardian({
          user_id: data.user_id,
          first_name: data.first_name,
          last_name: data.last_name,
          eq_id: data.eq_id,
          email: data.email,
        });
      }
    } catch (err) {
      console.error('Error loading guardian:', err);
    } finally {
      setLoadingGuardian(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: 'Błąd walidacji',
        description: 'Imię i nazwisko są wymagane',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Update basic user data
      const { error: updateError } = await supabase.rpc('admin_update_user_data', {
        p_user_id: user.user_id,
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_eq_id: eqId.trim() || null,
      });

      if (updateError) {
        if (updateError.message.includes('EQ ID already exists')) {
          toast({
            title: 'Błąd',
            description: 'Ten numer EQ ID jest już przypisany do innego użytkownika',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        throw updateError;
      }

      // 2. Handle guardian change if needed
      const guardianChanged = (guardian?.eq_id || null) !== originalGuardianEqId;
      
      if (guardianChanged) {
        const { error: guardianError } = await supabase.rpc('admin_change_user_guardian', {
          p_user_id: user.user_id,
          p_new_guardian_user_id: guardian?.user_id || null,
          p_new_guardian_eq_id: guardian?.eq_id || null,
          p_new_guardian_first_name: guardian?.first_name || null,
          p_new_guardian_last_name: guardian?.last_name || null,
        });

        if (guardianError) {
          throw guardianError;
        }
      }

      toast({
        title: 'Sukces',
        description: guardianChanged 
          ? 'Dane użytkownika i opiekun zostali zaktualizowani'
          : 'Dane użytkownika zostały zaktualizowane',
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error updating user:', err);
      toast({
        title: 'Błąd',
        description: err.message || 'Nie udało się zaktualizować danych użytkownika',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const guardianChanged = (guardian?.eq_id || null) !== originalGuardianEqId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edytuj dane użytkownika</DialogTitle>
          <DialogDescription>
            {user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Imię *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Imię"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nazwisko *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nazwisko"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eqId">Numer EQ ID</Label>
            <Input
              id="eqId"
              value={eqId}
              onChange={(e) => setEqId(e.target.value)}
              placeholder="np. PL123456"
            />
          </div>

          <div className="space-y-2">
            {loadingGuardian ? (
              <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Ładowanie danych opiekuna...</span>
              </div>
            ) : (
              <GuardianSearchInput
                value={guardian}
                onChange={setGuardian}
              />
            )}
          </div>

          {guardianChanged && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Zmiana opiekuna spowoduje:</strong>
                <ul className="list-disc list-inside mt-1 text-sm">
                  <li>Przeniesienie użytkownika do kontaktów nowego opiekuna</li>
                  <li>Osoby pod opieką tego użytkownika pozostaną bez zmian</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Zapisywanie...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Zapisz zmiany
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditDialog;
