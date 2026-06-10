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
import { PasswordInput } from '@/components/ui/password-input';

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
  const [registered, setRegistered] = useState(false);

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
    if (!firstName.trim()) {
      toast({ title: 'Brak imienia', description: 'Podaj swoje imię.', variant: 'destructive' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: 'Nieprawidłowy e-mail', description: 'Podaj prawidłowy adres e-mail.', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Hasło za krótkie', description: 'Hasło musi mieć co najmniej 8 znaków.', variant: 'destructive' });
      return;
    }
    if (!consent) {
      toast({ title: 'Wymagana zgoda', description: 'Zaakceptuj regulamin oraz politykę prywatności (RODO).', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('guest-redeem-invite', {
        body: { token, email, password, first_name: firstName, last_name: lastName },
      });

      // Try to parse server-side message even on non-2xx
      let payload: any = data;
      if (error) {
        const context = (error as any)?.context;
        const response = typeof context?.json === 'function' ? context : context?.response;
        if (response && typeof response.clone === 'function') {
          try { payload = await response.clone().json(); } catch { /* ignore */ }
        }
      }

      if (error || payload?.error) {
        const TITLES: Record<string, string> = {
          email_exists: 'Konto już istnieje',
          email_exists_contact_admin: 'Adres e-mail już zarejestrowany',
          expired: 'Link wygasł',
          exhausted: 'Limit wykorzystany',
          inactive: 'Link wyłączony',
          not_found: 'Link nie istnieje',
          invalid_token: 'Nieprawidłowy link',
          token_consumed_or_invalid: 'Link już wykorzystany',
          invalid_email: 'Nieprawidłowy e-mail',
          password_too_short: 'Hasło za krótkie',
          missing_first_name: 'Brak imienia',
          missing_token: 'Brak tokenu',
          profile_upsert_failed: 'Błąd zapisu profilu',
          create_failed: 'Nie udało się utworzyć konta',
          resolve_failed: 'Błąd weryfikacji',
          unknown: 'Rejestracja nieudana',
        };
        const code = payload?.code || payload?.error || 'unknown';
        const message = payload?.message
          || (typeof payload?.error === 'string' && payload.error.includes(' ') ? payload.error : null)
          || 'Rejestracja nieudana. Spróbuj ponownie lub skontaktuj się z administratorem.';
        toast({
          title: TITLES[code] || 'Rejestracja nieudana',
          description: (code === 'email_exists' || code === 'email_exists_contact_admin') ? (
            <div className="space-y-3">
              <p>{message}</p>
              {code === 'email_exists' ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => navigate('/auth')}>
                  Przejdź do logowania
                </Button>
              ) : (
                <a href="mailto:kontakt@purelife.center" className="text-sm underline">
                  Napisz do administratora
                </a>
              )}
            </div>
          ) : message,
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }
      setRegistered(true);
      setSubmitting(false);
    } catch (err: any) {
      toast({ title: 'Błąd połączenia', description: 'Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj ponownie.', variant: 'destructive' });
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

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sprawdź skrzynkę pocztową</CardTitle>
            <CardDescription>
              Wysłaliśmy link aktywacyjny na adres <strong>{email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Aby dokończyć rejestrację:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Otwórz skrzynkę pocztową.</li>
              <li>Sprawdź również folder <strong>SPAM</strong> oraz <strong>Oferty / Powiadomienia</strong>.</li>
              <li>Kliknij przycisk <strong>„Potwierdzam adres e-mail”</strong> w wiadomości.</li>
              <li>Po potwierdzeniu wróć tutaj i zaloguj się.</li>
            </ol>
            <Button className="w-full mt-4" onClick={() => navigate('/auth')}>
              Przejdź do logowania
            </Button>
          </CardContent>
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
              <PasswordInput id="pw" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
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
