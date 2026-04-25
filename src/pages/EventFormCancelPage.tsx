import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Info } from 'lucide-react';
import DualBrandHeader from '@/components/branding/DualBrandHeader';

const EventFormCancelPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [wasPaid, setWasPaid] = useState(false);

  const handleCancel = async () => {
    if (!token) return;
    setState('loading');
    try {
      const { data, error } = await supabase.functions.invoke('cancel-event-form-submission', { body: { token } });
      if (error) throw error;
      if (data?.success) {
        setWasPaid(!!data.was_paid);
        setState('ok');
        if (data.already_cancelled) {
          setMessage('Twoja rejestracja była już wcześniej anulowana.');
        } else if (data.was_paid) {
          setMessage('Twoja rejestracja została anulowana. Pamiętaj, że zgodnie z regulaminem środki za bilet nie są zwracane — opłata pozostaje po stronie organizatora. Powiadomienie zostało wysłane do organizatora.');
        } else {
          setMessage('Twoja rejestracja została anulowana. Powiadomienie zostało wysłane do organizatora.');
        }
      } else {
        setState('error');
        setMessage(data?.error === 'invalid_token'
          ? 'Link anulujący jest nieprawidłowy lub wygasł.'
          : (data?.error || 'Nie udało się anulować zgłoszenia.'));
      }
    } catch (e: any) {
      setState('error');
      setMessage(e.message || 'Wystąpił błąd techniczny. Spróbuj ponownie za chwilę.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full overflow-hidden">
        <DualBrandHeader />
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {state === 'idle' && (
            <>
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
              <h1 className="text-2xl font-semibold">Anulować zgłoszenie?</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Anulowanie rejestracji jest <strong>dobrowolne</strong>. Zwracamy uwagę,
                że <strong>środki za bilet nie zostają zwrócone</strong> — zgodnie
                z regulaminem wydarzenia opłata pozostaje po stronie organizatora.
              </p>
              <p className="text-xs text-muted-foreground">
                Jeśli klikniesz „Tak, anuluj rejestrację", organizator oraz partner zapraszający
                otrzymają o tym powiadomienie.
              </p>
              <div className="flex gap-2 justify-center pt-2 flex-wrap">
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                  Wróć
                </Button>
                <Button variant="destructive" onClick={handleCancel}>
                  Tak, anuluj rejestrację
                </Button>
              </div>
            </>
          )}

          {state === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p>Przetwarzanie…</p>
            </>
          )}

          {state === 'ok' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
              <h1 className="text-xl font-semibold">Rejestracja anulowana</h1>
              <p className="text-muted-foreground leading-relaxed">{message}</p>
              {wasPaid && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-left text-xs text-yellow-900">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    W razie pytań dotyczących płatności skontaktuj się bezpośrednio
                    z organizatorem — środki nie są zwracane automatycznie.
                  </span>
                </div>
              )}
              <a href="/" className="text-primary underline text-sm inline-block pt-2">Strona główna</a>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold">Nie udało się anulować</h1>
              <p className="text-muted-foreground">{message}</p>
              <a href="/" className="text-primary underline text-sm inline-block">Strona główna</a>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventFormCancelPage;
