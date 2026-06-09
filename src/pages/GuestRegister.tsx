import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const GuestRegister: React.FC = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tokenValid, setTokenValid] = useState<null | boolean>(null);
  const [tokenLabel, setTokenLabel] = useState<string | null>(null);
  const [tokenReason, setTokenReason] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc('resolve_guest_invite', { _token: token });
      const row = Array.isArray(data) ? data[0] : data;
      setTokenValid(Boolean(row?.is_valid));
      setTokenLabel(row?.label ?? null);
      setTokenReason(row?.reason ?? null);
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast({ title: 'Wymagana zgoda', description: 'Zaakceptuj regulamin i politykę prywatności.', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Hasło za krótkie', description: 'Minimum 8 znaków.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('guest-redeem-invite', {
        body: { token, email, password, first_name: firstName, last_name: lastName },
      });
      if (error || data?.error) {
        toast({ title: 'Rejestracja nieudana', description: data?.error || error?.message || 'Spróbuj ponownie.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      // Sign in
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) {
        toast({ title: 'Zaloguj się', description: 'Konto utworzone. Zaloguj się ręcznie.', });
        navigate('/auth');
        return;
      }
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Błąd', description: String(err?.message || err), variant: 'destructive' });
      setSubmitting(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Zaproszenie nieaktywne</CardTitle>
            <CardDescription>
              {tokenReason === 'expired' && 'Ten link wygasł.'}
              {tokenReason === 'exhausted' && 'Limit użyć tego linku został wyczerpany.'}
              {tokenReason === 'inactive' && 'Ten link został wyłączony przez administratora.'}
              {(!tokenReason || tokenReason === 'not_found') && 'Link nie istnieje lub jest niepoprawny.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Rejestracja gościa</CardTitle>
          <CardDescription>
            {tokenLabel ? `Zaproszenie: ${tokenLabel}` : 'Utwórz konto gościa, by uzyskać dostęp.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fn">Imię *</Label>
                <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={60} />
              </div>
              <div>
                <Label htmlFor="ln">Nazwisko</Label>
                <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} />
              </div>
            </div>
            <div>
              <Label htmlFor="em">Email *</Label>
              <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="pw">Hasło * (min. 8 znaków)</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="cons" checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} />
              <Label htmlFor="cons" className="text-sm font-normal leading-snug">
                Akceptuję regulamin oraz politykę prywatności (RODO).
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Utwórz konto gościa'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GuestRegister;
