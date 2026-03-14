import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle, RotateCcw, MessageSquare, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MFAEmergencyScreen } from './MFAEmergencyScreen';
import pureLifeLogo from '@/assets/pure-life-logo-new.png';

interface TOTPSetupProps {
  onSetupComplete: () => void;
  onSkipToEmail?: () => void;
  allowEmailFallback?: boolean;
}

export const TOTPSetup: React.FC<TOTPSetupProps> = ({ onSetupComplete, onSkipToEmail, allowEmailFallback }) => {
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAlreadyExistsError, setHasAlreadyExistsError] = useState(false);
  const [emergencyScreen, setEmergencyScreen] = useState<'reset' | 'support' | null>(null);

  const enrollTotp = useCallback(async () => {
    setEnrolling(true);
    setError(null);
    setHasAlreadyExistsError(false);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email || '';
      const userId = userData?.user?.id;

      let eqId = '';
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('eq_id')
          .eq('user_id', userId)
          .single();
        eqId = profile?.eq_id || '';
      }

      let data: any;
      let enrollError: any;
      
      ({ data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Pure Life Center',
        issuer: 'Pure Life Center',
      }));

      if (enrollError?.message?.includes('already exists')) {
        const { data: existingFactors } = await supabase.auth.mfa.listFactors();
        if (existingFactors?.totp) {
          for (const factor of existingFactors.totp) {
            if ((factor as any).status !== 'verified') {
              await supabase.auth.mfa.unenroll({ factorId: factor.id });
            }
          }
        }
        ({ data, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Pure Life Center',
          issuer: 'Pure Life Center',
        }));
      }
      
      if (enrollError) {
        if (enrollError.message?.includes('already exists')) {
          setHasAlreadyExistsError(true);
        }
        throw enrollError;
      }

      setSecret(data.totp.secret);
      setFactorId(data.id);

      const label = eqId ? `${eqId} (${userEmail})` : userEmail;
      const customUri = `otpauth://totp/Pure%20Life%20Center:${encodeURIComponent(label)}?secret=${data.totp.secret}&issuer=Pure%20Life%20Center`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(customUri)}`;
      setQrCode(qrUrl);
    } catch (err: any) {
      console.error('[TOTP] Enrollment error:', err);
      setError(err.message || 'Nie udało się zainicjować konfiguracji TOTP');
    } finally {
      setEnrolling(false);
    }
  }, []);

  useEffect(() => {
    enrollTotp();
  }, [enrollTotp]);

  const verifyAndActivate = async () => {
    if (!factorId || code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      toast({ title: 'Authenticator skonfigurowany', description: 'Weryfikacja dwuskładnikowa została aktywowana.' });
      onSetupComplete();
    } catch (err: any) {
      setError('Nieprawidłowy kod. Upewnij się, że zeskanowałeś kod QR i wprowadź aktualny 6-cyfrowy kod.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  // Show emergency screen (reset or support)
  if (emergencyScreen) {
    return (
      <MFAEmergencyScreen
        initialTab={emergencyScreen}
        onResetComplete={() => {
          setEmergencyScreen(null);
          setQrCode(null);
          setSecret(null);
          setFactorId(null);
          setCode('');
          enrollTotp();
        }}
        onBack={() => setEmergencyScreen(null)}
      />
    );
  }

  if (enrolling) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={pureLifeLogo} alt="Pure Life Center" className="w-16 h-16 mx-auto mb-2 object-contain" />
          <CardTitle>Konfiguracja Authenticator</CardTitle>
          <CardDescription>
            Zeskanuj kod QR w aplikacji Google Authenticator, Authy lub Microsoft Authenticator, a następnie wprowadź wygenerowany 6-cyfrowy kod.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Emergency section on already-exists error or general error */}
          {(hasAlreadyExistsError || (error && !qrCode)) && (
            <div className="space-y-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Opcje awaryjne</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Jeśli usunąłeś wpis w Authy/Authenticator i nie masz kodu — użyj resetu email albo zgłoś problem do support.
              </p>
              <Button
                onClick={() => setEmergencyScreen('reset')}
                variant="default"
                size="sm"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Resetuj Authenticator przez Email
              </Button>
              <Button
                onClick={() => setEmergencyScreen('support')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Zgłoś problem do Support
              </Button>
            </div>
          )}

          {qrCode && (
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code do zeskanowania" className="w-48 h-48 rounded-lg border" />
            </div>
          )}

          {secret && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Lub wprowadź klucz ręcznie:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded select-all break-all">{secret}</code>
            </div>
          )}

          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="text-center text-2xl tracking-widest"
            autoFocus
            autoComplete="one-time-code"
            inputMode="numeric"
            onKeyDown={(e) => { if (e.key === 'Enter') verifyAndActivate(); }}
          />

          <Button
            onClick={verifyAndActivate}
            disabled={code.length !== 6 || loading}
            className="w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Aktywuj Authenticator
          </Button>

          {allowEmailFallback && onSkipToEmail && (
            <Button variant="ghost" size="sm" onClick={onSkipToEmail} className="w-full">
              Użyj kodu email zamiast tego
            </Button>
          )}

          {/* Always-visible emergency links at bottom */}
          {qrCode && (
            <div className="pt-2 border-t space-y-1">
              <p className="text-xs text-muted-foreground text-center mb-2">Problemy z Authenticatorem?</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setEmergencyScreen('reset')}
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset przez Email
                </Button>
                <Button
                  onClick={() => setEmergencyScreen('support')}
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Support
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
