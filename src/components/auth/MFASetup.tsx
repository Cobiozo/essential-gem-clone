import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, Loader2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MFASetupProps {
  onComplete?: () => void;
  onSkip?: () => void;
  required?: boolean;
}

export const MFASetup: React.FC<MFASetupProps> = ({ onComplete, onSkip, required = false }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'intro' | 'qr' | 'verify' | 'done'>('intro');
  const [factorId, setFactorId] = useState<string>('');
  const [qrUri, setQrUri] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);

  const startEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;

      setFactorId(data.id);
      setQrUri(data.totp.uri);
      setSecret(data.totp.secret);
      setStep('qr');
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się rozpocząć konfiguracji MFA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAndActivate = async () => {
    if (verifyCode.length !== 6) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      setStep('done');
      toast({
        title: 'MFA aktywowane',
        description: 'Uwierzytelnianie dwuskładnikowe zostało pomyślnie skonfigurowane.',
      });
      onComplete?.();
    } catch (error: any) {
      toast({
        title: 'Błąd weryfikacji',
        description: error.message || 'Nieprawidłowy kod. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">MFA aktywne</h3>
          <p className="text-sm text-muted-foreground">
            Twoje konto jest teraz chronione uwierzytelnianiem dwuskładnikowym.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === 'qr') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Krok 2: Zeskanuj kod QR
          </CardTitle>
          <CardDescription>
            Otwórz aplikację Authenticator (np. Google Authenticator) i zeskanuj poniższy kod QR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`}
              alt="QR Code for MFA"
              className="border rounded-lg"
              width={200}
              height={200}
            />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Lub wprowadź ręcznie klucz:</p>
            <code className="text-xs bg-muted px-2 py-1 rounded break-all">{secret}</code>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Wprowadź 6-cyfrowy kod z aplikacji:</label>
            <Input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
            />
          </div>
          <Button
            onClick={verifyAndActivate}
            disabled={verifyCode.length !== 6 || loading}
            className="w-full"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Weryfikuj i aktywuj MFA
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Intro step
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Uwierzytelnianie dwuskładnikowe (MFA)
          {required && <Badge variant="destructive">Wymagane</Badge>}
        </CardTitle>
        <CardDescription>
          Dodaj dodatkową warstwę bezpieczeństwa do swojego konta. Będziesz potrzebować aplikacji
          Authenticator (np. Google Authenticator, Authy).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={startEnrollment} disabled={loading} className="w-full">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Rozpocznij konfigurację MFA
        </Button>
        {!required && onSkip && (
          <Button variant="ghost" onClick={onSkip} className="w-full">
            Pomiń na razie
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
