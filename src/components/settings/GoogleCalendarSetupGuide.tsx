import { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface CopyButtonProps {
  value: string;
  label?: string;
}

const CopyButton = ({ value, label }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast({
      title: t('Skopiowano'),
      description: label || value.substring(0, 50) + '...',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-7 gap-1 text-xs"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? t('Skopiowano') : t('Kopiuj')}
    </Button>
  );
};

interface CodeBlockProps {
  value: string;
  label?: string;
}

const CodeBlock = ({ value, label }: CodeBlockProps) => (
  <div className="flex items-center justify-between gap-2 rounded-md bg-muted p-2 text-xs font-mono">
    <code className="break-all">{value}</code>
    <CopyButton value={value} label={label} />
  </div>
);

export const GoogleCalendarSetupGuide = () => {
  const { t } = useLanguage();

  const redirectUri = 'https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/google-oauth-callback';
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly', // Required for FreeBusy API (checking busy times)
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];
  const authorizedOrigins = 'https://purelife.lovable.app';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto p-0 text-sm text-primary">
          {t('📖 Pełna instrukcja krok po kroku')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('Konfiguracja Google Calendar - Pełna instrukcja')}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 text-sm">
            {/* Step 1 */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
                {t('Utwórz projekt w Google Cloud Console')}
              </h3>
              <div className="ml-8 space-y-2">
                <p>{t('Przejdź do Google Cloud Console i utwórz nowy projekt:')}</p>
                <a
                  href="https://console.cloud.google.com/projectcreate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  console.cloud.google.com/projectcreate
                  <ExternalLink className="h-3 w-3" />
                </a>
                <ul className="list-disc ml-4 space-y-1 text-muted-foreground">
                  <li>{t('Kliknij "Select a project" → "New Project"')}</li>
                  <li>{t('Nazwa projektu: np. "PureLife Calendar Sync"')}</li>
                  <li>{t('Kliknij "Create" i poczekaj na utworzenie')}</li>
                </ul>
              </div>
            </section>

            {/* Step 2 */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
                {t('Włącz Google Calendar API')}
              </h3>
              <div className="ml-8 space-y-2">
                <p>{t('Przejdź do biblioteki API i włącz Google Calendar API:')}</p>
                <a
                  href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Google Calendar API
                  <ExternalLink className="h-3 w-3" />
                </a>
                <ul className="list-disc ml-4 space-y-1 text-muted-foreground">
                  <li>{t('Upewnij się, że wybrany jest Twój projekt')}</li>
                  <li>{t('Kliknij "Enable" (Włącz)')}</li>
                </ul>
              </div>
            </section>

            {/* Step 3 */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
                {t('Skonfiguruj OAuth Consent Screen')}
              </h3>
              <div className="ml-8 space-y-2">
                <p>{t('Przejdź do konfiguracji ekranu zgody OAuth:')}</p>
                <a
                  href="https://console.cloud.google.com/apis/credentials/consent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  OAuth Consent Screen
                  <ExternalLink className="h-3 w-3" />
                </a>
                <ul className="list-disc ml-4 space-y-1 text-muted-foreground">
                  <li>{t('User Type: wybierz "External"')}</li>
                  <li>{t('App name: "PureLife Calendar Sync"')}</li>
                  <li>{t('User support email: Twój email')}</li>
                  <li>{t('Authorized domains: dodaj "lovable.app" i "supabase.co"')}</li>
                  <li>{t('Developer contact: Twój email')}</li>
                </ul>
                <p className="font-medium mt-3">{t('Wymagane Scopes (dodaj w sekcji "Scopes"):')}</p>
                <div className="space-y-2">
                  {scopes.map((scope) => (
                    <CodeBlock key={scope} value={scope} label="Scope" />
                  ))}
                </div>
                <p className="text-muted-foreground mt-2">
                  {t('W sekcji "Test users" dodaj swoje konto Google, aby móc testować integrację.')}
                </p>
              </div>
            </section>

            {/* Step 4 */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">4</span>
                {t('Utwórz OAuth Client ID')}
              </h3>
              <div className="ml-8 space-y-2">
                <p>{t('Przejdź do tworzenia danych uwierzytelniających:')}</p>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Credentials
                  <ExternalLink className="h-3 w-3" />
                </a>
                <ul className="list-disc ml-4 space-y-1 text-muted-foreground">
                  <li>{t('Kliknij "Create Credentials" → "OAuth client ID"')}</li>
                  <li>{t('Application type: "Web application"')}</li>
                  <li>{t('Name: "PureLife Web Client"')}</li>
                </ul>
                
                <p className="font-medium mt-3">{t('Authorized JavaScript origins:')}</p>
                <CodeBlock value={authorizedOrigins} label="JavaScript Origins" />
                
                <p className="font-medium mt-3">{t('Authorized redirect URIs:')}</p>
                <CodeBlock value={redirectUri} label="Redirect URI" />
                
                <p className="text-muted-foreground mt-2">
                  {t('Po utworzeniu skopiuj "Client ID" i "Client Secret" - będą potrzebne w następnym kroku.')}
                </p>
              </div>
            </section>

            {/* Step 5 */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">5</span>
                {t('Dodaj sekrety do Supabase')}
              </h3>
              <div className="ml-8 space-y-2">
                <p>{t('Przejdź do panelu Supabase i dodaj sekrety:')}</p>
                <a
                  href="https://supabase.com/dashboard/project/xzlhssqqbajqhnsmbucf/settings/functions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Supabase Edge Functions Settings
                  <ExternalLink className="h-3 w-3" />
                </a>
                <ul className="list-disc ml-4 space-y-1 text-muted-foreground">
                  <li>{t('Przejdź do "Edge Functions" → "Secrets"')}</li>
                  <li><strong>GOOGLE_CLIENT_ID</strong> - {t('wklej Client ID z Google')}</li>
                  <li><strong>GOOGLE_CLIENT_SECRET</strong> - {t('wklej Client Secret z Google')}</li>
                  <li><strong>SITE_URL</strong> (opcjonalnie) - <code>https://purelife.lovable.app</code></li>
                </ul>
              </div>
            </section>

            {/* Troubleshooting */}
            <section className="space-y-2 border-t pt-4">
              <h3 className="font-semibold text-base">{t('🔧 Rozwiązywanie problemów')}</h3>
              <div className="space-y-3 text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">{t('Błąd "redirect_uri_mismatch"')}</p>
                  <p>{t('Sprawdź, czy Redirect URI jest dokładnie taki sam w Google Console i w kodzie (bez dodatkowych spacji/znaków).')}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('Błąd "access_denied"')}</p>
                  <p>{t('Upewnij się, że Twoje konto Google jest dodane jako "Test user" w OAuth Consent Screen.')}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('Błąd "invalid_client"')}</p>
                  <p>{t('Sprawdź poprawność GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET w Supabase Secrets.')}</p>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleCalendarSetupGuide;
