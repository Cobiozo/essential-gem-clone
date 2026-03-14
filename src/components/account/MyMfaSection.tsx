import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, ShieldCheck, ShieldOff, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TOTPSetup } from '@/components/auth/TOTPSetup';
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

export const MyMfaSection: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verifyCode, setVerifyCode] = useState('');
  const [action, setAction] = useState<'change' | 'remove' | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const { data: factors, isLoading, refetch } = useQuery({
    queryKey: ['my-mfa-factors'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
  });

  // Check if MFA is required for this user (can't remove if required)
  const { data: mfaConfig } = useQuery({
    queryKey: ['my-mfa-config'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_mfa_config');
      if (error) return null;
      return data;
    },
  });

  const activeTotp = factors?.totp?.filter(f => f.status === 'verified') || [];
  const hasActiveFactor = activeTotp.length > 0;

  const isMfaRequired = mfaConfig && (mfaConfig as any)?.mfa_required === true;
  const requiredMethod = (mfaConfig as any)?.mfa_method;
  const canRemoveTotp = !isMfaRequired || requiredMethod === 'email';

  const handleVerifyAndAct = async () => {
    if (verifyCode.length !== 6 || !activeTotp[0]) return;
    setVerifying(true);
    setError(null);

    try {
      const factor = activeTotp[0];

      // Challenge + verify current code
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw new Error('Nieprawidłowy kod. Sprawdź aktualny kod w aplikacji Authenticator.');

      // Unenroll old factor
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (unenrollError) throw unenrollError;

      if (action === 'change') {
        setShowSetup(true);
        toast({ title: 'Stary authenticator usunięty', description: 'Skonfiguruj nowy authenticator.' });
      } else {
        toast({ title: 'Authenticator usunięty', description: 'Weryfikacja dwuskładnikowa TOTP została wyłączona.' });
        await refetch();
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd');
    } finally {
      setVerifying(false);
      setVerifyCode('');
      setAction(null);
    }
  };

  const handleSetupComplete = async () => {
    setShowSetup(false);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['my-mfa-factors'] });
  };

  if (showSetup) {
    return <TOTPSetup onSetupComplete={handleSetupComplete} />;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Moje MFA — Authenticator
          </CardTitle>
          <CardDescription>
            Zarządzaj weryfikacją dwuskładnikową (TOTP) swojego konta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            {hasActiveFactor ? (
              <>
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Authenticator jest aktywny</p>
                  <p className="text-xs text-muted-foreground">
                    Skonfigurowany: {new Date(activeTotp[0].created_at).toLocaleDateString('pl-PL')}
                  </p>
                </div>
                <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
                  Aktywny
                </Badge>
              </>
            ) : (
              <>
                <ShieldOff className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Authenticator nieaktywny</p>
                  <p className="text-xs text-muted-foreground">
                    Nie skonfigurowano aplikacji Authenticator
                  </p>
                </div>
                <Badge variant="secondary">Nieaktywny</Badge>
              </>
            )}
          </div>

          {/* Actions for active factor */}
          {hasActiveFactor && !action && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAction('change')}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Zmień Authenticator
              </Button>
              {canRemoveTotp && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowConfirmRemove(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Usuń Authenticator
                </Button>
              )}
              {!canRemoveTotp && (
                <p className="text-xs text-muted-foreground self-center ml-2">
                  MFA jest wymagane — nie możesz usunąć authenticatora
                </p>
              )}
            </div>
          )}

          {/* No factor — allow setup */}
          {!hasActiveFactor && !action && (
            <Button onClick={() => setShowSetup(true)}>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Skonfiguruj Authenticator
            </Button>
          )}

          {/* Verification step */}
          {action && (
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <Label className="font-medium">
                {action === 'change' ? 'Potwierdź zmianę authenticatora' : 'Potwierdź usunięcie authenticatora'}
              </Label>
              <p className="text-sm text-muted-foreground">
                Wprowadź aktualny 6-cyfrowy kod z aplikacji Authenticator, aby kontynuować.
              </p>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest w-48"
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyAndAct(); }}
              />

              <div className="flex gap-2">
                <Button onClick={handleVerifyAndAct} disabled={verifyCode.length !== 6 || verifying} size="sm">
                  {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Potwierdź
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setAction(null); setVerifyCode(''); setError(null); }}>
                  Anuluj
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm remove dialog */}
      <AlertDialog open={showConfirmRemove} onOpenChange={setShowConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń Authenticator?</AlertDialogTitle>
            <AlertDialogDescription>
              Po usunięciu authenticatora Twoje konto będzie mniej chronione.
              Będziesz musiał podać aktualny kod TOTP, aby potwierdzić operację.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setAction('remove'); setShowConfirmRemove(false); }}
            >
              Kontynuuj usuwanie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};