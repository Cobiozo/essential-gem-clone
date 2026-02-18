import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Video, Users, User, ExternalLink, Clock, Info, X } from 'lucide-react';
import { Widget3DIcon } from './Widget3DIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { subMinutes, isAfter, isBefore, differenceInMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { pl, enUS } from 'date-fns/locale';
import type { EventWithRegistration } from '@/types/events';
import { EventDetailsDialog } from '@/components/events/EventDetailsDialog';
import { WidgetInfoButton } from '../WidgetInfoButton';
import { getTimezoneAbbr, DEFAULT_EVENT_TIMEZONE } from '@/utils/timezoneHelpers';

interface MyMeetingsWidgetProps {
  events?: EventWithRegistration[];
  eventsLoading?: boolean;
}

export const MyMeetingsWidget: React.FC<MyMeetingsWidgetProps> = ({
  events: sharedEvents,
  eventsLoading = false,
}) => {
  const { t, tf, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [cancellingEventId, setCancellingEventId] = useState<string | null>(null);
  const [detailsEvent, setDetailsEvent] = useState<EventWithRegistration | null>(null);

  const locale = language === 'pl' ? pl : enUS;

  // Filter user's registered events from shared data
  const userEvents = useMemo(() => {
    if (!sharedEvents) return [];
    return sharedEvents.filter(e => e.is_registered);
  }, [sharedEvents]);

  const toggleExpand = (type: string) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

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
        return tf('events.type.webinars', 'Webinary');
      case 'team_training':
        return tf('events.type.teamMeeting', 'Spotkanie zespołu');
      case 'meeting_public':
        return tf('events.type.publicMeetings', 'Spotkania publiczne');
      case 'meeting_private':
        return tf('events.type.individualMeeting', 'Spotkanie indywidualne');
      case 'tripartite_meeting':
        return tf('events.type.tripartiteMeeting', 'Spotkanie trójstronne');
      case 'partner_consultation':
        return tf('events.type.partnerConsultation', 'Konsultacje dla partnerów');
      default:
        return tf('events.events', 'Wydarzenia');
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

  // Handle meeting cancellation via Edge Function (bypasses RLS)
  const handleCancelMeeting = async (event: EventWithRegistration) => {
    if (!user) return;
    
    const confirmed = window.confirm(tf('events.confirmCancelMeeting', 'Czy na pewno chcesz anulować to spotkanie? Obie strony otrzymają powiadomienie email.'));
    if (!confirmed) return;

    setCancellingEventId(event.id);

    try {
      console.log('[MyMeetingsWidget] Cancelling meeting via Edge Function:', event.id);
      
      const { data, error } = await supabase.functions.invoke('cancel-individual-meeting', {
        body: { event_id: event.id }
      });

      if (error) {
        console.error('[MyMeetingsWidget] Edge function error:', error);
        throw new Error(error.message || tf('common.error', 'Błąd wywołania funkcji'));
      }

      if (!data?.success) {
        console.error('[MyMeetingsWidget] Cancellation failed:', data?.error);
        throw new Error(data?.error || tf('events.cancelFailed', 'Nie udało się anulować spotkania'));
      }

      console.log('[MyMeetingsWidget] Meeting cancelled successfully:', data);

      toast({
        title: tf('events.meetingCancelled', 'Spotkanie anulowane'),
        description: `${tf('events.emailNotificationsSent', 'Powiadomienia email wysłane')} (${data.emails_sent}/${data.total_participants}).`,
      });

      // Dispatch event for other widgets to refresh (useEvents in Dashboard will refetch)
      window.dispatchEvent(new CustomEvent('eventRegistrationChange'));
    } catch (error: any) {
      console.error('[MyMeetingsWidget] Error cancelling meeting:', error);
      toast({
        title: tf('common.error', 'Błąd'),
        description: error.message || tf('events.cancelFailed', 'Nie udało się anulować spotkania'),
        variant: 'destructive',
      });
    } finally {
      setCancellingEventId(null);
    }
  };

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
    
    // Check if event is webinar or team training
    const isWebinarOrTeamMeeting = event.event_type === 'webinar' || event.event_type === 'team_training';
    
    // Determine which URL to use - host gets start_url if available
    const eventAny = event as any;
    const isHost = event.host_user_id === user?.id || (event as any).created_by === user?.id;
    const zoomUrl = isHost && eventAny.zoom_start_url ? eventAny.zoom_start_url : event.zoom_link;
    const buttonLabel = isHost && eventAny.zoom_start_url ? (tf('events.start', 'Rozpocznij')) : (tf('events.join', 'WEJDŹ'));
    
    // 15 min before or during event - show WEJDŹ button with pulsing red dot
    if (isAfter(now, fifteenMinutesBefore) && isBefore(now, eventEnd)) {
      if (zoomUrl) {
        return (
          <Button
            size="sm"
            className="h-6 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            asChild
          >
            <a href={zoomUrl} target="_blank" rel="noopener noreferrer">
              {/* Pulsing red dot - recording indicator */}
              <span className="relative flex h-2 w-2 mr-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              {buttonLabel}
            </a>
          </Button>
        );
      }
      // No zoom link - show "Wejdź" button that opens details dialog
      return (
        <Button
          size="sm"
          className="h-6 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          onClick={() => setDetailsEvent(event)}
        >
          {/* Pulsing red dot - recording indicator */}
          <span className="relative flex h-2 w-2 mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
           {tf('events.join', 'Wejdź')}
        </Button>
      );
    }
    
    // More than 15 min until event - show countdown or details button
    if (minutesUntilEvent <= 60 && minutesUntilEvent > 15) {
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {tf('events.inMinutes', 'Za')} {minutesUntilEvent} min
        </div>
      );
    }
    
    // For webinars and team meetings - show "Szczegóły" button instead of Zoom
    if (isWebinarOrTeamMeeting) {
      const detailsPath = event.event_type === 'webinar' 
        ? `/events/webinars?event=${event.id}` 
        : `/events/team-meetings?event=${event.id}`;
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          onClick={() => navigate(detailsPath)}
        >
          <Info className="h-3 w-3 mr-1" />
           {tf('events.details', 'Szczegóły')}
        </Button>
      );
    }
    
    // For individual meetings (tripartite, partner_consultation) - show "Szczegóły" button
    if (event.event_type === 'tripartite_meeting' || event.event_type === 'partner_consultation') {
      return (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            onClick={() => setDetailsEvent(event)}
          >
            <Info className="h-3 w-3 mr-1" />
            {tf('events.details', 'Szczegóły')}
          </Button>
          {/* Cancel button (more than 2 hours before) */}
          {minutesUntilEvent > 120 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleCancelMeeting(event)}
              disabled={cancellingEventId === event.id}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
    }
    
    // Standard zoom link for other future events
    if (zoomUrl) {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          asChild
        >
          <a href={zoomUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 mr-1" />
            {isHost ? (tf('events.start', 'Rozpocznij')) : 'Zoom'}
          </a>
        </Button>
      );
    }
    
    // For individual meetings without zoom link - show cancel button if > 2 hours before
    if ((event.event_type === 'tripartite_meeting' || event.event_type === 'partner_consultation') && 
        minutesUntilEvent > 120) {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => handleCancelMeeting(event)}
          disabled={cancellingEventId === event.id}
        >
          <X className="h-3 w-3 mr-1" />
          {tf('common.cancel', 'Anuluj')}
        </Button>
      );
    }
    
    return null;
  };

  if (eventsLoading) {
    return (
      <Card variant="premium" className="relative" data-tour="my-meetings-widget">
        <WidgetInfoButton description="Twoje nadchodzące spotkania - zapisane webinary i zaplanowane konsultacje" />
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-3">
            <Widget3DIcon icon={Video} variant="emerald" size="md" />
            {tf('events.myMeetings', 'Moje spotkania')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground py-4">
            {tf('common.loading', 'Ładowanie...')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="premium" className="relative" data-tour="my-meetings-widget">
      <WidgetInfoButton description="Twoje nadchodzące spotkania - zapisane webinary i zaplanowane konsultacje" />
      <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-3">
            <Widget3DIcon icon={Video} variant="emerald" size="md" />
            {tf('events.myMeetings', 'Moje spotkania')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {tf('events.noUpcoming', 'Brak nadchodzących wydarzeń')}
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
                
                <div className="space-y-1.5">
                  {(expandedTypes[type] ? events : events.slice(0, 3)).map((event, idx) => (
                    <div
                      key={`${event.id}-${(event as any)._occurrence_index ?? idx}`}
                      className="p-2 rounded-lg bg-muted/50 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate flex-1">{event.title}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {formatInTimeZone(new Date(event.start_time), event.timezone || DEFAULT_EVENT_TIMEZONE, 'd MMM HH:mm', { locale })} ({getTimezoneAbbr(event.timezone || DEFAULT_EVENT_TIMEZONE)})
                          </span>
                          {getActionButton(event)}
                        </div>
                      </div>

                      {/* Info for individual meetings - compact */}
                      {(event.event_type === 'tripartite_meeting' || event.event_type === 'partner_consultation') && (
                        <div className="text-xs text-muted-foreground">
                          {event.host_profile && event.host_user_id !== user?.id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {event.host_profile.first_name} {event.host_profile.last_name}
                            </span>
                          )}
                          {event.participant_profile && event.host_user_id === user?.id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {event.participant_profile.first_name} {event.participant_profile.last_name}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {events.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground h-6"
                      onClick={() => toggleExpand(type)}
                    >
                       {expandedTypes[type] 
                        ? (tf('common.collapse', 'Zwiń'))
                        : `+${events.length - 3} ${tf('common.more', 'więcej')}`}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Event details dialog */}
      <EventDetailsDialog
        event={detailsEvent}
        open={!!detailsEvent}
        onOpenChange={(open) => !open && setDetailsEvent(null)}
        onRegister={() => {}} // Already registered
        onCancelRegistration={(eventId) => {
          const event = userEvents.find(e => e.id === eventId);
          if (event) handleCancelMeeting(event);
          setDetailsEvent(null);
        }}
      />
    </Card>
  );
};

export default MyMeetingsWidget;
