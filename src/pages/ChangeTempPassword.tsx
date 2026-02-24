import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X, Eye, EyeOff, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-muted-foreground'}`}>
    {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-destructive" />}
    <span>{text}</span>
  </div>
);

const ChangeTempPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTemp, setShowTemp] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isValid = hasMinLength && hasUpperCase && hasDigit && passwordsMatch && email.trim() && tempPassword.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError('');

    try {
      // Step 1: Sign in with temporary password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: tempPassword,
      });

      if (signInError) {
        setError('Nieprawidłowy email lub hasło tymczasowe. Sprawdź dane z wiadomości email.');
        setLoading(false);
        return;
      }

      // Step 2: Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError('Nie udało się ustawić nowego hasła. Spróbuj ponownie.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Step 3: Sign out
      await supabase.auth.signOut();

      // Step 4: Redirect to login with success message
      navigate('/auth', { 
        state: { passwordChanged: true },
        replace: true,
      });
    } catch {
      setError('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Zmiana hasła tymczasowego</CardTitle>
          <CardDescription>
            Wpisz hasło tymczasowe z wiadomości email, a następnie ustal nowe hasło
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Adres email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.pl"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tempPassword">Hasło tymczasowe</Label>
              <div className="relative">
                <Input
                  id="tempPassword"
                  type={showTemp ? 'text' : 'password'}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Hasło z wiadomości email"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowTemp(!showTemp)}
                  tabIndex={-1}
                >
                  {showTemp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nowe hasło</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ustaw nowe hasło"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNew(!showNew)}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="space-y-1 mt-1">
                <PasswordRequirement met={hasMinLength} text="Minimum 8 znaków" />
                <PasswordRequirement met={hasUpperCase} text="Wielka litera" />
                <PasswordRequirement met={hasDigit} text="Cyfra" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Powtórz nowe hasło</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Powtórz nowe hasło"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && (
                <PasswordRequirement met={passwordsMatch} text={passwordsMatch ? "Hasła są zgodne" : "Hasła nie są zgodne"} />
              )}
            </div>

            <Button type="submit" className="w-full" disabled={!isValid || loading}>
              {loading ? 'Zmieniam hasło...' : 'Ustaw nowe hasło'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Masz już nowe hasło?{' '}
              <button type="button" onClick={() => navigate('/auth')} className="text-primary hover:underline">
                Zaloguj się
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangeTempPassword;
