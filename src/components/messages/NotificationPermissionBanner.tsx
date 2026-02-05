import { Bell } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

export const NotificationPermissionBanner = () => {
  const { permission, requestPermission, isSupported } = useBrowserNotifications();

  // Don't show if not supported or already decided
  if (!isSupported || permission !== 'default') return null;

  const handleEnable = async () => {
    // User gesture → browser will allow the prompt
    await requestPermission();
  };

  return (
    <Alert className="mx-4 mt-4 border-primary/20 bg-primary/5">
      <Bell className="h-4 w-4 text-primary" />
      <AlertTitle className="text-foreground">Włącz powiadomienia</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Otrzymuj powiadomienia o nowych wiadomościach gdy aplikacja jest w tle.
        </span>
        <Button size="sm" onClick={handleEnable} className="w-fit">
          Włącz powiadomienia
        </Button>
      </AlertDescription>
    </Alert>
  );
};
