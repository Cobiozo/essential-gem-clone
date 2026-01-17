import { Calendar, CheckCircle, XCircle, Loader2, Unlink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useLanguage } from '@/contexts/LanguageContext';

export const GoogleCalendarConnect = () => {
  const { isConnected, isLoading, connect, disconnect } = useGoogleCalendar();
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Google Calendar</CardTitle>
        </div>
        <CardDescription>
          {t('Synchronizuj wydarzenia z aplikacji PureLife ze swoim kalendarzem Google.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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

          <div className="flex gap-2">
            {isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                disabled={isLoading}
                className="gap-1"
              >
                <Unlink className="h-4 w-4" />
                {t('Rozłącz')}
              </Button>
            ) : (
              <Button
                onClick={connect}
                disabled={isLoading}
                size="sm"
                className="gap-1"
              >
                <Calendar className="h-4 w-4" />
                {t('Połącz Google Calendar')}
              </Button>
            )}
          </div>
        </div>

        {isConnected && (
          <p className="mt-3 text-sm text-muted-foreground">
            {t('Nowe rejestracje na wydarzenia będą automatycznie dodawane do Twojego kalendarza Google.')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarConnect;
