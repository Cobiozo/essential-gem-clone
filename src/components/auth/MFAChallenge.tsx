import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MFAChallengeProps {
  onVerified: () => void;
}

export const MFAChallenge: React.FC<MFAChallengeProps> = ({ onVerified }) => {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    const getFactors = async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data?.totp && data.totp.length > 0) {
        const verified = data.totp.find((f) => f.status === 'verified');
        if (verified) {
          setFactorId(verified.id);
        }
      }
    };
    getFactors();
  }, []);

  const handleVerify = async () => {
    if (!factorId || code.length !== 6) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      onVerified();
    } catch (error: any) {
      toast({
        title: 'Błąd weryfikacji',
        description: 'Nieprawidłowy kod. Spróbuj ponownie.',
        variant: 'destructive',
      });
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-2 text-primary" />
          <CardTitle>Weryfikacja dwuskładnikowa</CardTitle>
          <CardDescription>
            Wprowadź 6-cyfrowy kod z aplikacji Authenticator, aby kontynuować.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="text-center text-2xl tracking-widest"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleVerify();
            }}
          />
          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || loading || !factorId}
            className="w-full"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Weryfikuj
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
