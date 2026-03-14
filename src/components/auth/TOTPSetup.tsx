import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    enrollTotp();
  }, []);

  const enrollTotp = async () => {
    setEnrolling(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (err: any) {
      console.error('[TOTP] Enrollment error:', err);
      setError(err.message || 'Nie udało się zainicjować konfiguracji TOTP');
    } finally {
      setEnrolling(false);
    }
  };

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
          <Shield className="w-12 h-12 mx-auto mb-2 text-primary" />
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
        </CardContent>
      </Card>
    </div>
  );
};
