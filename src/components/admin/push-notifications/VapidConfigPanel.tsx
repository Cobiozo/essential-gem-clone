import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Key, Copy, Eye, EyeOff, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

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

interface VapidConfigPanelProps {
  config: PushNotificationConfig;
  onUpdate: (updates: Partial<PushNotificationConfig>) => void;
}

export const VapidConfigPanel: React.FC<VapidConfigPanelProps> = ({ config, onUpdate }) => {
  const { toast } = useToast();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [subject, setSubject] = useState(config.vapid_subject);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Skopiowano',
      description: `${label} skopiowany do schowka.`,
    });
  };

  const generateNewKeys = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-vapid-keys', {
        body: { subject },
      });

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Nowe klucze VAPID zostały wygenerowane.',
      });

      // Trigger refetch
      onUpdate({});
    } catch (err: any) {
      console.error('Error generating VAPID keys:', err);
      toast({
        title: 'Błąd',
        description: err.message || 'Nie udało się wygenerować kluczy.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const deleteKeys = async () => {
    try {
      onUpdate({
        vapid_public_key: null,
        vapid_private_key: null,
        keys_generated_at: null,
        is_enabled: false,
      });
      toast({
        title: 'Usunięto',
        description: 'Klucze VAPID zostały usunięte.',
      });
    } catch (err: any) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć kluczy.',
        variant: 'destructive',
      });
    }
  };

  const toggleEnabled = (enabled: boolean) => {
    if (enabled && !config.vapid_public_key) {
      toast({
        title: 'Brak kluczy',
        description: 'Najpierw wygeneruj klucze VAPID.',
        variant: 'destructive',
      });
      return;
    }
    onUpdate({ is_enabled: enabled });
  };

  const saveSubject = () => {
    if (!subject.startsWith('mailto:')) {
      toast({
        title: 'Nieprawidłowy format',
        description: 'Subject musi zaczynać się od "mailto:"',
        variant: 'destructive',
      });
      return;
    }
    onUpdate({ vapid_subject: subject });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Klucze VAPID
        </CardTitle>
        <CardDescription>
          Klucze autoryzacyjne dla Web Push API (Voluntary Application Server Identification)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={config.is_enabled}
              onCheckedChange={toggleEnabled}
              disabled={!config.vapid_public_key}
            />
            <Label>Powiadomienia Push aktywne</Label>
          </div>
          {config.keys_generated_at && (
            <span className="text-sm text-muted-foreground">
              Klucze wygenerowane: {format(new Date(config.keys_generated_at), 'PPpp', { locale: pl })}
            </span>
          )}
        </div>

        <Separator />

        {/* Public Key */}
        <div className="space-y-2">
          <Label>Klucz publiczny (VAPID Public Key)</Label>
          <div className="flex gap-2">
            <Input
              value={config.vapid_public_key || 'Brak klucza - wygeneruj nowe klucze'}
              readOnly
              className="font-mono text-xs"
            />
            {config.vapid_public_key && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(config.vapid_public_key!, 'Klucz publiczny')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Ten klucz jest używany przez przeglądarkę do subskrypcji powiadomień.
          </p>
        </div>

        {/* Private Key (hidden by default) */}
        <div className="space-y-2">
          <Label>Klucz prywatny (VAPID Private Key)</Label>
          <div className="flex gap-2">
            <Input
              type={showPrivateKey ? 'text' : 'password'}
              value={config.vapid_private_key || ''}
              readOnly
              className="font-mono text-xs"
              placeholder={config.vapid_private_key ? '••••••••••••••••' : 'Brak klucza'}
            />
            {config.vapid_private_key && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(config.vapid_private_key!, 'Klucz prywatny')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
          <p className="text-xs text-destructive">
            ⚠️ Nigdy nie udostępniaj klucza prywatnego! Jest on przechowywany bezpiecznie w bazie danych.
          </p>
        </div>

        {/* Subject (email) */}
        <div className="space-y-2">
          <Label>Adres kontaktowy (Subject)</Label>
          <div className="flex gap-2">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="mailto:support@example.com"
            />
            <Button variant="outline" onClick={saveSubject}>
              Zapisz
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Adres email kontaktowy wymagany przez protokół Web Push.
          </p>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={generateNewKeys}
            disabled={generating}
            variant={config.vapid_public_key ? 'outline' : 'default'}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {config.vapid_public_key ? 'Wygeneruj nowe klucze' : 'Wygeneruj klucze VAPID'}
          </Button>

          {config.vapid_public_key && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Usuń klucze
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usunąć klucze VAPID?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Wszystkie aktywne subskrypcje przestaną działać. Użytkownicy będą musieli ponownie włączyć powiadomienia na swoich urządzeniach.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteKeys} className="bg-destructive text-destructive-foreground">
                    Usuń klucze
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Warning about regenerating keys */}
        {config.vapid_public_key && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Uwaga:</strong> Wygenerowanie nowych kluczy spowoduje unieważnienie wszystkich istniejących subskrypcji. Użytkownicy będą musieli ponownie wyrazić zgodę na powiadomienia.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
