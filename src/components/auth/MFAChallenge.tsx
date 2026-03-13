import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Mail, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type MfaMethod = 'totp' | 'email' | 'both';

interface MFAChallengeProps {
  onVerified: () => void;
}

export const MFAChallenge: React.FC<MFAChallengeProps> = ({ onVerified }) => {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>('totp');
  const [activeMethod, setActiveMethod] = useState<'totp' | 'email'>('totp');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Get MFA method from settings
      const { data: settings } = await supabase
        .from('security_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['mfa_method']);

      const methodSetting = settings?.find(s => s.setting_key === 'mfa_method');
      const method = (typeof methodSetting?.setting_value === 'string' ? methodSetting.setting_value : 'totp') as MfaMethod;
      setMfaMethod(method);

      // Check for TOTP factors
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data?.totp && data.totp.length > 0) {
        const verified = data.totp.find((f) => f.status === 'verified');
        if (verified) {
          setFactorId(verified.id);
        }
      }

      // Set default active method and auto-send email code
      if (method === 'email') {
        setActiveMethod('email');
        // Auto-send email code when method is email-only
        setInitializing(false);
        sendEmailCodeDirect();
        return;
      } else if (method === 'both') {
        const hasTotp = !error && data?.totp?.some(f => f.status === 'verified');
        const defaultMethod = hasTotp ? 'totp' : 'email';
        setActiveMethod(defaultMethod);
        if (defaultMethod === 'email') {
          setInitializing(false);
          sendEmailCodeDirect();
          return;
        }
      } else {
        setActiveMethod('totp');
      }

      setInitializing(false);
    };
    init();
  }, []);

  // Direct send without toast (for auto-trigger on mount)
  const sendEmailCodeDirect = async () => {
    setSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-mfa-code');
      if (error) throw error;
      setMaskedEmail(data?.email || '');
      setCodeSent(true);
    } catch {
      // silent on auto-send
    } finally {
      setSendingCode(false);
    }
  };

  const sendEmailCode = async () => {
    setSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-mfa-code');
      if (error) throw error;
      setMaskedEmail(data?.email || '');
      setCodeSent(true);
      toast({ title: 'Kod wysłany', description: `Sprawdź swoją skrzynkę email (${data?.email || ''})` });
    } catch (error: any) {
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
                onClick={() => { setActiveMethod('totp'); setCode(''); setCodeSent(false); }}
              >
                <Smartphone className="w-4 h-4 mr-1" />
                Authenticator
              </Button>
              <Button
                variant={activeMethod === 'email' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => { setActiveMethod('email'); setCode(''); setCodeSent(false); }}
              >
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
            </div>
          )}

          {/* Email: send code button */}
          {activeMethod === 'email' && !codeSent && (
            <Button onClick={sendEmailCode} disabled={sendingCode} className="w-full">
              {sendingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Wyślij kod na email
            </Button>
          )}

          {/* Code input (show for TOTP always, for email only after sent) */}
          {(activeMethod === 'totp' || codeSent) && (
            <>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                autoFocus
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
          {activeMethod === 'email' && codeSent && (
            <Button variant="ghost" size="sm" onClick={sendEmailCode} disabled={sendingCode} className="w-full">
              {sendingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Wyślij kod ponownie
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
