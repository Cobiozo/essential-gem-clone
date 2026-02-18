import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GuestAccessFormProps {
  roomId: string;
  inviterId: string;
  onSuccess: (data: {
    token: string;
    guestTokenId: string;
    displayName: string;
    eventTitle: string;
  }) => void;
}

export const GuestAccessForm: React.FC<GuestAccessFormProps> = ({
  roomId,
  inviterId,
  onSuccess,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedFirst || !trimmedLast || !trimmedEmail) {
      setError('Wszystkie pola są wymagane');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Podaj prawidłowy adres email');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-meeting-guest-token', {
        body: {
          room_id: roomId,
          first_name: trimmedFirst,
          last_name: trimmedLast,
          email: trimmedEmail,
          inviter_user_id: inviterId,
        },
      });

      if (fnError || data?.error) {
        setError(data?.error || fnError?.message || 'Nie udało się uzyskać dostępu');
        setIsSubmitting(false);
        return;
      }

      // Save to sessionStorage for page refresh persistence
      sessionStorage.setItem(`guest_token_${roomId}`, JSON.stringify({
        token: data.token,
        guestTokenId: data.guest_token_id,
        displayName: `${trimmedFirst} ${trimmedLast}`,
        email: trimmedEmail,
      }));

      onSuccess({
        token: data.token,
        guestTokenId: data.guest_token_id,
        displayName: `${trimmedFirst} ${trimmedLast}`,
        eventTitle: data.event_title || 'Spotkanie',
      });
    } catch (err) {
      console.error('[GuestAccessForm] Error:', err);
      setError('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <UserPlus className="h-5 w-5" />
            Dołącz jako gość
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Podaj swoje dane, aby dołączyć do spotkania
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest-first-name">Imię</Label>
              <Input
                id="guest-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jan"
                maxLength={100}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-last-name">Nazwisko</Label>
              <Input
                id="guest-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Kowalski"
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email</Label>
              <Input
                id="guest-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@example.com"
                maxLength={255}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Przetwarzanie...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Dołącz do spotkania
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
