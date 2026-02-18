import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { isPast, isFuture, differenceInMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { pl, enUS } from 'date-fns/locale';
import { getTimezoneAbbr, DEFAULT_EVENT_TIMEZONE } from '@/utils/timezoneHelpers';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Video, 
  ExternalLink, 
  Users,
  Check,
  X,
  Loader2,
  Copy,
  UserPlus,
  CalendarDays
} from 'lucide-react';
import type { EventWithRegistration, EventButton } from '@/types/events';
import { isMultiOccurrenceEvent, getFutureOccurrences } from '@/hooks/useOccurrences';

interface EventCardProps {
  event: EventWithRegistration;
  onRegister?: () => void;
  showRegistration?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  onRegister,
  showRegistration = true 
}) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const dateLocale = language === 'pl' ? pl : enUS;
  
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(event.is_registered || false);

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const now = new Date();
  
  // Event status
  const isLive = now >= startDate && now <= endDate;
  const isUpcoming = isFuture(startDate);
  const isPastEvent = isPast(endDate);
  const minutesUntilStart = differenceInMinutes(startDate, now);
  const canJoinSoon = minutesUntilStart <= 15 && minutesUntilStart > 0;

  // Duration in minutes
  const durationMinutes = event.duration_minutes || differenceInMinutes(endDate, startDate);

  // Get occurrence index for multi-occurrence events
  const occurrenceIndex = (event as any)._occurrence_index as number | undefined;

  const handleRegister = async () => {
    if (!user) {
      toast({
        title: t('toast.error'),
        description: t('events.loginRequired'),
        variant: 'destructive',
      });
      return;
    }

    setRegistering(true);
    try {
      if (isRegistered) {
        // Cancel registration - UPDATE status to cancelled with occurrence_index
        let query = supabase
          .from('event_registrations')
          .update({ 
            status: 'cancelled', 
            cancelled_at: new Date().toISOString() 
          })
          .eq('event_id', event.id)
          .eq('user_id', user.id);
        
        if (occurrenceIndex !== undefined) {
          query = query.eq('occurrence_index', occurrenceIndex);
        } else {
          query = query.is('occurrence_index', null);
        }
        
        const { error } = await query;
        
        if (error) throw error;
        
        setIsRegistered(false);
        toast({
          title: t('toast.success'),
          description: t('events.registrationCancelled'),
        });
        
        // Sync with Google Calendar - delete event
        try {
          await supabase.functions.invoke('sync-google-calendar', {
            body: { user_id: user.id, event_id: event.id, action: 'delete', occurrence_index: occurrenceIndex }
          });
        } catch (syncErr) {
          console.error('[EventCard] Google Calendar sync (delete) failed:', syncErr);
        }
      } else {
        // Check if there's an existing registration (cancelled) with occurrence_index
        let checkQuery = supabase
          .from('event_registrations')
          .select('id, status')
          .eq('event_id', event.id)
          .eq('user_id', user.id);
        
        if (occurrenceIndex !== undefined) {
          checkQuery = checkQuery.eq('occurrence_index', occurrenceIndex);
        } else {
          checkQuery = checkQuery.is('occurrence_index', null);
        }
        
        const { data: existingReg } = await checkQuery.maybeSingle();

        if (existingReg) {
          // UPDATE existing registration to 'registered'
          const { error } = await supabase
            .from('event_registrations')
            .update({ 
              status: 'registered',
              cancelled_at: null,
              registered_at: new Date().toISOString()
            })
            .eq('id', existingReg.id);

          if (error) throw error;
          console.log('[EventCard] Re-activated existing registration for occurrence:', occurrenceIndex);
        } else {
          // INSERT new registration with occurrence_index
          const { error } = await supabase
            .from('event_registrations')
            .insert({
              event_id: event.id,
              user_id: user.id,
              status: 'registered',
              occurrence_index: occurrenceIndex ?? null,
            });

          if (error) throw error;
          console.log('[EventCard] Created new registration for occurrence:', occurrenceIndex);
        }
        
        setIsRegistered(true);
        toast({
          title: t('toast.success'),
          description: t('events.registrationSuccess'),
        });
        
        // Sync with Google Calendar - create event
        try {
          await supabase.functions.invoke('sync-google-calendar', {
            body: { user_id: user.id, event_id: event.id, action: 'create', occurrence_index: occurrenceIndex }
          });
        } catch (syncErr) {
          console.error('[EventCard] Google Calendar sync (create) failed:', syncErr);
        }
      }
      onRegister?.();
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: t('toast.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRegistering(false);
    }
  };

  const getStatusBadge = () => {
    if (isLive) {
      return <Badge className="bg-red-500 animate-pulse">NA ŻYWO</Badge>;
    }
    if (canJoinSoon) {
      return <Badge className="bg-orange-500">Za {minutesUntilStart} min</Badge>;
    }
    if (isPastEvent) {
      return <Badge variant="secondary">Zakończone</Badge>;
    }
    return null;
  };

  const getTypeBadge = () => {
    const badges: React.ReactNode[] = [];
    
    // Multi-occurrence badge
    if (isMultiOccurrenceEvent(event)) {
      const futureCount = getFutureOccurrences(event).length;
      badges.push(
        <Badge key="multi" variant="outline" className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          Cykliczne ({futureCount})
        </Badge>
      );
    }
    
    const type = event.webinar_type || (event as any).training_type;
    if (type) {
      const labels: Record<string, string> = {
        'biznesowy': 'Biznesowy',
        'produktowy': 'Produktowy',
        'motywacyjny': 'Motywacyjny',
        'szkoleniowy': 'Szkoleniowy',
        'wewnetrzny': 'Wewnętrzny',
        'zewnetrzny': 'Zewnętrzny',
        'onboarding': 'Onboarding',
      };
      badges.push(<Badge key="type" variant="outline">{labels[type] || type}</Badge>);
    }
    
    return badges.length > 0 ? <>{badges}</> : null;
  };

  // Copy invitation text to clipboard
  const handleCopyInvitation = () => {
    const eventTz = event.timezone || DEFAULT_EVENT_TIMEZONE;
    const inviteUrl = `${window.location.origin}/events/register/${event.id}${user ? `?invited_by=${user.id}` : ''}`;
    const invitationText = `
🎥 Zaproszenie na webinar: ${event.title}

📅 Data: ${formatInTimeZone(startDate, eventTz, 'PPP', { locale: dateLocale })}
⏰ Godzina: ${formatInTimeZone(startDate, eventTz, 'HH:mm')} - ${formatInTimeZone(endDate, eventTz, 'HH:mm')} (${getTimezoneAbbr(eventTz)})
${event.host_name ? `👤 Prowadzący: ${event.host_name}` : ''}

Zapisz się tutaj: ${inviteUrl}
    `.trim();
    
    navigator.clipboard.writeText(invitationText);
    toast({ 
      title: 'Skopiowano!', 
      description: 'Zaproszenie zostało skopiowane do schowka' 
    });
  };

  // Copy guest registration link
  const handleCopyGuestLink = () => {
    const inviteUrl = `${window.location.origin}/events/register/${event.id}${user ? `?invited_by=${user.id}` : ''}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({ 
      title: 'Skopiowano!', 
      description: 'Link do formularza rejestracji został skopiowany' 
    });
  };

  const renderButtons = () => {
    const buttons: React.ReactNode[] = [];

    // Dynamic buttons from event data
    if (event.buttons && event.buttons.length > 0) {
      event.buttons.forEach((btn: EventButton, index: number) => {
        const variant = btn.style === 'primary' ? 'default' : btn.style === 'secondary' ? 'secondary' : 'outline';
        buttons.push(
          <Button
            key={`btn-${index}`}
            variant={variant}
            size="sm"
            onClick={() => window.open(btn.url, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {btn.label}
          </Button>
        );
      });
    }

    // Internal meeting button
    const useInternalMeeting = event.use_internal_meeting === true;
    const meetingRoomId = event.meeting_room_id;

    if (useInternalMeeting && meetingRoomId && (isLive || canJoinSoon)) {
      buttons.push(
        <Button
          key="internal-meeting"
          variant="default"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => window.open(`/meeting-room/${meetingRoomId}`, '_blank')}
        >
          <Video className="h-4 w-4 mr-2" />
          Dołącz do spotkania
        </Button>
      );
    }

    // Zoom link button (show when event is live or can join soon, and NOT internal meeting)
    if (!useInternalMeeting && event.zoom_link && (isLive || canJoinSoon)) {
      buttons.push(
        <Button
          key="zoom"
          variant="default"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => window.open(event.zoom_link!, '_blank')}
        >
          <Video className="h-4 w-4 mr-2" />
          Dołącz do Zoom
        </Button>
      );
    }

    // Guest link
    if (event.guest_link) {
      buttons.push(
        <Button
          key="guest"
          variant="outline"
          size="sm"
          onClick={() => window.open(event.guest_link!, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Link dla gościa
        </Button>
      );
    }

    // Registration button for logged-in users
    if (showRegistration && event.requires_registration && isUpcoming && !isPastEvent) {
      const isFull = event.max_participants && (event.registration_count || 0) >= event.max_participants;
      
      buttons.push(
        <Button
          key="register"
          variant={isRegistered ? 'secondary' : 'default'}
          size="sm"
          onClick={handleRegister}
          disabled={registering || (isFull && !isRegistered)}
        >
          {registering ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : isRegistered ? (
            <X className="h-4 w-4 mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          {isRegistered ? 'Wypisz się' : isFull ? 'Brak miejsc' : 'Zapisz się'}
        </Button>
      );
    }

    // Invite guest button - only if admin enabled allow_invites for this event
    if (isUpcoming && !isPastEvent && (event as any).allow_invites === true) {
      buttons.push(
        <Button
          key="invite-guest"
          variant="outline"
          size="sm"
          onClick={handleCopyInvitation}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Zaproś Gościa
        </Button>
      );
    }

    return buttons;
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Event image - full size, not cropped */}
      {event.image_url && (
        <div className="relative w-full bg-muted/30">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-auto object-contain max-h-[300px]"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            {getStatusBadge()}
            {getTypeBadge()}
          </div>
          {isRegistered && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                Zapisany
              </Badge>
            </div>
          )}
        </div>
      )}

      <CardHeader className={event.image_url ? 'pt-4' : ''}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
          {!event.image_url && (
            <div className="flex gap-1 flex-shrink-0">
              {getStatusBadge()}
              {getTypeBadge()}
            </div>
          )}
        </div>
        {event.description && (
          <CardDescription 
            className="line-clamp-3"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Date & Time with timezone */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatInTimeZone(startDate, event.timezone || DEFAULT_EVENT_TIMEZONE, 'PPP', { locale: dateLocale })}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {formatInTimeZone(startDate, event.timezone || DEFAULT_EVENT_TIMEZONE, 'HH:mm')} - {formatInTimeZone(endDate, event.timezone || DEFAULT_EVENT_TIMEZONE, 'HH:mm')}
            {durationMinutes && <span className="ml-1">({durationMinutes} min)</span>}
            <span className="ml-1 text-xs">({getTimezoneAbbr(event.timezone || DEFAULT_EVENT_TIMEZONE)})</span>
          </span>
        </div>

        {/* Host */}
        {event.host_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{event.host_name}</span>
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{event.location}</span>
          </div>
        )}

        {/* Participants count */}
        {event.max_participants && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {event.registration_count || 0} / {event.max_participants} uczestników
            </span>
          </div>
        )}
      </CardContent>

      {renderButtons().length > 0 && (
        <CardFooter className="flex flex-wrap gap-2 pt-0">
          {renderButtons()}
        </CardFooter>
      )}
    </Card>
  );
};

export default EventCard;
