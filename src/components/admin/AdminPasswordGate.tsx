import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SS_UNLOCKED = 'admin_cms_unlocked_at';
const SS_FAILED = 'admin_cms_failed_count';
const SS_LOCK_UNTIL = 'admin_cms_lock_until';
const MAX_TRIES = 5;
const LOCK_SECONDS = 60;
const SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 min

export const isAdminGateUnlocked = (): boolean => {
  try {
    const ts = Number(sessionStorage.getItem(SS_UNLOCKED) || 0);
    if (!ts) return false;
    if (Date.now() - ts > SESSION_MAX_AGE_MS) {
      sessionStorage.removeItem(SS_UNLOCKED);
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const lockAdminGate = () => {
  try {
    sessionStorage.removeItem(SS_UNLOCKED);
  } catch { /* noop */ }
};

interface Props {
  onUnlock: () => void;
}

export const AdminPasswordGate: React.FC<Props> = ({ onUnlock }) => {
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockRemain, setLockRemain] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Countdown for lockout
  useEffect(() => {
    const tick = () => {
      const until = Number(sessionStorage.getItem(SS_LOCK_UNTIL) || 0);
      const remain = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLockRemain(remain);
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockRemain > 0 || loading) return;
    if (!user?.email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signErr) {
        const failed = Number(sessionStorage.getItem(SS_FAILED) || 0) + 1;
        sessionStorage.setItem(SS_FAILED, String(failed));
        if (failed >= MAX_TRIES) {
          const until = Date.now() + LOCK_SECONDS * 1000;
          sessionStorage.setItem(SS_LOCK_UNTIL, String(until));
          sessionStorage.setItem(SS_FAILED, '0');
          setLockRemain(LOCK_SECONDS);
          setError(`Zbyt wiele prób. Spróbuj ponownie za ${LOCK_SECONDS} s.`);
        } else {
          setError(`Nieprawidłowe hasło. Pozostało prób: ${MAX_TRIES - failed}.`);
        }
        setPassword('');
      } else {
        sessionStorage.setItem(SS_UNLOCKED, String(Date.now()));
        sessionStorage.setItem(SS_FAILED, '0');
        sessionStorage.removeItem(SS_LOCK_UNTIL);
        setPassword('');
        onUnlock();
      }
    } catch (err: any) {
      setError('Wystąpił błąd weryfikacji. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[hsl(225,50%,6%)] via-[hsl(225,40%,8%)] to-[hsl(230,35%,5%)]">
      <Card className="w-full max-w-md border-border/50 shadow-2xl backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/30">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Dostęp do panelu CMS</CardTitle>
          <CardDescription>
            Aby kontynuować, potwierdź swoje hasło administratora — to samo, którym logujesz się do aplikacji.
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
              <Label htmlFor="admin-gate-email">Konto administratora</Label>
              <Input
                id="admin-gate-email"
                value={user?.email ?? ''}
                disabled
                readOnly
                className="bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-gate-pw">Hasło</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-gate-pw"
                  ref={inputRef}
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Wpisz hasło"
                  className="pl-9 pr-10"
                  disabled={loading || lockRemain > 0}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw((s) => !s)}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || lockRemain > 0 || !password}
            >
              {lockRemain > 0
                ? `Zablokowane (${lockRemain}s)`
                : loading
                ? 'Weryfikuję...'
                : 'Odblokuj panel'}
            </Button>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <button
                type="button"
                onClick={() => (window.location.href = '/dashboard')}
                className="hover:text-foreground transition-colors"
              >
                ← Powrót do pulpitu
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="hover:text-foreground transition-colors"
              >
                Wyloguj
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPasswordGate;
