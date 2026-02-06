import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Smartphone, Bell, BellOff, ChevronDown, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

export const CurrentDevicePanel: React.FC = () => {
  const { 
    isSupported, 
    isSubscribed, 
    permission,
    isLoading, 
    error, 
    browserInfo, 
    osInfo, 
    isPWA,
    subscribe,
    unsubscribe 
  } = usePushNotifications();
  
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleSubscribe = async () => {
    setActionLoading(true);
    try {
      await subscribe();
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setActionLoading(true);
    try {
      await unsubscribe();
    } finally {
      setActionLoading(false);
    }
  };

  // Format browser name for display
  const formatBrowserName = (name: string | null | undefined) => {
    if (!name) return 'Nieznana przeglądarka';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Format OS name for display
  const formatOSName = (name: string | null | undefined, version: string | null | undefined) => {
    if (!name) return 'Nieznany system';
    return version ? `${name} ${version}` : name;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Twoje urządzenie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <BellOff className="w-4 h-4" />
            <AlertDescription>
              Ta przeglądarka nie obsługuje powiadomień push.
              {osInfo?.name === 'iOS' && !isPWA && (
                <span className="block mt-1 text-xs">
                  Na iOS wymagane jest dodanie aplikacji do ekranu głównego (PWA).
                </span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Twoje urządzenie
        </CardTitle>
        <CardDescription>
          Zarządzaj powiadomieniami push na tym urządzeniu
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Alert */}
        <Alert 
          variant={isSubscribed ? 'default' : 'default'}
          className={cn(
            isSubscribed && "border-primary/50 bg-primary/5"
          )}
        >
          {isSubscribed ? (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          ) : (
            <Info className="w-4 h-4" />
          )}
          <AlertDescription className={cn(isSubscribed && "text-primary")}>
            {isSubscribed 
              ? "Powiadomienia push są włączone na tym urządzeniu" 
              : permission === 'denied'
                ? "Powiadomienia zostały zablokowane w ustawieniach przeglądarki"
                : "Powiadomienia push są wyłączone"}
          </AlertDescription>
        </Alert>

        {/* Device info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatBrowserName(browserInfo?.name)}</span>
          <span>•</span>
          <span>{formatOSName(osInfo?.name, osInfo?.version)}</span>
          {isPWA && (
            <>
              <span>•</span>
              <Badge variant="secondary" className="text-xs">PWA</Badge>
            </>
          )}
        </div>

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {isSubscribed ? (
            <Button 
              variant="outline" 
              onClick={handleUnsubscribe}
              disabled={actionLoading || isLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BellOff className="w-4 h-4 mr-2" />
              )}
              Wyłącz powiadomienia
            </Button>
          ) : (
            <Button 
              onClick={handleSubscribe}
              disabled={actionLoading || isLoading || permission === 'denied'}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              Włącz powiadomienia
            </Button>
          )}
        </div>

        {/* Permission denied hint */}
        {permission === 'denied' && (
          <p className="text-xs text-muted-foreground">
            Aby włączyć powiadomienia, odblokuj je w ustawieniach przeglądarki dla tej strony.
          </p>
        )}

        {/* Collapsible device details */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Szczegóły urządzenia
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                detailsOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Przeglądarka:</span>
                <span>{formatBrowserName(browserInfo?.name)} {browserInfo?.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">System:</span>
                <span>{formatOSName(osInfo?.name, osInfo?.version)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tryb PWA:</span>
                <span>{isPWA ? 'Tak' : 'Nie'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status uprawnień:</span>
                <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
                  {permission === 'granted' ? 'Przyznane' : 
                   permission === 'denied' ? 'Zablokowane' : 'Nieokreślone'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Push API:</span>
                <Badge variant={isSupported ? 'default' : 'destructive'}>
                  {isSupported ? 'Obsługiwane' : 'Nieobsługiwane'}
                </Badge>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
