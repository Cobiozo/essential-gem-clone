import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const EventFormConfirmPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'ok' | 'already' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      if (!token) { setState('error'); setMessage('Brak tokenu.'); return; }
      try {
        const { data, error } = await supabase.functions.invoke('confirm-event-form-email', { body: { token } });
        if (error) throw error;
        if (data?.success) {
          if (data.already_confirmed) {
            setState('already');
            setMessage('Otrzymanie wiadomości zostało już wcześniej potwierdzone.');
          } else {
            setState('ok');
            setMessage('Dziękujemy! Otrzymanie wiadomości zostało potwierdzone.');
          }
        } else {
          setState('error');
          setMessage(data?.error || 'Nie można potwierdzić tokenu.');
        }
      } catch (e: any) {
        setState('error');
        setMessage(e.message || 'Błąd potwierdzenia.');
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {state === 'loading' && <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />}
          {(state === 'ok' || state === 'already') && <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />}
          {state === 'error' && <XCircle className="w-16 h-16 text-destructive mx-auto" />}
          <h1 className="text-xl font-semibold">
            {state === 'loading' ? 'Przetwarzanie...' :
             state === 'ok' ? 'Potwierdzono!' :
             state === 'already' ? 'Już potwierdzone' :
             'Nie udało się potwierdzić'}
          </h1>
          {message && <p className="text-muted-foreground">{message}</p>}
          <a href="/" className="text-primary underline text-sm inline-block">Wróć do strony głównej</a>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventFormConfirmPage;
