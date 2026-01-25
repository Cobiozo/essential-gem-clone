import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, ArrowRight, HandHelping, MessageSquare, BookOpen, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { WidgetInfoButton } from '../WidgetInfoButton';

export const NotificationsWidget: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { notifications, loading, markAsRead } = useNotifications();

  // Take only first 4
  const displayNotifications = notifications.slice(0, 4);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'upline_help': return HandHelping;
      case 'ai_compass': return MessageSquare;
      case 'training': return BookOpen;
      default: return Info;
    }
  };

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <Card className="shadow-sm relative" data-tour="notifications-widget">
      <WidgetInfoButton description="Centrum powiadomień - ważne informacje od upline i systemu" />
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          {t('dashboard.notifications')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/my-account?tab=notifications')} className="text-xs">
          {t('dashboard.viewAll')}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-14 bg-muted rounded" />
            ))}
          </div>
        ) : displayNotifications.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t('dashboard.noNotifications')}
            </p>
          </div>
        ) : (
          displayNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.notification_type);
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`flex gap-3 p-2 -mx-2 rounded-lg cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'
                }`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  !notification.is_read ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <Icon className={`h-4 w-4 ${!notification.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: language === 'pl' ? pl : enUS,
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationsWidget;
