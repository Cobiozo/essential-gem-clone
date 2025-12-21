import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Settings, 
  CheckCircle, 
  Clock, 
  UserPlus, 
  Share2, 
  FileText, 
  RefreshCw,
  Megaphone,
  GraduationCap,
  Award
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationEventType, UserNotificationPreference } from '@/types/notifications';
import { MODULE_NAMES } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bell,
  Clock,
  UserPlus,
  Share2,
  FileText,
  RefreshCw,
  Megaphone,
  GraduationCap,
  Award,
  CheckCircle,
};

export const UserNotificationCenter = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [eventTypes, setEventTypes] = useState<NotificationEventType[]>([]);
  const [preferences, setPreferences] = useState<UserNotificationPreference[]>([]);
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    setPreferencesLoading(true);
    try {
      const [eventTypesRes, prefsRes] = await Promise.all([
        supabase.from('notification_event_types').select('*').eq('is_active', true).order('position'),
        supabase.from('user_notification_preferences').select('*').eq('user_id', user.id),
      ]);

      if (eventTypesRes.data) setEventTypes(eventTypesRes.data as NotificationEventType[]);
      if (prefsRes.data) setPreferences(prefsRes.data as UserNotificationPreference[]);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const togglePreference = async (eventTypeId: string, isEnabled: boolean) => {
    if (!user) return;

    const existing = preferences.find(p => p.event_type_id === eventTypeId);

    if (existing) {
      const { error } = await supabase
        .from('user_notification_preferences')
        .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (!error) {
        setPreferences(prev => prev.map(p => 
          p.id === existing.id ? { ...p, is_enabled: isEnabled } : p
        ));
      }
    } else {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .insert({ user_id: user.id, event_type_id: eventTypeId, is_enabled: isEnabled })
        .select()
        .single();

      if (!error && data) {
        setPreferences(prev => [...prev, data as UserNotificationPreference]);
      }
    }
  };

  const isPreferenceEnabled = (eventTypeId: string) => {
    const pref = preferences.find(p => p.event_type_id === eventTypeId);
    return pref ? pref.is_enabled : true; // Default to enabled
  };

  const getIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || Bell;
    return Icon;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Centrum powiadomień
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="notifications">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="notifications">
              Powiadomienia
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Ustawienia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            {unreadCount > 0 && (
              <div className="mb-4">
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Oznacz wszystkie jako przeczytane
                </Button>
              </div>
            )}

            <ScrollArea className="h-[400px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Brak powiadomień</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(notification => {
                    const eventType = eventTypes.find(e => e.event_key === notification.notification_type);
                    const Icon = getIcon(eventType?.icon_name || 'Bell');
                    const color = eventType?.color || '#3b82f6';

                    return (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                          notification.is_read 
                            ? 'bg-background' 
                            : 'bg-primary/5 border-primary/20'
                        }`}
                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: color + '20', color }}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              {!notification.is_read && (
                                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {MODULE_NAMES[notification.source_module] || notification.source_module}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { 
                                  addSuffix: true, 
                                  locale: pl 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings">
            {preferencesLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Wybierz, jakie powiadomienia chcesz otrzymywać
                </p>
                {eventTypes.map(eventType => {
                  const Icon = getIcon(eventType.icon_name);
                  return (
                    <div 
                      key={eventType.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: eventType.color + '20', color: eventType.color }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <Label className="font-medium">{eventType.name}</Label>
                          <p className="text-xs text-muted-foreground">{eventType.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isPreferenceEnabled(eventType.id)}
                        onCheckedChange={(checked) => togglePreference(eventType.id, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
