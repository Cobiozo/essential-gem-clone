import { Calendar, CheckCircle, XCircle, Loader2, Unlink, RefreshCw } from 'lucide-react';
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
    connect, 
    disconnect,
    syncAllEvents 
  } = useGoogleCalendar();
  const { t } = useLanguage();

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
                {t('Synchronizuj teraz')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                disabled={isLoading}
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
              <Calendar className="h-4 w-4" />
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
