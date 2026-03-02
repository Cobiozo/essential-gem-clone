import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ChevronLeft, ChevronRight, Video, Users, User, ExternalLink, UserPlus, CalendarDays, Info, X } from 'lucide-react';
import { Widget3DIcon } from './Widget3DIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, subMinutes, isAfter, isBefore, isPast } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { pl, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { EventWithRegistration, EventButton } from '@/types/events';
import { expandEventsForCalendar, isMultiOccurrenceEvent } from '@/hooks/useOccurrences';
import { EventDetailsDialog } from '@/components/events/EventDetailsDialog';
import { WidgetInfoButton } from '../WidgetInfoButton';
import { getTimezoneAbbr, DEFAULT_EVENT_TIMEZONE } from '@/utils/timezoneHelpers';
import { useMeetingRoomStatus } from '@/hooks/useMeetingRoomStatus';

interface CalendarWidgetProps {
  events?: EventWithRegistration[];
  loading?: boolean;
  registerForEvent?: (eventId: string, occurrenceIndex?: number) => Promise<boolean>;
  cancelRegistration?: (eventId: string, occurrenceIndex?: number) => Promise<boolean>;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  events = [],
  loading = false,
  registerForEvent = async () => false,
  cancelRegistration = async () => false,
}) => {
  const { t, tf, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<EventWithRegistration[]>([]);
  const [detailsEvent, setDetailsEvent] = useState<EventWithRegistration | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const dateLocale = language === 'pl' ? pl : enUS;

  // Collect meeting_room_ids from internal meeting events for overtime detection
  const internalMeetingRoomIds = useMemo(() => {
    return events
      .filter(e => (e as any).use_internal_meeting && (e as any).meeting_room_id)
      .map(e => (e as any).meeting_room_id as string);
  }, [events]);
  const activeRoomIds = useMeetingRoomStatus(internalMeetingRoomIds);

  // Legend items configuration
  const legendItems = [
    { type: 'webinar', color: 'bg-blue-500', label: tf('events.type.webinar', 'Webinar') },
    { type: 'team_training', color: 'bg-green-500', label: tf('events.type.teamMeeting', 'Spotkanie zespołu') },
    { type: 'tripartite_meeting', color: 'bg-violet-500', label: tf('events.type.tripartiteMeeting', 'Spotkanie trójstronne') },
    { type: 'partner_consultation', color: 'bg-fuchsia-500', label: tf('events.type.consultation', 'Konsultacje') }
  ];

  // Copy webinar invitation to clipboard
  const handleCopyInvitation = (event: EventWithRegistration) => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    const eventTz = event.timezone || DEFAULT_EVENT_TIMEZONE;
    const inviteUrl = `${window.location.origin}/events/register/${event.id}${user ? `?invited_by=${user.id}` : ''}`;
    
    const webinarInvLabel = tf('events.webinarInvitation', 'Zaproszenie na webinar');
    const hostLabel = tf('events.host', 'Prowadzący');
    const signUpLabel = tf('events.signUpHere', 'Zapisz się tutaj');
    const invitationText = `
🎥 ${webinarInvLabel}: ${event.title}

📅 Data: ${formatInTimeZone(startDate, eventTz, 'PPP', { locale: dateLocale })}
⏰ Godzina: ${formatInTimeZone(startDate, eventTz, 'HH:mm')} - ${formatInTimeZone(endDate, eventTz, 'HH:mm')} (${getTimezoneAbbr(eventTz)})
${event.host_name ? `👤 ${hostLabel}: ${event.host_name}` : ''}

${signUpLabel}: ${inviteUrl}
    `.trim();
    
    navigator.clipboard.writeText(invitationText);
    toast({ 
      title: tf('common.copied', 'Skopiowano!'), 
      description: tf('events.invitationCopied', 'Zaproszenie zostało skopiowane do schowka') 
    });
  };

  // Expand multi-occurrence events for calendar display
  const expandedEvents = useMemo(() => {
    return expandEventsForCalendar(events);
  }, [events]);

  // Filter events based on active legend filter
  const filteredEvents = useMemo(() => {
    if (!activeFilter) return expandedEvents;
    return expandedEvents.filter(event => {
      if (activeFilter === 'team_training') {
        return event.event_type === 'team_training' || event.event_type === 'meeting_public';
      }
      return event.event_type === activeFilter;
    });
  }, [expandedEvents, activeFilter]);

  // Sync selectedDayEvents when events or filter change (for real-time updates)
  useEffect(() => {
    if (selectedDate) {
      const dayEvents = filteredEvents.filter(event => 
        isSameDay(new Date(event.start_time), selectedDate)
      );
      setSelectedDayEvents(dayEvents);
    }
  }, [filteredEvents, selectedDate, activeFilter]);

  const locale = language === 'pl' ? pl : enUS;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for the current month (uses filtered events)
  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter(event => 
      isSameDay(new Date(event.start_time), day)
    );
  };

  // Get event type color
  const getEventColor = (type: string) => {
    switch (type) {
      case 'webinar':
        return 'bg-blue-500';
      case 'meeting_public':
      case 'team_training':
        return 'bg-green-500';
      case 'meeting_private':
        return 'bg-purple-500';
      case 'tripartite_meeting':
        return 'bg-violet-500';
      case 'partner_consultation':
        return 'bg-fuchsia-500';
      default:
        return 'bg-primary';
    }
  };

  // Handle day click
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setSelectedDayEvents(getEventsForDay(day));
  };

  // Get weekday headers
  const weekDays = language === 'pl' 
    ? ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  // Adjust days array to start from Monday
  const getAdjustedDayOfWeek = (date: Date) => {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
  };

  const firstDayOffset = getAdjustedDayOfWeek(monthStart);

  // Dynamic registration button logic
  const getRegistrationButton = (event: EventWithRegistration) => {
    const now = new Date();
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    const fifteenMinutesBefore = subMinutes(eventStart, 15);
    const occurrenceIndex = (event as any)._occurrence_index as number | undefined;
    const isExternalPlatform = (event as any).is_external_platform === true;
    
    // Overtime detection for internal meetings
    const useInternalMeeting = (event as any).use_internal_meeting === true;
    const meetingRoomId = (event as any).meeting_room_id as string | undefined;
    const isRoomActive = useInternalMeeting && meetingRoomId ? activeRoomIds.has(meetingRoomId) : false;
    const isOvertime = isAfter(now, eventEnd);
    const isStillRunning = isOvertime && isRoomActive;

    // Wydarzenie zakończone (but NOT if room is still active)
    if (isOvertime && !isStillRunning) {
      return <Badge variant="secondary" className="text-xs">{tf('events.ended', 'Zakończone')}</Badge>;
    }

    // Overtime: event past end_time but room still active
    if (isStillRunning) {
      const overtimeMinutes = Math.round((now.getTime() - eventEnd.getTime()) / (1000 * 60));
      const overtimeLabel = overtimeMinutes >= 60
        ? `+${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}min`
        : `+${overtimeMinutes} min`;

      if (event.is_registered && meetingRoomId) {
        return (
          <Button size="sm" className="h-6 text-xs bg-amber-600 hover:bg-amber-700" asChild>
            <a href={`/meeting-room/${meetingRoomId}`}>
              <Video className="h-3 w-3 mr-1" />
              {tf('events.join', 'WEJDŹ')} ({overtimeLabel})
            </a>
          </Button>
        );
      }
      return <Badge className="text-xs bg-amber-600">{tf('events.overtime', 'Trwa dłużej')} ({overtimeLabel})</Badge>;
    }
    
    // Można dołączyć (15 min przed lub trwa)
    if (event.is_registered && isAfter(now, fifteenMinutesBefore) && isBefore(now, eventEnd)) {
      // Internal WebRTC meeting
      if ((event as any).use_internal_meeting && (event as any).meeting_room_id) {
        return (
          <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700" asChild>
            <a href={`/meeting-room/${(event as any).meeting_room_id}`}>
              <Video className="h-3 w-3 mr-1" />
              {tf('events.join', 'WEJDŹ')}
            </a>
          </Button>
        );
      }
      if (event.zoom_link) {
        return (
          <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700" asChild>
            <a href={event.zoom_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              {tf('events.join', 'WEJDŹ')}
            </a>
          </Button>
        );
      }
      return <Badge className="text-xs bg-emerald-600">{tf('events.liveNow', 'Trwa teraz')}</Badge>;
    }
    
    // Zarejestrowany
    if (event.is_registered) {
      // Spotkania indywidualne — blokada anulowania < 2h, Edge Function zamiast cancelRegistration
      const isIndividualMeeting = ['tripartite_meeting', 'partner_consultation', 'meeting_private'].includes(event.event_type);
      
      if (isIndividualMeeting) {
        const minutesUntilMeeting = (eventStart.getTime() - now.getTime()) / (1000 * 60);
        if (minutesUntilMeeting > 120) {
          return (
            <Button
              size="sm"
              variant="secondary"
              className="h-6 text-xs text-destructive hover:text-destructive"
              onClick={async () => {
                const confirmed = window.confirm(tf('events.confirmCancelMeeting', 'Czy na pewno chcesz anulować to spotkanie? Obie strony otrzymają powiadomienie email.'));
                if (!confirmed) return;
                try {
                  const { data, error } = await supabase.functions.invoke('cancel-individual-meeting', {
                    body: { event_id: event.id }
                  });
                  if (error || !data?.success) {
                    toast({ title: tf('common.error', 'Błąd'), description: data?.error || tf('events.cancelFailed', 'Nie udało się anulować spotkania'), variant: 'destructive' });
                    return;
                  }
                  toast({ title: tf('events.meetingCancelled', 'Spotkanie anulowane'), description: `${tf('events.emailNotificationsSent', 'Powiadomienia email wysłane')} (${data.emails_sent}/${data.total_participants}).` });
                  window.dispatchEvent(new CustomEvent('eventRegistrationChange'));
                } catch (err: any) {
                  toast({ title: tf('common.error', 'Błąd'), description: err.message, variant: 'destructive' });
                }
              }}
            >
              <X className="h-3 w-3 mr-1" />
              {tf('events.cancelMeeting', 'Anuluj spotkanie')}
            </Button>
          );
        }
        // < 2h — brak przycisku anulowania
        return <Badge variant="secondary" className="text-xs">{tf('events.registered', 'Zapisany/a')}</Badge>;
      }
      
      if (isExternalPlatform) {
        return (
          <Button
            size="sm"
            variant="secondary"
            className="h-6 text-xs"
            onClick={() => cancelRegistration(event.id, occurrenceIndex)}
          >
            <X className="h-3 w-3 mr-1" />
            {tf('events.removeFromCalendar', 'Usuń z kalendarza')}
          </Button>
        );
      }
      // Normalne wydarzenie - "Wypisz się"
      return (
        <Button
          size="sm"
          variant="secondary"
          className="h-6 text-xs"
          onClick={() => cancelRegistration(event.id, occurrenceIndex)}
        >
          <X className="h-3 w-3 mr-1" />
          {tf('events.unregister', 'Wypisz się')}
        </Button>
      );
    }
    
    // Niezarejestrowany
    if (isExternalPlatform) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs"
          onClick={() => registerForEvent(event.id, occurrenceIndex)}
        >
          <Calendar className="h-3 w-3 mr-1" />
          {tf('events.addToCalendar', 'Dodaj do kalendarza')}
        </Button>
      );
    }
    
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-xs"
        onClick={() => registerForEvent(event.id, occurrenceIndex)}
      >
        {tf('events.registerButton', 'Zapisz się')}
      </Button>
    );
  };

  return (
    <Card data-tour="calendar-widget" variant="premium" className="relative">
      <WidgetInfoButton description="Kalendarz wydarzeń - kliknij dzień aby zobaczyć zaplanowane webinary i spotkania. Kliknij kategorię w legendzie aby filtrować." />
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <Widget3DIcon icon={Calendar} variant="violet" size="md" />
          {tf('events.title', 'Webinary i spotkania')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-sm">
            {format(currentMonth, 'LLLL yyyy', { locale })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Weekday headers */}
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
              {day}
            </div>
          ))}

          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}

          {/* Calendar days */}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const hasEvents = dayEvents.length > 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "h-8 w-full rounded-md text-sm relative flex flex-col items-center justify-center transition-colors",
                  !isSameMonth(day, currentMonth) && "text-muted-foreground opacity-50",
                  today && "bg-accent text-accent-foreground font-semibold",
                  isSelected && "ring-2 ring-primary",
                  hasEvents && "cursor-pointer hover:bg-muted",
                  !hasEvents && "hover:bg-muted/50"
                )}
              >
                <span>{format(day, 'd')}</span>
                {hasEvents && (
                  <div className="absolute bottom-0.5 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className={cn("w-1.5 h-1.5 rounded-full", getEventColor(event.event_type))}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Interactive Legend */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {legendItems.map((item) => (
            <button
              key={item.type}
              onClick={() => setActiveFilter(prev => prev === item.type ? null : item.type)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all cursor-pointer",
                activeFilter === item.type 
                  ? "bg-muted ring-2 ring-primary" 
                  : "hover:bg-muted/50",
                activeFilter && activeFilter !== item.type && "opacity-40"
              )}
            >
              <div className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
              <span className={cn(
                activeFilter === item.type ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Selected day events */}
        {selectedDate && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium">
              {format(selectedDate, 'd MMMM', { locale })}
            </h4>
            {selectedDayEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {tf('events.noUpcoming', 'Brak wydarzeń')}
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map(event => (
                  <div
                    key={`${event.id}-${(event as any)._occurrence_index ?? 'single'}`}
                    className="p-2 rounded-md bg-muted/50 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {event.event_type === 'webinar' && <Video className="h-3.5 w-3.5 text-blue-500" />}
                        {(event.event_type === 'meeting_public' || event.event_type === 'team_training') && <Users className="h-3.5 w-3.5 text-green-500" />}
                        {event.event_type === 'meeting_private' && <User className="h-3.5 w-3.5 text-purple-500" />}
                        {event.event_type === 'tripartite_meeting' && <Users className="h-3.5 w-3.5 text-violet-500" />}
                        {event.event_type === 'partner_consultation' && <User className="h-3.5 w-3.5 text-fuchsia-500" />}
                        <span className="text-sm font-medium line-clamp-1">{event.title}</span>
                        {(event as any)._is_multi_occurrence && (
                           <Badge variant="outline" className="text-xs ml-1 px-1.5 py-0">
                             <CalendarDays className="h-3 w-3 mr-0.5" />
                             {tf('events.recurring', 'Cykliczne')}
                           </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Host/participant info for individual meetings */}
                    {(event.event_type === 'tripartite_meeting' || event.event_type === 'partner_consultation') && (
                      <div className="text-xs text-muted-foreground">
                        {event.host_profile && event.host_user_id !== user?.id && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {tf('events.host', 'Prowadzący')}: {event.host_profile.first_name} {event.host_profile.last_name}
                          </div>
                        )}
                        {event.participant_profile && event.host_user_id === user?.id && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {tf('events.bookedBy', 'Rezerwujący')}: {event.participant_profile.first_name} {event.participant_profile.last_name}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatInTimeZone(new Date(event.start_time), event.timezone || DEFAULT_EVENT_TIMEZONE, 'HH:mm')} - {formatInTimeZone(new Date(event.end_time), event.timezone || DEFAULT_EVENT_TIMEZONE, 'HH:mm')} ({getTimezoneAbbr(event.timezone || DEFAULT_EVENT_TIMEZONE)})
                      </span>
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsEvent(event);
                          }}
                           title={tf('events.details', 'Szczegóły')}
                         >
                           <Info className="h-3 w-3 mr-1" />
                           {tf('events.details', 'Szczegóły')}
                        </Button>
                        {event.event_type === 'webinar' && !isPast(new Date(event.end_time)) && (event as any).allow_invites === true && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyInvitation(event);
                            }}
                            title="Zaproś Gościa"
                          >
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        )}
                        {/* Custom action buttons - zawsze widoczne */}
                        {event.buttons && event.buttons.length > 0 && event.buttons.map((btn: EventButton, index: number) => {
                          const variant = btn.style === 'primary' ? 'default' : 
                                          btn.style === 'secondary' ? 'secondary' : 'outline';
                          return (
                            <Button
                              key={`btn-${index}`}
                              variant={variant}
                              size="sm"
                              className="h-6 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(btn.url, '_blank');
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {btn.label}
                            </Button>
                          );
                        })}
                        {getRegistrationButton(event)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center text-sm text-muted-foreground py-4">
            {tf('common.loading', 'Ładowanie...')}
          </div>
        )}

        {/* Event details dialog */}
        <EventDetailsDialog
          event={detailsEvent}
          open={!!detailsEvent}
          onOpenChange={(open) => !open && setDetailsEvent(null)}
          onRegister={(eventId, occurrenceIndex) => registerForEvent(eventId, occurrenceIndex)}
          activeRoomIds={activeRoomIds}
          onCancelRegistration={async (eventId, occurrenceIndex) => {
            // For individual meetings (tripartite/partner_consultation) use Edge Function
            const event = detailsEvent;
            if (event && ['tripartite_meeting', 'partner_consultation', 'meeting_private'].includes(event.event_type)) {
              const confirmed = window.confirm(tf('events.confirmCancelMeeting', 'Czy na pewno chcesz anulować to spotkanie? Obie strony otrzymają powiadomienie email.'));
              if (!confirmed) return;
              
              try {
                const { data, error } = await supabase.functions.invoke('cancel-individual-meeting', {
                  body: { event_id: eventId }
                });
                
                if (error || !data?.success) {
                toast({
                    title: tf('common.error', 'Błąd'),
                    description: data?.error || tf('events.cancelFailed', 'Nie udało się anulować spotkania'),
                    variant: 'destructive'
                  });
                  return;
                }
                
                toast({
                  title: tf('events.meetingCancelled', 'Spotkanie anulowane'),
                  description: `${tf('events.emailNotificationsSent', 'Powiadomienia email wysłane')} (${data.emails_sent}/${data.total_participants}).`
                });
              } catch (err: any) {
                toast({
                  title: tf('common.error', 'Błąd'),
                  description: err.message || tf('events.cancelFailed', 'Nie udało się anulować spotkania'),
                  variant: 'destructive'
                });
                return;
              }
            } else {
              // For other event types, use standard cancelRegistration with occurrenceIndex
              const confirmed = window.confirm(tf('events.confirmCancelReservation', 'Czy na pewno chcesz anulować rezerwację?'));
              if (!confirmed) return;
              await cancelRegistration(eventId, occurrenceIndex);
            }
            
            setDetailsEvent(null);
            window.dispatchEvent(new CustomEvent('eventRegistrationChange'));
          }}
        />
      </CardContent>
    </Card>
  );
};

export default CalendarWidget;
