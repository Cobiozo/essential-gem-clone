import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Video, Users, User, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subMinutes, isAfter, isBefore, differenceInMinutes } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import type { EventWithRegistration } from '@/types/events';

export const MyMeetingsWidget: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { getUserEvents } = useEvents();
  const [userEvents, setUserEvents] = useState<EventWithRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  const locale = language === 'pl' ? pl : enUS;

  const toggleExpand = (type: string) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const fetchUserEventsData = useCallback(async () => {
    setLoading(true);
    const events = await getUserEvents();
    setUserEvents(events);
    setLoading(false);
  }, [getUserEvents]);

  // Initial fetch + real-time subscription for user's registrations and events
  useEffect(() => {
    fetchUserEventsData();

    if (!user) return;

    // Subscribe to changes for current user's registrations
    const registrationsChannel = supabase
      .channel('my-meetings-registrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_registrations',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch when user's registrations change
          fetchUserEventsData();
        }
      )
      .subscribe();

    // Subscribe to events table for real-time updates (new individual meetings)
    const eventsChannel = supabase
      .channel('my-meetings-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          // Refetch when any event changes
          fetchUserEventsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(registrationsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [fetchUserEventsData, user]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'webinar':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'meeting_public':
      case 'team_training':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'meeting_private':
        return <User className="h-4 w-4 text-purple-500" />;
      case 'tripartite_meeting':
        return <Users className="h-4 w-4 text-violet-500" />;
      case 'partner_consultation':
        return <User className="h-4 w-4 text-fuchsia-500" />;
      default:
        return <Calendar className="h-4 w-4 text-primary" />;
    }
  };

  const getEventTypeName = (type: string) => {
    switch (type) {
      case 'webinar':
        return 'Webinary';
      case 'team_training':
        return 'Spotkanie zespołu';
      case 'meeting_public':
        return 'Spotkania publiczne';
      case 'meeting_private':
        return 'Spotkanie indywidualne';
      case 'tripartite_meeting':
        return 'Spotkanie trójstronne';
      case 'partner_consultation':
        return 'Konsultacje dla partnerów';
      default:
        return 'Wydarzenia';
    }
  };


  // Filter to show only upcoming events
  const upcomingEvents = userEvents.filter(
    e => new Date(e.end_time) > new Date()
  );

  // Group events by type
  const groupedEvents = upcomingEvents.reduce((acc, event) => {
    const type = event.event_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(event);
    return acc;
  }, {} as Record<string, EventWithRegistration[]>);

  // Dynamic button based on time
  const getActionButton = (event: EventWithRegistration) => {
    const now = new Date();
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    const fifteenMinutesBefore = subMinutes(eventStart, 15);
    const minutesUntilEvent = differenceInMinutes(eventStart, now);
    
    // Event already ended
    if (isAfter(now, eventEnd)) {
      return null;
    }
    
    // 15 min before or during event - show WEJDŹ button
    if (isAfter(now, fifteenMinutesBefore) && isBefore(now, eventEnd)) {
      if (event.zoom_link) {
        return (
          <Button
            size="sm"
            className="h-6 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            asChild
          >
            <a href={event.zoom_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              WEJDŹ
            </a>
          </Button>
        );
      }
      return (
        <Badge className="bg-emerald-600 text-white">
          Trwa teraz
        </Badge>
      );
    }
    
    // More than 15 min until event - show countdown or zoom link
    if (minutesUntilEvent <= 60 && minutesUntilEvent > 15) {
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Za {minutesUntilEvent} min
        </div>
      );
    }
    
    // Standard zoom link for future events
    if (event.zoom_link) {
      return (
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
      );
    }
    
    return null;
  };

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
          <div className="space-y-4">
            {Object.entries(groupedEvents).map(([type, events]) => (
              <div key={type} className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  {getEventIcon(type)}
                  {getEventTypeName(type)}
                  <Badge variant="secondary" className="text-xs ml-1">{events.length}</Badge>
                </h4>
                
                <div className="space-y-2">
                  {(expandedTypes[type] ? events : events.slice(0, 3)).map(event => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg bg-muted/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium truncate">{event.title}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {format(new Date(event.start_time), 'd MMM', { locale })}
                        </Badge>
                      </div>

                      {/* Info for individual meetings */}
                      {(event.event_type === 'tripartite_meeting' || event.event_type === 'partner_consultation') && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {/* Show host info for participant */}
                          {event.host_profile && event.host_user_id !== user?.id && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Prowadzący: {event.host_profile.first_name} {event.host_profile.last_name}
                            </div>
                          )}
                          
                          {/* Show participant info for host */}
                          {event.participant_profile && event.host_user_id === user?.id && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Rezerwujący: {event.participant_profile.first_name} {event.participant_profile.last_name}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {event.zoom_link && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              asChild
                            >
                              <a href={event.zoom_link} target="_blank" rel="noopener noreferrer">
                                <Video className="h-3 w-3 mr-1" />
                                Zoom
                              </a>
                            </Button>
                          )}
                          {getActionButton(event)}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {events.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => toggleExpand(type)}
                    >
                      {expandedTypes[type] 
                        ? 'Pokaż mniej' 
                        : `+${events.length - 3} więcej`}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
