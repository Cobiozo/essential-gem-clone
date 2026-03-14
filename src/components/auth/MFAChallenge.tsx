import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Mail, Smartphone, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TOTPSetup } from './TOTPSetup';
import { MFAEmergencyScreen } from './MFAEmergencyScreen';

interface MFAChallengeProps {
  onVerified: () => void;
}

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

  useEffect(() => {
    const init = async () => {
      const { data: mfaConfigRaw, error: configError } = await supabase.rpc('get_my_mfa_config');
      const mfaConfig = mfaConfigRaw as unknown as { required: boolean; method: string; role: string } | null;
      
      let method: 'totp' | 'email' | 'both' = 'email';
      if (!configError && mfaConfig?.method) {
        method = mfaConfig.method as 'totp' | 'email' | 'both';
      }
      setMfaMethod(method);

      // Check for TOTP factors
      const { data, error } = await supabase.auth.mfa.listFactors();
      const hasVerifiedTotp = !error && data?.totp?.some(f => f.status === 'verified');
      
      if (hasVerifiedTotp) {
        const verified = data!.totp.find((f) => f.status === 'verified');
        if (verified) setFactorId(verified.id);
      }

      // If method requires TOTP but user hasn't enrolled yet → show setup
      if ((method === 'totp' || method === 'both') && !hasVerifiedTotp) {
        if (method === 'totp') {
          // TOTP only — must setup
          setNeedsTotpSetup(true);
          setInitializing(false);
          return;
        }
        // 'both' but no TOTP — default to email, allow setup later
      }

      // Set default active method and auto-send email code
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
    setActiveMethod('email');
    setCode('');
    setCodeSent(false);
    setSendError(null);
    sendEmailCodeDirect();
  };

  const sendEmailCodeDirect = async () => {
    setSendingCode(true);
    setSendError(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-mfa-code');
      if (error) throw error;
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
      if (data?.error) throw new Error(data.error);
      setMaskedEmail(data?.email || '');
      setCodeSent(true);
      toast({ title: 'Kod wysłany', description: `Sprawdź swoją skrzynkę email (${data?.email || ''})` });
    } catch (err: any) {
      setSendError(err?.message || 'Nie udało się wysłać kodu.');
      toast({ title: 'Błąd', description: 'Nie udało się wysłać kodu. Spróbuj ponownie.', variant: 'destructive' });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!factorId || code.length !== 6) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;
      onVerified();
    } catch {
      toast({ title: 'Błąd weryfikacji', description: 'Nieprawidłowy kod. Spróbuj ponownie.', variant: 'destructive' });
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-mfa-code', {
        body: { code },
      });
      if (error) throw error;
      if (data?.valid) {
        onVerified();
      } else {
        throw new Error('Invalid code');
      }
    } catch {
      toast({ title: 'Błąd weryfikacji', description: 'Nieprawidłowy lub wygasły kod. Spróbuj ponownie.', variant: 'destructive' });
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => {
    if (activeMethod === 'totp') {
      handleVerifyTotp();
    } else {
      handleVerifyEmail();
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show TOTP enrollment if needed
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
            <Button onClick={sendEmailCode} disabled={sendingCode} className="w-full">
              {sendingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              {sendError ? 'Spróbuj ponownie' : 'Wyślij kod na email'}
            </Button>
          )}

          {/* Code input */}
          {(activeMethod === 'totp' || (codeSent && !sendError)) && (
            <>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
              />
              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || loading || (activeMethod === 'totp' && !factorId)}
                className="w-full"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Weryfikuj
              </Button>
            </>
          )}

          {/* Resend for email */}
          {activeMethod === 'email' && codeSent && !sendError && (
            <Button variant="ghost" size="sm" onClick={sendEmailCode} disabled={sendingCode} className="w-full">
              {sendingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Wyślij kod ponownie
            </Button>
          )}

          {/* Emergency fallback: TOTP users who lost access */}
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
