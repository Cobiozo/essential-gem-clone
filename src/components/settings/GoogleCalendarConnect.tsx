import { Calendar, CheckCircle, XCircle, Loader2, Unlink, HelpCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useLanguage } from '@/contexts/LanguageContext';
import { GoogleCalendarSetupGuide } from './GoogleCalendarSetupGuide';

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
      <CardContent className="space-y-4">
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
          <p className="text-sm text-muted-foreground">
            {t('Nowe rejestracje na wydarzenia będą automatycznie dodawane do Twojego kalendarza Google.')}
          </p>
        )}

        {/* Setup Guide Accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="setup-guide" className="border-none">
            <AccordionTrigger className="text-sm py-2 hover:no-underline">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <span>{t('Jak skonfigurować Google Calendar?')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{t('Szybka konfiguracja w 5 krokach:')}</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>
                    <a
                      href="https://console.cloud.google.com/projectcreate"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {t('Utwórz projekt w Google Cloud Console')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {t('Włącz Google Calendar API')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://console.cloud.google.com/apis/credentials/consent"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {t('Skonfiguruj OAuth Consent Screen')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {t('Utwórz OAuth Client ID (Web application)')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://supabase.com/dashboard/project/xzlhssqqbajqhnsmbucf/settings/functions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {t('Dodaj GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET do Supabase')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                </ol>
                <div className="pt-2">
                  <GoogleCalendarSetupGuide />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarConnect;
