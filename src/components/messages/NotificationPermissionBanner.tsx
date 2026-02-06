import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const DISMISS_KEY = 'push_notification_banner_dismissed';
const DISMISS_DURATION_DAYS = 7;

export const NotificationPermissionBanner = () => {
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    pushConfig, 
    subscribe, 
    isLoading,
    error
  } = usePushNotifications();
  
  const [dismissed, setDismissed] = useState(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return false;
    const daysElapsed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
    return daysElapsed < DISMISS_DURATION_DAYS;
  });

  // Nie pokazuj jeśli:
  // - Push nie jest wspierany
  // - Push nie jest włączony w panelu admina
  // - Użytkownik ma już aktywną subskrypcję
  // - Użytkownik odrzucił na później
  // - Uprawnienia zostały trwale zablokowane
  if (!isSupported || !pushConfig?.enabled || isSubscribed || dismissed || permission === 'denied') {
    return null;
  }

  const handleEnable = async () => {
    await subscribe();
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  return (
    <Alert className="mx-4 mt-4 border-primary/20 bg-primary/5 relative">
      <Bell className="h-4 w-4 text-primary" />
      <AlertTitle className="text-foreground">Włącz powiadomienia Push</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Otrzymuj powiadomienia o nowych wiadomościach nawet gdy przeglądarka jest zamknięta.
        </span>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDismiss}
          >
            Później
          </Button>
          <Button 
            size="sm" 
            onClick={handleEnable} 
            disabled={isLoading}
          >
            {isLoading ? 'Włączanie...' : 'Włącz powiadomienia'}
          </Button>
        </div>
      </AlertDescription>
      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}
    </Alert>
  );
};
