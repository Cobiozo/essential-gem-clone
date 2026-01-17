import { useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Loader2, Unlink, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useLanguage } from '@/contexts/LanguageContext';

export const GoogleCalendarConnect = () => {
  const { 
    isConnected, 
    isLoading, 
    isSyncing,
    expiresAt,
    connect, 
    disconnect,
    syncAllEvents,
    refreshTokenIfNeeded 
  } = useGoogleCalendar();
  const { t } = useLanguage();

  // Auto-refresh token on component mount if needed
  useEffect(() => {
    if (isConnected && !isLoading) {
      refreshTokenIfNeeded();
    }
  }, [isConnected, isLoading, refreshTokenIfNeeded]);

  // Check if token is expired or expiring soon (within 5 minutes)
  const isTokenExpiringSoon = expiresAt 
    ? expiresAt.getTime() - Date.now() < 5 * 60 * 1000 
    : false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Google Calendar</CardTitle>
        </div>
        <CardDescription>
          {t('Synchronizuj swoje webinary i spotkania z kalendarzem Google.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="text-sm font-medium">{t('Status:')}</span>
          {isLoading ? (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('Sprawdzanie...')}
            </Badge>
          ) : isConnected ? (
            <Badge className="gap-1 bg-green-500 hover:bg-green-600">
              <CheckCircle className="h-3 w-3" />
              {t('Połączono')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              {t('Niepołączono')}
            </Badge>
          )}
        </div>

        {/* Token expiration warning */}
        {isConnected && isTokenExpiringSoon && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">
              {t('Token wygasa wkrótce. Kliknij "Synchronizuj teraz" aby odświeżyć.')}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {isConnected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={syncAllEvents}
                disabled={isLoading || isSyncing}
                className="gap-1"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isSyncing ? t('Synchronizowanie...') : t('Synchronizuj teraz')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                disabled={isLoading || isSyncing}
                className="gap-1 text-destructive hover:text-destructive"
              >
                <Unlink className="h-4 w-4" />
                {t('Rozłącz')}
              </Button>
            </>
          ) : (
            <Button
              onClick={connect}
              disabled={isLoading}
              size="sm"
              className="gap-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              {t('Połącz z Google')}
            </Button>
          )}
        </div>

        {/* Info text */}
        <p className="text-sm text-muted-foreground">
          {isConnected 
            ? t('Wszystkie Twoje rejestracje na wydarzenia będą automatycznie dodawane do kalendarza Google.')
            : t('Po połączeniu wszystkie Twoje webinary i spotkania pojawią się w Twoim kalendarzu Google.')
          }
        </p>
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarConnect;
