import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

const EventFormCancelPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleCancel = async () => {
    if (!token) return;
    setState('loading');
    try {
      const { data, error } = await supabase.functions.invoke('cancel-event-form-submission', { body: { token } });
      if (error) throw error;
      if (data?.success) {
        setState('ok');
        setMessage('Twoje zgłoszenie zostało anulowane.');
      } else {
        setState('error');
        setMessage(data?.error === 'already_paid'
          ? 'Tego zgłoszenia nie można już anulować — płatność została odnotowana. Skontaktuj się z organizatorem.'
          : data?.error || 'Nie udało się anulować zgłoszenia.');
      }
    } catch (e: any) {
      setState('error');
      setMessage(e.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {state === 'idle' && (
            <>
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
              <h1 className="text-xl font-semibold">Anulować zgłoszenie?</h1>
              <p className="text-muted-foreground text-sm">
                Po anulowaniu Twoje zgłoszenie nie będzie już aktywne. Tej operacji nie można cofnąć.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => window.location.href = '/'}>Wróć</Button>
                <Button variant="destructive" onClick={handleCancel}>Anuluj zgłoszenie</Button>
              </div>
            </>
          )}
          {state === 'loading' && <><Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" /><p>Przetwarzanie...</p></>}
          {state === 'ok' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
              <h1 className="text-xl font-semibold">Anulowano</h1>
              <p className="text-muted-foreground">{message}</p>
              <a href="/" className="text-primary underline text-sm inline-block">Strona główna</a>
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
