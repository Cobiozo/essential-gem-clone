import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertTriangle, Mail, Ticket } from 'lucide-react';

const FreeEventConfirmPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'success' | 'already' | 'expired' | 'error'>('loading');
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('Brak tokenu w linku.');
      return;
    }
    (async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke('confirm-free-event-reservation', {
          body: { token },
        });
        if (error) {
          let msg = error.message || 'Nie udało się potwierdzić.';
          try {
            const ctxRes = (error as any).context?.response;
            if (ctxRes && typeof ctxRes.json === 'function') {
              const j = await ctxRes.json();
              if (j?.error === 'token_expired') { setState('expired'); return; }
              if (j?.error === 'invalid_token') { setState('error'); setErrorMsg('Link jest nieprawidłowy lub został unieważniony.'); return; }
              if (j?.error) msg = j.error;
            }
          } catch { /* ignore */ }
          setState('error');
          setErrorMsg(msg);
          return;
        }
        if (res?.alreadyConfirmed) {
          setData(res);
          setState('already');
        } else if (res?.success) {
          setData(res);
          setState('success');
        } else {
          setState('error');
          setErrorMsg('Nieoczekiwana odpowiedź serwera.');
        }
      } catch (e: any) {
        setState('error');
        setErrorMsg(e?.message || 'Wystąpił błąd.');
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {state === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              <h1 className="text-xl font-semibold">Potwierdzanie adresu email...</h1>
              <p className="text-sm text-muted-foreground">Trwa weryfikacja Twojego linku. Chwila cierpliwości.</p>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
              <h1 className="text-2xl font-bold">Email potwierdzony!</h1>
              <p className="text-muted-foreground">
                Dziękujemy za potwierdzenie adresu <strong>{data?.email}</strong>.
              </p>
              <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-foreground">
                  <Ticket className="w-4 h-4 text-primary" />
                  <span>Wydarzenie: <strong>{data?.eventTitle}</strong></span>
                </div>
                {data?.ticketCode && (
                  <div className="font-mono text-base font-bold text-primary tracking-wider">
                    {data.ticketCode}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Bilet (PDF + kod QR) został wysłany na Twój adres email. Sprawdź skrzynkę (także folder Spam).
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>Wiadomość może dotrzeć z opóźnieniem do 2-3 minut.</span>
              </div>
            </>
          )}

          {state === 'already' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
              <h1 className="text-2xl font-bold">Rezerwacja jest już potwierdzona</h1>
              <p className="text-muted-foreground">
                Twój adres <strong>{data?.email}</strong> został wcześniej potwierdzony, a bilet na <strong>{data?.eventTitle}</strong> wysłany.
              </p>
              {data?.ticketCode && (
                <div className="bg-muted/40 rounded-lg p-3 font-mono text-base font-bold text-primary tracking-wider">
                  {data.ticketCode}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Jeśli nie otrzymałeś/aś biletu, sprawdź folder Spam lub skontaktuj się z organizatorem.
              </p>
            </>
          )}

          {state === 'expired' && (
            <>
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
              <h1 className="text-2xl font-bold">Link wygasł</h1>
              <p className="text-muted-foreground">
                Link potwierdzający jest ważny przez 7 dni. Zarezerwuj miejsce ponownie na stronie wydarzenia.
              </p>
              <Button onClick={() => (window.location.href = '/paid-events')}>Wróć do wydarzeń</Button>
            </>
          )}

          {state === 'error' && (
            <>
              <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
              <h1 className="text-2xl font-bold">Wystąpił błąd</h1>
              <p className="text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" onClick={() => (window.location.href = '/')}>Strona główna</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FreeEventConfirmPage;
