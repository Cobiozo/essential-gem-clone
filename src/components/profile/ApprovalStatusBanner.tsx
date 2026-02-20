import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, CheckCircle, UserCheck, ShieldCheck, LogOut, Mail, RefreshCw, AlertTriangle, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ApprovalStatusBanner: React.FC = () => {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleLogoutAndReturn = async () => {
    await signOut();
    navigate('/');
  };

  const handleResendActivation = async () => {
    if (!user) return;
    setResending(true);
    try {
      const { error } = await supabase.functions.invoke('send-activation-email', {
        body: { user_id: user.id, resend: true },
      });
      if (error) throw error;
      setResent(true);
      toast.success('Email aktywacyjny został wysłany ponownie. Sprawdź skrzynkę odbiorczą.');
    } catch (err) {
      toast.error('Nie udało się wysłać emaila. Spróbuj ponownie za chwilę.');
    } finally {
      setResending(false);
    }
  };

  if (!profile) return null;

  const emailActivated = profile.email_activated === true;
  const guardianApproved = profile.guardian_approved === true;
  const adminApproved = profile.admin_approved === true;
  // leader_approved = null → brak lidera w ścieżce; false → lider wyznaczony, czeka; true → lider zatwierdził
  const leaderApproved = profile.leader_approved;
  const awaitingLeader = leaderApproved === false; // lider w ścieżce, jeszcze nie zatwierdził

  // If fully approved, don't show banner
  if (emailActivated && guardianApproved && adminApproved) {
    return null;
  }

  const guardianName = profile.upline_first_name && profile.upline_last_name
    ? `${profile.upline_first_name} ${profile.upline_last_name}`
    : profile.guardian_name || 'Opiekun';

  const uplineEqId = profile.upline_eq_id;

  // Case 0: Email not confirmed yet
  if (!emailActivated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-950/20">
            <Mail className="h-5 w-5 text-purple-600" />
            <AlertTitle className="text-purple-800 dark:text-purple-200 text-lg font-semibold">
              Potwierdź swój adres email
            </AlertTitle>
            <AlertDescription className="text-purple-700 dark:text-purple-300 mt-3 space-y-3">
              <div className="flex items-start gap-2 text-base">
                <span>
                  Wysłaliśmy link aktywacyjny na adres{' '}
                  <span className="font-semibold">{user?.email}</span>.
                  Kliknij w link w wiadomości, aby potwierdzić swój adres email i przejść dalej.
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-2 p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <AlertTriangle className="h-4 w-4 shrink-0 text-purple-600" />
                <span>Nie widzisz emaila? Sprawdź folder <strong>SPAM</strong> lub <strong>Oferty</strong>.</span>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-300 dark:border-purple-700 flex flex-col gap-2">
                {resent ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Email aktywacyjny wysłany ponownie!
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendActivation}
                    disabled={resending}
                    className="gap-2 border-purple-400 text-purple-700 hover:bg-purple-100 dark:text-purple-300 dark:border-purple-600 dark:hover:bg-purple-900/30"
                  >
                    <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Wysyłanie...' : 'Wyślij ponownie email aktywacyjny'}
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center animate-pulse">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">Email</span>
            </div>
            <div className="h-0.5 w-8 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Opiekun</span>
            </div>
            <div className="h-0.5 w-8 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Admin</span>
            </div>
            <div className="h-0.5 w-8 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Gotowe</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={handleLogoutAndReturn}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Powrót do strony głównej
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Case 1: Waiting for guardian approval
  if (!guardianApproved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <Clock className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200 text-lg font-semibold">
              Twoja rejestracja oczekuje na zatwierdzenie
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300 mt-3 space-y-3">
              <div className="flex items-center gap-2 text-base">
                <span className="font-medium">Status:</span>
                <span>Oczekiwanie na zatwierdzenie Opiekuna</span>
              </div>
              <div className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4" />
                <span className="font-medium">Opiekun:</span>
                <span>{guardianName} {uplineEqId ? `(${uplineEqId})` : ''}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-300 dark:border-amber-700">
                <p className="text-sm">
                  Po zatwierdzeniu przez Opiekuna, Twoje konto zostanie przekazane do Administratora do ostatecznej weryfikacji.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">Email</span>
            </div>
            <div className="h-0.5 w-8 bg-green-500" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">Opiekun</span>
            </div>
            <div className="h-0.5 w-8 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Admin</span>
            </div>
            <div className="h-0.5 w-8 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Gotowe</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={handleLogoutAndReturn}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Powrót do strony głównej
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Guardian approved, leader in path — waiting for leader OR admin
  if (awaitingLeader) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <Alert className="border-violet-500 bg-violet-50 dark:bg-violet-950/20">
            <Crown className="h-5 w-5 text-violet-600" />
            <AlertTitle className="text-violet-800 dark:text-violet-200 text-lg font-semibold">
              Opiekun zatwierdził Twoją rejestrację!
            </AlertTitle>
            <AlertDescription className="text-violet-700 dark:text-violet-300 mt-3 space-y-3">
              <div className="flex items-center gap-2 text-base">
                <span className="font-medium">Status:</span>
                <span>Oczekiwanie na zatwierdzenie Lidera lub Administratora</span>
              </div>
              <div className="mt-4 pt-3 border-t border-violet-300 dark:border-violet-700">
                <p className="text-sm">
                  Twój opiekun zatwierdził Twoją rejestrację. Teraz Lider lub Administrator musi zatwierdzić Twoje konto, abyś mógł w pełni korzystać z systemu.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">Email</span>
            </div>
            <div className="h-0.5 w-8 bg-green-500" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">Opiekun</span>
            </div>
            <div className="h-0.5 w-8 bg-green-500" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center animate-pulse">
                <Crown className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">Lider/Admin</span>
            </div>
            <div className="h-0.5 w-8 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Gotowe</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={handleLogoutAndReturn} className="gap-2">
              <LogOut className="h-4 w-4" />
              Powrót do strony głównej
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Guardian approved, no leader in path — waiting for admin only
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200 text-lg font-semibold">
            Opiekun zatwierdził Twoją rejestrację!
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300 mt-3 space-y-3">
            <div className="flex items-center gap-2 text-base">
              <span className="font-medium">Status:</span>
              <span>Oczekiwanie na zatwierdzenie Administratora</span>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-300 dark:border-blue-700">
              <p className="text-sm">
                Twoje konto zostało zatwierdzone przez Opiekuna. Teraz Administrator musi zatwierdzić Twoje konto, abyś mógł w pełni korzystać z systemu.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Email</span>
          </div>
          <div className="h-0.5 w-8 bg-green-500" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Opiekun</span>
          </div>
          <div className="h-0.5 w-8 bg-green-500" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Admin</span>
          </div>
          <div className="h-0.5 w-8 bg-muted" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Gotowe</span>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={handleLogoutAndReturn} className="gap-2">
            <LogOut className="h-4 w-4" />
            Powrót do strony głównej
          </Button>
        </div>
      </div>
    </div>
  );
};
