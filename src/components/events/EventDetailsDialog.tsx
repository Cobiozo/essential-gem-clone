import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, User, MapPin, Users, ExternalLink, Video, X, Globe } from 'lucide-react';
import { format, subMinutes, isAfter, isBefore, isPast } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EventWithRegistration } from '@/types/events';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DEFAULT_EVENT_TIMEZONE, 
  TIMEZONE_OPTIONS, 
  getTimezoneLabel, 
  areTimezonesEqual,
  getBrowserTimezone,
  formatTimeRangeWithTimezone
} from '@/lib/timezone-utils';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

interface EventDetailsDialogProps {
  event: EventWithRegistration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister: (eventId: string, occurrenceIndex?: number) => void;
  onCancelRegistration?: (eventId: string, occurrenceIndex?: number) => void;
}

export const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({
  event,
  open,
  onOpenChange,
  onRegister,
  onCancelRegistration,
}) => {
  const { language } = useLanguage();
  const locale = language === 'pl' ? pl : enUS;
  const [dynamicZoomLink, setDynamicZoomLink] = useState<string | null>(null);
  const [selectedUserTimezone, setSelectedUserTimezone] = useState<string>(getBrowserTimezone());

  // Prepare data safely (can be null)
  const eventStart = event ? new Date(event.start_time) : new Date();
  const eventEnd = event ? new Date(event.end_time) : new Date();
  const eventTimezone = (event as any)?.timezone || DEFAULT_EVENT_TIMEZONE;

  // ALL useMemo hooks BEFORE conditional return - React Rules of Hooks
  const userStartTime = useMemo(() => {
    if (!event) return '';
    try {
      return formatInTimeZone(eventStart, selectedUserTimezone, 'HH:mm');
    } catch {
      return format(eventStart, 'HH:mm');
    }
  }, [event, eventStart, selectedUserTimezone]);
  
  const userEndTime = useMemo(() => {
    if (!event) return '';
    try {
      return formatInTimeZone(eventEnd, selectedUserTimezone, 'HH:mm');
    } catch {
      return format(eventEnd, 'HH:mm');
    }
  }, [event, eventEnd, selectedUserTimezone]);
  
  const eventStartTimeFormatted = useMemo(() => {
    if (!event) return '';
    try {
      return formatInTimeZone(eventStart, eventTimezone, 'HH:mm');
    } catch {
      return format(eventStart, 'HH:mm');
    }
  }, [event, eventStart, eventTimezone]);
  
  const eventEndTimeFormatted = useMemo(() => {
    if (!event) return '';
    try {
      return formatInTimeZone(eventEnd, eventTimezone, 'HH:mm');
    } catch {
      return format(eventEnd, 'HH:mm');
    }
  }, [event, eventEnd, eventTimezone]);

  // Fetch zoom_link from leader_permissions if event doesn't have one
  useEffect(() => {
    const fetchDynamicZoomLink = async () => {
      if (!event?.zoom_link && 
          event?.host_user_id && 
          ['tripartite_meeting', 'partner_consultation'].includes(event.event_type)) {
        
        const { data } = await supabase
          .from('leader_permissions')
          .select('zoom_link')
          .eq('user_id', event.host_user_id)
          .maybeSingle();
        
        if (data?.zoom_link) {
          setDynamicZoomLink(data.zoom_link);
        }
      }
    };
    
    setDynamicZoomLink(null); // Reset when event changes
    if (event) fetchDynamicZoomLink();
  }, [event]);

  // Conditional return AFTER all hooks
  if (!event) return null;

  const now = new Date();
  const fifteenMinutesBefore = subMinutes(eventStart, 15);
  const durationMinutes = Math.round((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60));
  const timezonesMatch = areTimezonesEqual(eventTimezone, selectedUserTimezone);

  // Use dynamic zoom link as fallback
  const effectiveZoomLink = event.zoom_link || dynamicZoomLink;
  
  // External platform detection
  const isExternalPlatform = (event as any).is_external_platform === true;
  const externalPlatformMessage = (event as any).external_platform_message || 
    'Ten webinar odbywa się na zewnętrznej platformie. Zapisz się tutaj, aby otrzymać przypomnienie w kalendarzu, a następnie użyj przycisku poniżej, aby zarejestrować się na platformie docelowej.';

  const isEnded = isAfter(now, eventEnd);
  const isLive = isAfter(now, fifteenMinutesBefore) && isBefore(now, eventEnd);
  const canJoin = event.is_registered && isLive && effectiveZoomLink;
  const showMeetingLink = event.is_registered && effectiveZoomLink && !isEnded;
  
  // Cancel allowed if more than 2 hours before meeting for individual meetings
  const minutesUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60);
  const canCancel = event.is_registered && 
    ['tripartite_meeting', 'partner_consultation'].includes(event.event_type) && 
    minutesUntilEvent > 120;

  // Get occurrence index for multi-occurrence events
  const occurrenceIndex = (event as any)._occurrence_index as number | undefined;

  const handleRegister = () => {
    onRegister(event.id, occurrenceIndex);
  };

  const getEventTypeBadge = () => {
    switch (event.event_type) {
      case 'webinar':
        return <Badge className="bg-blue-500">Webinar</Badge>;
      case 'meeting_public':
      case 'team_training':
        return <Badge className="bg-green-500">Spotkanie zespołu</Badge>;
      case 'meeting_private':
        return <Badge className="bg-purple-500">Spotkanie prywatne</Badge>;
      case 'tripartite_meeting':
        return <Badge className="bg-violet-500">Spotkanie trójstronne</Badge>;
      case 'partner_consultation':
        return <Badge className="bg-fuchsia-500">Konsultacje</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-4 space-y-3">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                {getEventTypeBadge()}
                {isEnded && <Badge variant="secondary">Zakończone</Badge>}
                {isLive && !isEnded && <Badge className="bg-emerald-600">Trwa teraz</Badge>}
              </div>
              <DialogTitle className="text-lg leading-tight">{event.title}</DialogTitle>
            </DialogHeader>

            {/* Sekcja: Grafika + Info - układ dwukolumnowy */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* Lewa kolumna: Grafika */}
              {event.image_url && (
                <div className="md:w-2/5 flex-shrink-0">
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-auto rounded-lg object-contain"
                  />
                </div>
              )}
              
              {/* Prawa kolumna: Informacje */}
              <div className="flex-1 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{format(eventStart, 'EEEE, d MMMM', { locale })}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>
                    {eventStartTimeFormatted} - {eventEndTimeFormatted} ({durationMinutes} min)
                    <span className="ml-1 text-muted-foreground">({getTimezoneLabel(eventTimezone, 'short')})</span>
                  </span>
                </div>

                {(event.host_name || event.host_profile) && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      {event.host_profile 
                        ? `${event.host_profile.first_name || ''} ${event.host_profile.last_name || ''}`.trim()
                        : event.host_name}
                    </span>
                  </div>
                )}

                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{event.location}</span>
                  </div>
                )}

                {event.max_participants && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      {event.registration_count || 0} / {event.max_participants} uczestników
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Timezone Section - always visible for public events */}
            {(event.event_type === 'webinar' || event.event_type === 'team_training' || event.event_type === 'meeting_public') && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Strefy czasowe</span>
                </div>
                
                {/* User timezone selector */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Twoja strefa:</span>
                  <Select value={selectedUserTimezone} onValueChange={setSelectedUserTimezone}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map(tz => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Display times */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    Twój czas: {userStartTime} - {userEndTime}
                  </span>
                  <span className="text-muted-foreground">
                    ({getTimezoneLabel(selectedUserTimezone, 'short')})
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Czas wydarzenia: {eventStartTimeFormatted} - {eventEndTimeFormatted}
                  </span>
                  <span>({getTimezoneLabel(eventTimezone, 'short')})</span>
                </div>
                
                {timezonesMatch ? (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    ✓ Te same strefy czasowe
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 flex items-center gap-1">
                    ⚠️ Różne strefy czasowe
                  </div>
                )}
              </div>
            )}

            {/* External platform banner */}
            {isExternalPlatform && !isEnded && (
              <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <Globe className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                  {externalPlatformMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Description - pod spodem */}
            {event.description && (
              <div className="pt-2 border-t">
                <div
                  className="text-sm text-muted-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-4 border-t space-y-2">
              {/* Meeting link visible for registered users before meeting ends */}
              {showMeetingLink && !canJoin && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={effectiveZoomLink!} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-primary hover:underline truncate flex-1"
                  >
                    Link do spotkania
                  </a>
                </div>
              )}

              {canJoin && (
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" asChild>
                  <a href={effectiveZoomLink!} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4 mr-2" />
                    Dołącz do spotkania
                  </a>
                </Button>
              )}

              {isEnded ? (
                <Button variant="secondary" className="w-full" disabled>
                  Wydarzenie zakończone
                </Button>
              ) : event.is_registered ? (
                <Button variant="secondary" className="w-full" disabled>
                  {isExternalPlatform ? '📅 Dodano do kalendarza' : 'Jesteś zapisany/a'}
                </Button>
              ) : (
                <Button className="w-full" onClick={handleRegister} variant={isExternalPlatform ? 'outline' : 'default'}>
                  {isExternalPlatform ? '📅 Dodaj do kalendarza' : 'Zapisz się'}
                </Button>
              )}

              {/* Cancel button for individual meetings (more than 2h before) */}
              {canCancel && onCancelRegistration && (
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => onCancelRegistration(event.id, occurrenceIndex)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Anuluj rezerwację
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
