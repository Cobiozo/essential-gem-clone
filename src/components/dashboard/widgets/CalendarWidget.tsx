import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ChevronLeft, ChevronRight, Video, Users, User, ExternalLink, UserPlus, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, subMinutes, isAfter, isBefore, isPast } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { EventWithRegistration } from '@/types/events';
import { expandEventsForCalendar, isMultiOccurrenceEvent } from '@/hooks/useOccurrences';

export const CalendarWidget: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { events, loading, registerForEvent } = useEvents();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<EventWithRegistration[]>([]);
  const dateLocale = language === 'pl' ? pl : enUS;

  // Copy webinar invitation to clipboard
  const handleCopyInvitation = (event: EventWithRegistration) => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    const inviteUrl = `${window.location.origin}/events/register/${event.id}${user ? `?invited_by=${user.id}` : ''}`;
    
    const invitationText = `
🎥 Zaproszenie na webinar: ${event.title}

📅 Data: ${format(startDate, 'PPP', { locale: dateLocale })}
⏰ Godzina: ${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}
${event.host_name ? `👤 Prowadzący: ${event.host_name}` : ''}

Zapisz się tutaj: ${inviteUrl}
    `.trim();
    
    navigator.clipboard.writeText(invitationText);
    toast({ 
      title: 'Skopiowano!', 
      description: 'Zaproszenie zostało skopiowane do schowka' 
    });
  };

  // Expand multi-occurrence events for calendar display
  const expandedEvents = useMemo(() => {
    return expandEventsForCalendar(events);
  }, [events]);

  // Sync selectedDayEvents when events change (for real-time updates)
  useEffect(() => {
    if (selectedDate) {
      const dayEvents = expandedEvents.filter(event => 
        isSameDay(new Date(event.start_time), selectedDate)
      );
      setSelectedDayEvents(dayEvents);
    }
  }, [expandedEvents, selectedDate]);

  const locale = language === 'pl' ? pl : enUS;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for the current month
  const getEventsForDay = (day: Date) => {
    return expandedEvents.filter(event => 
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
    
    // Event already ended
    if (isAfter(now, eventEnd)) {
      return (
        <Badge variant="secondary" className="text-xs">
          Zakończone
        </Badge>
      );
    }
    
    // User is registered and it's 15 min before or during event
    if (event.is_registered && isAfter(now, fifteenMinutesBefore) && isBefore(now, eventEnd)) {
      if (event.zoom_link) {
        return (
          <Button
            size="sm"
            className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700"
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
        <Badge className="text-xs bg-emerald-600">
          Trwa teraz
        </Badge>
      );
    }
    
    // User is registered but it's not time yet
    if (event.is_registered) {
      return (
        <Badge variant="secondary" className="text-xs">
          Jesteś zapisany
        </Badge>
      );
    }
    
    // User not registered
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-xs"
        onClick={() => registerForEvent(event.id)}
      >
        {t('events.registerButton') || 'Zapisz się'}
      </Button>
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          {t('events.title') || 'Webinary i spotkania'}
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

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-2 border-t">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Webinar</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Spotkanie zespołu</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            <span className="text-muted-foreground">Spotkanie trójstronne</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" />
            <span className="text-muted-foreground">Konsultacje</span>
          </div>
        </div>

        {/* Selected day events */}
        {selectedDate && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium">
              {format(selectedDate, 'd MMMM', { locale })}
            </h4>
            {selectedDayEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('events.noUpcoming') || 'Brak wydarzeń'}
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
                            Cykliczne
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
                            Prowadzący: {event.host_profile.first_name} {event.host_profile.last_name}
                          </div>
                        )}
                        {event.participant_profile && event.host_user_id === user?.id && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Rezerwujący: {event.participant_profile.first_name} {event.participant_profile.last_name}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                      </span>
                      <div className="flex items-center gap-1">
                        {event.event_type === 'webinar' && !isPast(new Date(event.end_time)) && (
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
            Ładowanie...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
