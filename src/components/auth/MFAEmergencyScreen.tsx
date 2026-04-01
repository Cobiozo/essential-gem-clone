import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Mail, RotateCcw, MessageSquare, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { PinKeypad } from './PinKeypad';
import { useToast } from '@/hooks/use-toast';

interface MFAEmergencyScreenProps {
  onResetComplete: () => void;
  onBack: () => void;
  initialTab?: 'choose' | 'reset' | 'support';
}

export const MFAEmergencyScreen: React.FC<MFAEmergencyScreenProps> = ({ onResetComplete, onBack, initialTab = 'choose' }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'choose' | 'reset' | 'support'>(initialTab);

  // Reset flow state
  const [resetStep, setResetStep] = useState<'send' | 'verify' | 'done'>('send');
  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Support flow state
  const [supportMessage, setSupportMessage] = useState('');
  const [sendingTicket, setSendingTicket] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);

  // ---- Reset Flow ----
  const sendResetCode = async () => {
    setSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-mfa-code');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMaskedEmail(data?.email || '');
      setResetStep('verify');
      toast({ title: 'Kod wysłany', description: `Sprawdź skrzynkę email (${data?.email || ''})` });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err?.message || 'Nie udało się wysłać kodu.', variant: 'destructive' });
    } finally {
      setSendingCode(false);
    }
  };

  const verifyAndReset = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('self-reset-mfa', {
        body: { code },
      });
      if (error) {
        // Try to extract server error message from FunctionsHttpError
        const errorMsg = data?.error || error?.message || 'Reset nie powiódł się po stronie serwera.';
        throw new Error(errorMsg);
      }
      if (!data?.success) throw new Error(data?.error || 'Reset failed');
      if (data?.deleted_factors === 0) {
        toast({ title: 'Uwaga', description: 'Reset przeszedł, ale nie znaleziono faktorów do usunięcia. Spróbuj ponownie lub zgłoś do Support.', variant: 'destructive' });
        setCode('');
        return;
      }
      setResetStep('done');
      toast({ title: 'Authenticator zresetowany', description: 'Możesz teraz skonfigurować nowy authenticator.' });
    } catch (err: any) {
      toast({ title: 'Błąd resetu', description: err?.message || 'Nieprawidłowy kod lub błąd resetu. Spróbuj wysłać kod ponownie lub użyj formularza Support.', variant: 'destructive' });
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  // ---- Support Flow ----
  const sendSupportTicket = async () => {
    if (supportMessage.trim().length < 10) {
      toast({ title: 'Za krótka wiadomość', description: 'Opisz problem (min. 10 znaków).', variant: 'destructive' });
      return;
    }
    setSendingTicket(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-support-ticket', {
        body: {
          subject: 'Problem z dostępem MFA / Authenticator',
          message: supportMessage,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed');
      setTicketSent(true);
      toast({ title: 'Zgłoszenie wysłane', description: 'Administrator skontaktuje się z Tobą.' });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err?.message || 'Nie udało się wysłać zgłoszenia.', variant: 'destructive' });
    } finally {
      setSendingTicket(false);
    }
  };

  // ---- Choose Screen ----
  if (activeTab === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-amber-500" />
            <CardTitle>Brak dostępu do Authenticatora</CardTitle>
            <CardDescription>
              Wybierz jedną z opcji awaryjnych, aby odzyskać dostęp do konta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => setActiveTab('reset')}
              className="w-full h-auto py-4 flex flex-col items-center gap-1"
              variant="default"
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                <span className="font-semibold">Resetuj Authenticator przez Email</span>
              </div>
              <span className="text-xs opacity-80 font-normal">
                Wyślemy kod na Twój email, po weryfikacji zresetujesz authenticator
              </span>
            </Button>

            <Button
              onClick={() => setActiveTab('support')}
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-1"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <span className="font-semibold">Zgłoś problem do Support</span>
              </div>
              <span className="text-xs opacity-60 font-normal">
                Wyślij wiadomość do administratora z opisem problemu
              </span>
            </Button>

            <Button variant="ghost" size="sm" onClick={onBack} className="w-full mt-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Wróć do logowania
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Reset Flow Screen ----
  if (activeTab === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <RotateCcw className="w-12 h-12 mx-auto mb-2 text-primary" />
            <CardTitle>Reset Authenticatora</CardTitle>
            <CardDescription>
              {resetStep === 'send' && 'Wyślemy kod weryfikacyjny na Twój email. Po weryfikacji usuniemy stary authenticator.'}
              {resetStep === 'verify' && `Wprowadź 6-cyfrowy kod wysłany na ${maskedEmail}`}
              {resetStep === 'done' && 'Authenticator został zresetowany! Skonfiguruj nowy.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetStep === 'send' && (
              <>
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Po resecie będziesz musiał(a) zeskanować nowy kod QR w aplikacji Authenticator.</span>
                </div>
                <Button onClick={sendResetCode} disabled={sendingCode} className="w-full">
                  {sendingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  Wyślij kod na email
                </Button>
              </>
            )}

            {resetStep === 'verify' && (
              <>
                <PinKeypad
                  onComplete={(pinCode) => {
                    setCode(pinCode);
                    verifyAndReset();
                  }}
                  loading={verifying}
                  submitLabel="Zweryfikuj i resetuj"
                />
                <Button variant="ghost" size="sm" onClick={sendResetCode} disabled={sendingCode} className="w-full">
                  {sendingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Wyślij kod ponownie
                </Button>
              </>
            )}

            {resetStep === 'done' && (
              <>
                <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Authenticator został pomyślnie zresetowany.</span>
                </div>
                <Button onClick={onResetComplete} className="w-full">
                  Skonfiguruj nowy Authenticator
                </Button>
              </>
            )}

            {resetStep !== 'done' && (
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('choose')} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Wróć
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Support Flow Screen ----
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 text-primary" />
          <CardTitle>Zgłoszenie do Support</CardTitle>
          <CardDescription>
            {ticketSent
              ? 'Twoje zgłoszenie zostało wysłane. Administrator skontaktuje się z Tobą.'
              : 'Opisz swój problem — administrator otrzyma powiadomienie i email.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticketSent ? (
            <>
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Zgłoszenie zostało wysłane do administratorów.</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('choose')} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Wróć
              </Button>
            </>
          ) : (
            <>
              <Textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Opisz problem, np.: Usunąłem konto z aplikacji Authy i nie mogę się zalogować..."
                rows={4}
                className="resize-none"
              />
              <Button onClick={sendSupportTicket} disabled={sendingTicket || supportMessage.trim().length < 10} className="w-full">
                {sendingTicket ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Wyślij zgłoszenie
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('choose')} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Wróć
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
