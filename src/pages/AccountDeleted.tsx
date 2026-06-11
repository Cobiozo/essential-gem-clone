import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Home } from 'lucide-react';

/**
 * Public landing page shown after a user account has been deleted –
 * either by the user themselves (self-delete) or by an administrator
 * while the user was still logged in. Intentionally has NO Supabase
 * calls, NO useAuth, NO guards: it must render cleanly even when the
 * auth state is inconsistent (e.g. stale JWT for a non-existent user).
 */
const AccountDeleted: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">
              Konto zgłoszone do usunięcia
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sesja została zakończona. Twoje konto zostało zablokowane, a dane
              zostaną trwale usunięte z systemu po 30 dniach.
              Jeśli chcesz cofnąć decyzję w tym czasie — skontaktuj się
              z administratorem.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => {
                window.location.assign('/');
              }}
            >
              <Home className="h-4 w-4 mr-2" />
              Wróć do strony głównej
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                window.location.assign('/auth');
              }}
            >
              Zaloguj się ponownie
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountDeleted;
