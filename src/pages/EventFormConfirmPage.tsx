import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import DualBrandHeader from '@/components/branding/DualBrandHeader';

const EventFormConfirmPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'ok' | 'already' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      if (!token) { setState('error'); setErrorMsg('Brak tokenu w adresie linku.'); return; }
      try {
        const { data, error } = await supabase.functions.invoke('confirm-event-form-email', { body: { token } });
        if (error) throw error;
        if (data?.success) {
          setState(data.already_confirmed ? 'already' : 'ok');
        } else {
          setState('error');
          setErrorMsg(data?.error === 'cancelled'
            ? 'Tej rejestracji nie można już potwierdzić — została wcześniej anulowana.'
            : data?.error === 'invalid_token'
              ? 'Link potwierdzający jest nieprawidłowy lub wygasł.'
              : (data?.error || 'Nie udało się potwierdzić rejestracji.'));
        }
      } catch (e: any) {
        setState('error');
        setErrorMsg(e.message || 'Wystąpił błąd techniczny. Spróbuj ponownie za chwilę.');
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full overflow-hidden">
        <DualBrandHeader />
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {state === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Przetwarzanie potwierdzenia…</p>
            </>
          )}

          {(state === 'ok' || state === 'already') && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
              <h1 className="text-2xl font-semibold leading-snug">
                Twoje dane i rejestracja zostały poprawnie potwierdzone
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Teraz oczekujemy na płatność na dane wskazane w wysłanym e‑mailu.
                Po zaksięgowaniu wpłaty otrzymasz finalne potwierdzenie udziału.
              </p>
              {state === 'already' && (
                <p className="text-xs text-muted-foreground italic">
                  (Twoja rejestracja była już potwierdzona wcześniej.)
                </p>
              )}
              <p className="text-sm text-muted-foreground pt-2">
                Dziękujemy i do zobaczenia na wydarzeniu!
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold">Nie udało się potwierdzić</h1>
              <p className="text-muted-foreground">{errorMsg}</p>
              <a href="/" className="text-primary underline text-sm inline-block">Wróć do strony głównej</a>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventFormConfirmPage;
