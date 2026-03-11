import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Video, Users, User, ExternalLink, Clock, Info, X, UserPlus, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { Widget3DIcon } from './Widget3DIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { subMinutes, isAfter, isBefore, differenceInMinutes, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { pl, enUS } from 'date-fns/locale';
import type { EventWithRegistration } from '@/types/events';
import { EventDetailsDialog } from '@/components/events/EventDetailsDialog';
import { WidgetInfoButton } from '../WidgetInfoButton';
import { getTimezoneAbbr, DEFAULT_EVENT_TIMEZONE } from '@/utils/timezoneHelpers';
import { expandEventsForCalendar } from '@/hooks/useOccurrences';
import { useMeetingRoomStatus } from '@/hooks/useMeetingRoomStatus';
import { InvitationLanguageSelect } from '@/components/InvitationLanguageSelect';
import { getInvitationLabels, getDateLocale } from '@/utils/invitationTemplates';

interface MyMeetingsWidgetProps {
  events?: EventWithRegistration[];
  eventsLoading?: boolean;
}

const GROUP_EVENT_TYPES = ['webinar', 'auto_webinar', 'meeting_public', 'team_training'];

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
  const [inviteLang, setInviteLang] = useState('pl');

  const locale = language === 'pl' ? pl : enUS;

  const userEvents = useMemo(() => {
    if (!sharedEvents) return [];
    const expanded = expandEventsForCalendar(sharedEvents);
    return expanded.filter(e => e.is_registered);
  }, [sharedEvents]);

  const toggleExpand = (key: string) => {
    setExpandedTypes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'webinar':
      case 'auto_webinar':
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
      case 'auto_webinar':
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

  const getDetailsPath = (event: EventWithRegistration) => {
    if (event.event_type === 'webinar' || event.event_type === 'auto_webinar') {
      return `/events/webinars?event=${event.id}`;
    }
    if (event.event_type === 'meeting_public' || event.event_type === 'team_training') {
      return `/events/team-meetings?event=${event.id}`;
    }
    return null;
  };

  // Collect meeting room IDs for real-time status tracking
  const meetingRoomIds = useMemo(() => {
    return userEvents
      .filter(e => (e as any).meeting_room_id)
      .map(e => (e as any).meeting_room_id as string);
  }, [userEvents]);

  const activeRoomIds = useMeetingRoomStatus(meetingRoomIds);

  // Filter to show only upcoming events
  const upcomingEvents = userEvents.filter(e => {
    const now = new Date();
    const endTime = new Date(e.end_time);
    if (endTime <= now) return false;
    const roomId = (e as any).meeting_room_id;
    if (roomId && !activeRoomIds.has(roomId) && new Date(e.start_time) <= now) {
      return false;
    }
    return true;
  });

  // Group by day, then by type within each day
  const groupedByDay = useMemo(() => {
    const dayMap: Record<string, Record<string, EventWithRegistration[]>> = {};
    
    for (const event of upcomingEvents) {
      const dayKey = format(new Date(event.start_time), 'yyyy-MM-dd');
      if (!dayMap[dayKey]) dayMap[dayKey] = {};
      const type = event.event_type;
      if (!dayMap[dayKey][type]) dayMap[dayKey][type] = [];
      dayMap[dayKey][type].push(event);
    }

    // Sort days chronologically
    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, types]) => ({ day, types }));
  }, [upcomingEvents]);

  // Handle invitation copy
  const handleCopyInvitation = (event: EventWithRegistration) => {
    const eventTz = event.timezone || DEFAULT_EVENT_TIMEZONE;
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    
    const baseUrl = window.location.origin;
    const eventSlug = (event as any).slug;
    let inviteUrl: string;
    if (eventSlug) {
      const params = new URLSearchParams();
      if (inviteLang !== 'pl') params.set('lang', inviteLang);
      const qs = params.toString();
      inviteUrl = `${baseUrl}/e/${eventSlug}${qs ? `?${qs}` : ''}`;
    } else {
      inviteUrl = `${baseUrl}/events/register/${event.id}${user ? `?invited_by=${user.id}` : ''}`;
    }

    const labels = getInvitationLabels(inviteLang);
    const invLocale = getDateLocale(inviteLang);
    const invitationText = `
🎥 ${labels.webinarInvitation}: ${event.title}

📅 ${labels.date}: ${formatInTimeZone(startDate, eventTz, 'PPP', { locale: invLocale })}
⏰ ${labels.time}: ${formatInTimeZone(startDate, eventTz, 'HH:mm')} - ${formatInTimeZone(endDate, eventTz, 'HH:mm')} (${getTimezoneAbbr(eventTz)})
${event.host_name ? `👤 ${labels.host}: ${event.host_name}` : ''}

${labels.signUp}: ${inviteUrl}
    `.trim();

    navigator.clipboard.writeText(invitationText);
    toast({
      title: labels.copied,
      description: labels.invitationCopied,
    });
  };

  // Handle meeting cancellation via Edge Function
  const handleCancelMeeting = async (event: EventWithRegistration) => {
    if (!user) return;
    
    const confirmed = window.confirm(tf('events.confirmCancelMeeting', 'Czy na pewno chcesz anulować to spotkanie? Obie strony otrzymają powiadomienie email.'));
    if (!confirmed) return;

    setCancellingEventId(event.id);

    try {
      const { data, error } = await supabase.functions.invoke('cancel-individual-meeting', {
        body: { event_id: event.id }
      });

      if (error) throw new Error(error.message || tf('common.error', 'Błąd wywołania funkcji'));
      if (!data?.success) throw new Error(data?.error || tf('events.cancelFailed', 'Nie udało się anulować spotkania'));

      toast({
        title: tf('events.meetingCancelled', 'Spotkanie anulowane'),
        description: `${tf('events.emailNotificationsSent', 'Powiadomienia email wysłane')} (${data.emails_sent}/${data.total_participants}).`,
      });

      window.dispatchEvent(new CustomEvent('eventRegistrationChange'));
    } catch (error: any) {
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
    
    if (isAfter(now, eventEnd)) return null;
    
    const isGroupEvent = GROUP_EVENT_TYPES.includes(event.event_type);
    const eventAny = event as any;
    const isHost = event.host_user_id === user?.id || eventAny.created_by === user?.id;
    const zoomUrl = isHost && eventAny.zoom_start_url ? eventAny.zoom_start_url : event.zoom_link;
    const buttonLabel = isHost && eventAny.zoom_start_url ? tf('events.start', 'Rozpocznij') : tf('events.join', 'WEJDŹ');
    
    const detailsPath = getDetailsPath(event);

    // Helper: details button for group events
    const detailsButton = isGroupEvent && detailsPath ? (
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-3 text-xs touch-action-manipulation"
        onClick={() => navigate(detailsPath)}
      >
        <Info className="h-3.5 w-3.5 mr-1" />
        {tf('events.details', 'Szczegóły')}
      </Button>
    ) : null;

    // 15 min before or during event - show WEJDŹ button
    if (isAfter(now, fifteenMinutesBefore) && isBefore(now, eventEnd)) {
      // Internal WebRTC meeting
      if (eventAny.use_internal_meeting && eventAny.meeting_room_id) {
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium touch-action-manipulation"
              asChild
            >
              <a href={`/meeting-room/${eventAny.meeting_room_id}`} target="_blank" rel="noopener noreferrer">
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                {tf('events.join', 'WEJDŹ')}
              </a>
            </Button>
            {detailsButton}
          </div>
        );
      }
      if (zoomUrl) {
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium touch-action-manipulation"
              asChild
            >
              <a href={zoomUrl} target="_blank" rel="noopener noreferrer">
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                {buttonLabel}
              </a>
            </Button>
            {detailsButton}
          </div>
        );
      }
      // No zoom link
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium touch-action-manipulation"
            onClick={() => setDetailsEvent(event)}
          >
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            {tf('events.join', 'Wejdź')}
          </Button>
          {detailsButton}
        </div>
      );
    }
    
    // Countdown within 60 min
    if (minutesUntilEvent <= 60 && minutesUntilEvent > 15) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {tf('events.inMinutes', 'Za')} {minutesUntilEvent} min
          </div>
          {detailsButton}
        </div>
      );
    }
    
    // Group events (webinars/team meetings) - show details
    if (isGroupEvent && detailsPath) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs touch-action-manipulation"
          onClick={() => navigate(detailsPath)}
        >
          <Info className="h-3.5 w-3.5 mr-1" />
          {tf('events.details', 'Szczegóły')}
        </Button>
      );
    }
    
    // Individual meetings
    if (['tripartite_meeting', 'partner_consultation', 'meeting_private'].includes(event.event_type)) {
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs touch-action-manipulation"
            onClick={() => setDetailsEvent(event)}
          >
            <Info className="h-3.5 w-3.5 mr-1" />
            {tf('events.details', 'Szczegóły')}
          </Button>
          {minutesUntilEvent > 120 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 touch-action-manipulation"
              onClick={() => handleCancelMeeting(event)}
              disabled={cancellingEventId === event.id}
            >
              <X className="h-3.5 w-3.5" />
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
          className="h-8 px-3 text-xs touch-action-manipulation"
          asChild
        >
          <a href={zoomUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            {isHost ? tf('events.start', 'Rozpocznij') : 'Zoom'}
          </a>
        </Button>
      );
    }
    
    // Cancel button for individual meetings without zoom
    if (['tripartite_meeting', 'partner_consultation', 'meeting_private'].includes(event.event_type) && 
        minutesUntilEvent > 120) {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 touch-action-manipulation"
          onClick={() => handleCancelMeeting(event)}
          disabled={cancellingEventId === event.id}
        >
          <X className="h-3.5 w-3.5 mr-1" />
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
          <div className="space-y-5">
            {groupedByDay.map(({ day, types }) => (
              <div key={day} className="space-y-3">
                {/* Day header */}
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                  {format(new Date(day + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale })}
                </h3>

                {Object.entries(types).map(([type, events]) => {
                  const expandKey = `${day}-${type}`;
                  const isGroupEvent = GROUP_EVENT_TYPES.includes(type);

                  return (
                    <div key={type} className="space-y-2 pl-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        {getEventIcon(type)}
                        {getEventTypeName(type)}
                        <Badge variant="secondary" className="text-xs ml-1">{events.length}</Badge>
                      </h4>

                      <div className="space-y-1.5">
                        {(expandedTypes[expandKey] ? events : events.slice(0, 3)).map((event, idx) => (
                          <div
                            key={`${event.id}-${(event as any)._occurrence_index ?? idx}`}
                            className="p-2 rounded-lg bg-muted/50 space-y-1.5"
                          >
                            {/* Title row - full title */}
                            <div className="text-sm font-medium">{event.title}</div>

                            {/* Time + action buttons */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {formatInTimeZone(new Date(event.start_time), event.timezone || DEFAULT_EVENT_TIMEZONE, 'HH:mm', { locale })} - {formatInTimeZone(new Date(event.end_time), event.timezone || DEFAULT_EVENT_TIMEZONE, 'HH:mm', { locale })} ({getTimezoneAbbr(event.timezone || DEFAULT_EVENT_TIMEZONE)})
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {getActionButton(event)}
                              </div>
                            </div>

                            {/* Info for individual meetings */}
                            {['tripartite_meeting', 'partner_consultation', 'meeting_private'].includes(event.event_type) && (
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

                            {/* Invite guest row for group events */}
                            {isGroupEvent && (
                              <div className="flex items-center gap-1 pt-0.5">
                                <InvitationLanguageSelect
                                  value={inviteLang}
                                  onValueChange={setInviteLang}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground touch-action-manipulation"
                                  onClick={() => handleCopyInvitation(event)}
                                  title={tf('events.inviteGuest', 'Zaproś gościa')}
                                >
                                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                                  {tf('events.invite', 'Zaproś')}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}

                        {events.length > 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground hover:text-foreground h-6"
                            onClick={() => toggleExpand(expandKey)}
                          >
                            {expandedTypes[expandKey]
                              ? tf('common.collapse', 'Zwiń')
                              : `+${events.length - 3} ${tf('common.more', 'więcej')}`}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
        onRegister={() => {}}
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
