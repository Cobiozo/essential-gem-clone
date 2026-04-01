import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Mail, Smartphone, AlertCircle, Clock } from 'lucide-react';
import { PinKeypad } from './PinKeypad';
import { useToast } from '@/hooks/use-toast';
import { TOTPSetup } from './TOTPSetup';
import { MFAEmergencyScreen } from './MFAEmergencyScreen';

interface MFAChallengeProps {
  onVerified: () => void;
}

const LOCKOUT_THRESHOLD = 3;
const LOCKOUT_DURATION_SECONDS = 60;
const AUTO_LOGOUT_THRESHOLD = 5;

export const MFAChallenge: React.FC<MFAChallengeProps> = ({ onVerified }) => {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'email' | 'both'>('email');
  const [activeMethod, setActiveMethod] = useState<'totp' | 'email'>('email');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const [needsTotpSetup, setNeedsTotpSetup] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const sendCodeCalledRef = useRef(false);
  
  // Lockout state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLockoutSeconds(0);
      } else {
        setLockoutSeconds(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleFailedAttempt = useCallback(async () => {
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);

    if (newCount >= AUTO_LOGOUT_THRESHOLD) {
      toast({ 
        title: 'Konto tymczasowo zablokowane', 
        description: 'Zbyt wiele nieudanych prób. Zostaniesz wylogowany.',
        variant: 'destructive' 
      });
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.reload();
      }, 2000);
      return;
    }

    if (newCount >= LOCKOUT_THRESHOLD && newCount % LOCKOUT_THRESHOLD === 0) {
      const until = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
      setLockoutUntil(until);
      setLockoutSeconds(LOCKOUT_DURATION_SECONDS);
      toast({ 
        title: 'Tymczasowa blokada', 
        description: `Zbyt wiele nieudanych prób. Odczekaj ${LOCKOUT_DURATION_SECONDS} sekund.`,
        variant: 'destructive' 
      });
    }
  }, [failedAttempts, toast]);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  useEffect(() => {
    const init = async () => {
      const { data: mfaConfigRaw, error: configError } = await supabase.rpc('get_my_mfa_config');
      const mfaConfig = mfaConfigRaw as unknown as { required: boolean; method: string; role: string } | null;
      
      let method: 'totp' | 'email' | 'both' = 'email';
      if (!configError && mfaConfig?.method) {
        method = mfaConfig.method as 'totp' | 'email' | 'both';
      }
      setMfaMethod(method);

      const { data, error } = await supabase.auth.mfa.listFactors();
      const hasVerifiedTotp = !error && data?.totp?.some(f => f.status === 'verified');
      
      if (hasVerifiedTotp) {
        const verified = data!.totp.find((f) => f.status === 'verified');
        if (verified) setFactorId(verified.id);
      }

      if ((method === 'totp' || method === 'both') && !hasVerifiedTotp) {
        if (method === 'totp') {
          setNeedsTotpSetup(true);
          setInitializing(false);
          return;
        }
      }

      if (method === 'email') {
        setActiveMethod('email');
        setInitializing(false);
        if (!sendCodeCalledRef.current) {
          sendCodeCalledRef.current = true;
          sendEmailCodeDirect();
        }
        return;
      } else if (method === 'both') {
        const defaultMethod = hasVerifiedTotp ? 'totp' : 'email';
        setActiveMethod(defaultMethod);
        if (defaultMethod === 'email') {
          setInitializing(false);
          if (!sendCodeCalledRef.current) {
            sendCodeCalledRef.current = true;
            sendEmailCodeDirect();
          }
          return;
        }
      } else {
        setActiveMethod('totp');
      }

      setInitializing(false);
    };
    init();
  }, []);

  const handleFallbackToEmail = () => {
    setShowEmergency(true);
  };

  const sendEmailCodeDirect = async () => {
    setSendingCode(true);
    setSendError(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-mfa-code');
      if (error) throw error;
      if (data?.rate_limited) throw new Error(data.error);
      if (data?.error) throw new Error(data.error);
      setMaskedEmail(data?.email || '');
      setCodeSent(true);
    } catch (err: any) {
      console.error('[MFA] Failed to send code:', err);
      setSendError(err?.message || 'Nie udało się wysłać kodu. Spróbuj ponownie.');
    } finally {
      setSendingCode(false);
    }
  };

  const sendEmailCode = async () => {
    setSendingCode(true);
    setSendError(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-mfa-code');
      if (error) throw error;
      if (data?.rate_limited) throw new Error(data.error);
      if (data?.error) throw new Error(data.error);
      setMaskedEmail(data?.email || '');
      setCodeSent(true);
      toast({ title: 'Kod wysłany', description: `Sprawdź swoją skrzynkę email (${data?.email || ''})` });
    } catch (err: any) {
      setSendError(err?.message || 'Nie udało się wysłać kodu.');
      toast({ title: 'Błąd', description: err?.message || 'Nie udało się wysłać kodu.', variant: 'destructive' });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyTotp = async (pinCode: string) => {
    if (!factorId || pinCode.length !== 6 || isLockedOut) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: pinCode,
      });
      if (verifyError) throw verifyError;
      onVerified();
    } catch {
      toast({ title: 'Błąd weryfikacji', description: 'Nieprawidłowy kod. Spróbuj ponownie.', variant: 'destructive' });
      handleFailedAttempt();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (pinCode: string) => {
    if (pinCode.length !== 6 || isLockedOut) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-mfa-code', {
        body: { code: pinCode },
      });
      if (error) throw error;
      if (data?.rate_limited) {
        toast({ title: 'Zbyt wiele prób', description: data.error, variant: 'destructive' });
        return;
      }
      if (data?.valid) {
        onVerified();
      } else {
        throw new Error('Invalid code');
      }
    } catch {
      toast({ title: 'Błąd weryfikacji', description: 'Nieprawidłowy lub wygasły kod. Spróbuj ponownie.', variant: 'destructive' });
      handleFailedAttempt();
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (needsTotpSetup) {
    return (
      <TOTPSetup
        onSetupComplete={onVerified}
        allowEmailFallback={mfaMethod === 'both'}
        onSkipToEmail={() => {
          setNeedsTotpSetup(false);
          setActiveMethod('email');
          if (!sendCodeCalledRef.current) {
            sendCodeCalledRef.current = true;
            sendEmailCodeDirect();
          }
        }}
      />
    );
  }

  if (showEmergency) {
    return (
      <MFAEmergencyScreen
        onResetComplete={() => {
          setShowEmergency(false);
          setNeedsTotpSetup(true);
        }}
        onBack={() => setShowEmergency(false)}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-2 text-primary" />
          <CardTitle>Weryfikacja dwuskładnikowa</CardTitle>
          <CardDescription>
            {activeMethod === 'totp'
              ? 'Wprowadź 6-cyfrowy kod z aplikacji Authenticator.'
              : codeSent
                ? `Wprowadź 6-cyfrowy kod wysłany na ${maskedEmail}`
                : 'Wyślij kod weryfikacyjny na swój adres email.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lockout warning */}
          {isLockedOut && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Tymczasowa blokada. Spróbuj ponownie za {lockoutSeconds}s.</span>
            </div>
          )}

          {/* Failed attempts warning */}
          {failedAttempts >= 2 && !isLockedOut && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Nieudane próby: {failedAttempts}/{AUTO_LOGOUT_THRESHOLD}. Po {AUTO_LOGOUT_THRESHOLD} nastąpi wylogowanie.</span>
            </div>
          )}

          {/* Method selector for 'both' */}
          {mfaMethod === 'both' && (
            <div className="flex gap-2">
              <Button
                variant={activeMethod === 'totp' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => {
                  if (!factorId) {
                    setNeedsTotpSetup(true);
                    return;
                  }
                  setActiveMethod('totp'); setCode(''); setCodeSent(false); setSendError(null);
                }}
              >
                <Smartphone className="w-4 h-4 mr-1" />
                Authenticator
              </Button>
              <Button
                variant={activeMethod === 'email' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => { setActiveMethod('email'); setCode(''); setCodeSent(false); setSendError(null); }}
              >
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
            </div>
          )}

          {/* Error message */}
          {sendError && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{sendError}</span>
            </div>
          )}

          {/* Email: send code button */}
          {activeMethod === 'email' && (!codeSent || sendError) && (
            <Button onClick={sendEmailCode} disabled={sendingCode || isLockedOut} className="w-full">
              {sendingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              {sendError ? 'Spróbuj ponownie' : 'Wyślij kod na email'}
            </Button>
          )}

          {/* Code input */}
          {(activeMethod === 'totp' || (codeSent && !sendError)) && (
            <PinKeypad
              onComplete={(pinCode) => {
                setCode(pinCode);
                if (activeMethod === 'totp') {
                  handleVerifyTotp();
                } else {
                  handleVerifyEmail();
                }
              }}
              loading={loading}
              disabled={isLockedOut || (activeMethod === 'totp' && !factorId)}
              submitLabel="Weryfikuj"
              resetKey={failedAttempts}
            />
          )}

          {/* Resend for email */}
          {activeMethod === 'email' && codeSent && !sendError && (
            <Button variant="ghost" size="sm" onClick={sendEmailCode} disabled={sendingCode || isLockedOut} className="w-full">
              {sendingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Wyślij kod ponownie
            </Button>
          )}

          {/* Emergency fallback */}
          {activeMethod === 'totp' && mfaMethod !== 'email' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFallbackToEmail}
              className="w-full text-muted-foreground"
            >
              <Mail className="w-4 h-4 mr-1" />
              Nie mam dostępu do Authenticatora
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
