import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Save, Languages } from 'lucide-react';

interface PushNotificationConfig {
  id: string;
  vapid_public_key: string | null;
  vapid_private_key: string | null;
  vapid_subject: string;
  is_enabled: boolean;
  keys_generated_at: string | null;
  icon_192_url: string | null;
  icon_512_url: string | null;
  badge_icon_url: string | null;
  default_title: string;
  default_body: string;
  translations: Record<string, { title: string; body: string }>;
  created_at: string;
  updated_at: string;
}

interface NotificationTemplatesPanelProps {
  config: PushNotificationConfig;
  onUpdate: (updates: Partial<PushNotificationConfig>) => void;
}

export const NotificationTemplatesPanel: React.FC<NotificationTemplatesPanelProps> = ({ config, onUpdate }) => {
  const { toast } = useToast();
  const [defaultTitle, setDefaultTitle] = useState(config.default_title);
  const [defaultBody, setDefaultBody] = useState(config.default_body);
  const [translations, setTranslations] = useState<Record<string, { title: string; body: string }>>(
    config.translations || { pl: { title: '', body: '' }, en: { title: '', body: '' } }
  );
  const [activeLanguage, setActiveLanguage] = useState('pl');

  const handleSaveDefaults = () => {
    onUpdate({
      default_title: defaultTitle,
      default_body: defaultBody,
    });
  };

  const handleSaveTranslations = () => {
    onUpdate({ translations });
    toast({
      title: 'Zapisano',
      description: 'Tłumaczenia zostały zaktualizowane.',
    });
  };

  const updateTranslation = (lang: string, field: 'title' | 'body', value: string) => {
    setTranslations(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }));
  };

  const supportedLanguages = [
    { code: 'pl', name: 'Polski' },
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
    { code: 'uk', name: 'Українська' },
  ];

  return (
    <div className="space-y-6">
      {/* Default templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Domyślne teksty powiadomień
          </CardTitle>
          <CardDescription>
            Teksty używane gdy wiadomość nie ma własnego tytułu lub treści
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-title">Domyślny tytuł</Label>
            <Input
              id="default-title"
              value={defaultTitle}
              onChange={(e) => setDefaultTitle(e.target.value)}
              placeholder="Pure Life Center"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-body">Domyślna treść</Label>
            <Textarea
              id="default-body"
              value={defaultBody}
              onChange={(e) => setDefaultBody(e.target.value)}
              placeholder="Masz nową wiadomość"
              rows={2}
            />
          </div>

          <Button onClick={handleSaveDefaults}>
            <Save className="w-4 h-4 mr-2" />
            Zapisz domyślne teksty
          </Button>
        </CardContent>
      </Card>

      {/* Translations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            Tłumaczenia
          </CardTitle>
          <CardDescription>
            Teksty powiadomień w różnych językach (używane gdy znany jest język użytkownika)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
            <TabsList>
              {supportedLanguages.map((lang) => (
                <TabsTrigger key={lang.code} value={lang.code}>
                  {lang.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {supportedLanguages.map((lang) => (
              <TabsContent key={lang.code} value={lang.code} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tytuł ({lang.name})</Label>
                  <Input
                    value={translations[lang.code]?.title || ''}
                    onChange={(e) => updateTranslation(lang.code, 'title', e.target.value)}
                    placeholder={`Tytuł w języku ${lang.name.toLowerCase()}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Treść ({lang.name})</Label>
                  <Textarea
                    value={translations[lang.code]?.body || ''}
                    onChange={(e) => updateTranslation(lang.code, 'body', e.target.value)}
                    placeholder={`Treść w języku ${lang.name.toLowerCase()}`}
                    rows={2}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <Separator />

          <Button onClick={handleSaveTranslations}>
            <Save className="w-4 h-4 mr-2" />
            Zapisz tłumaczenia
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Podgląd powiadomienia</CardTitle>
          <CardDescription>
            Tak będzie wyglądać powiadomienie na urządzeniach użytkowników
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm mx-auto">
            <div className="bg-card border rounded-lg shadow-lg p-4 flex gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                {config.icon_192_url ? (
                  <img src={config.icon_192_url} alt="Icon" className="w-10 h-10 rounded" />
                ) : (
                  <span className="text-2xl">🔔</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {translations[activeLanguage]?.title || defaultTitle || 'Pure Life Center'}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {translations[activeLanguage]?.body || defaultBody || 'Masz nową wiadomość'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Teraz</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
