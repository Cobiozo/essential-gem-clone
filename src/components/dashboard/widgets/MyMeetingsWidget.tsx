import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Video, Users, User, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEvents } from '@/hooks/useEvents';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import type { EventWithRegistration } from '@/types/events';

export const MyMeetingsWidget: React.FC = () => {
  const { t, language } = useLanguage();
  const { getUserEvents, cancelRegistration } = useEvents();
  const [userEvents, setUserEvents] = useState<EventWithRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const locale = language === 'pl' ? pl : enUS;

  useEffect(() => {
    const fetchUserEvents = async () => {
      setLoading(true);
      const events = await getUserEvents();
      setUserEvents(events);
      setLoading(false);
    };
    fetchUserEvents();
  }, [getUserEvents]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'webinar':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'meeting_public':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'meeting_private':
        return <User className="h-4 w-4 text-purple-500" />;
      default:
        return <Calendar className="h-4 w-4 text-primary" />;
    }
  };

  const handleCancel = async (eventId: string) => {
    await cancelRegistration(eventId);
    const events = await getUserEvents();
    setUserEvents(events);
  };

  // Filter to show only upcoming events
  const upcomingEvents = userEvents.filter(
    e => new Date(e.start_time) > new Date()
  );

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {t('events.myMeetings') || 'Moje spotkania'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground py-4">
            Ładowanie...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          {t('events.myMeetings') || 'Moje spotkania'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('events.noUpcoming') || 'Brak nadchodzących wydarzeń'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.slice(0, 5).map(event => (
              <div
                key={event.id}
                className="p-3 rounded-lg bg-muted/50 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getEventIcon(event.event_type)}
                    <span className="text-sm font-medium truncate">{event.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {format(new Date(event.start_time), 'd MMM', { locale })}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    {event.zoom_link && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        asChild
                      >
                        <a href={event.zoom_link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Zoom
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleCancel(event.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {upcomingEvents.length > 5 && (
              <p className="text-xs text-center text-muted-foreground">
                +{upcomingEvents.length - 5} więcej
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
