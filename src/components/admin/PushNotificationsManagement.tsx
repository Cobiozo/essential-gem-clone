import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bell, Key, BarChart3, FileText, Image, Globe } from 'lucide-react';
import { VapidConfigPanel } from './push-notifications/VapidConfigPanel';
import { SubscriptionStatsPanel } from './push-notifications/SubscriptionStatsPanel';
import { NotificationTemplatesPanel } from './push-notifications/NotificationTemplatesPanel';
import { IconsManagementPanel } from './push-notifications/IconsManagementPanel';
import { BrowserSupportPanel } from './push-notifications/BrowserSupportPanel';

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

export const PushNotificationsManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch push notification config
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['push-notification-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_notification_config')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      
      if (error) throw error;
      return data as PushNotificationConfig;
    },
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<PushNotificationConfig>) => {
      const { error } = await supabase
        .from('push_notification_config')
        .update(updates)
        .eq('id', '00000000-0000-0000-0000-000000000001');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notification-config'] });
      toast({
        title: 'Zapisano',
        description: 'Konfiguracja została zaktualizowana.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się zapisać konfiguracji.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Błąd ładowania konfiguracji: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Powiadomienia Push
          </h2>
          <p className="text-muted-foreground">
            Konfiguracja Web Push dla przeglądarek i PWA
          </p>
        </div>
        <div className="flex items-center gap-2">
          {config?.vapid_public_key ? (
            <Badge variant={config?.is_enabled ? 'default' : 'secondary'}>
              {config?.is_enabled ? '✓ Aktywne' : '○ Wyłączone'}
            </Badge>
          ) : (
            <Badge variant="destructive">Brak kluczy VAPID</Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="config" className="gap-2">
            <Key className="w-4 h-4" />
            Konfiguracja VAPID
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Statystyki
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            Szablony
          </TabsTrigger>
          <TabsTrigger value="icons" className="gap-2">
            <Image className="w-4 h-4" />
            Ikony
          </TabsTrigger>
          <TabsTrigger value="browsers" className="gap-2">
            <Globe className="w-4 h-4" />
            Przeglądarki
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <VapidConfigPanel 
            config={config!} 
            onUpdate={(updates) => updateConfigMutation.mutate(updates)} 
          />
        </TabsContent>

        <TabsContent value="stats">
          <SubscriptionStatsPanel />
        </TabsContent>

        <TabsContent value="templates">
          <NotificationTemplatesPanel 
            config={config!} 
            onUpdate={(updates) => updateConfigMutation.mutate(updates)} 
          />
        </TabsContent>

        <TabsContent value="icons">
          <IconsManagementPanel 
            config={config!} 
            onUpdate={(updates) => updateConfigMutation.mutate(updates)} 
          />
        </TabsContent>

        <TabsContent value="browsers">
          <BrowserSupportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
