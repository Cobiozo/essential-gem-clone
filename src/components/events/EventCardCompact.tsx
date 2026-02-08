import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isFuture, differenceInMinutes, type Locale } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { pl, enUS } from 'date-fns/locale';
import { getTimezoneAbbr, DEFAULT_EVENT_TIMEZONE, getUserTimezone } from '@/utils/timezoneHelpers';
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
  UserPlus,
  CalendarDays,
  ChevronDown,
  Globe
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { EventWithRegistration, EventButton } from '@/types/events';
import type { ExpandedOccurrence } from '@/types/occurrences';
import { isMultiOccurrenceEvent, getAllOccurrences, getNextActiveOccurrence } from '@/hooks/useOccurrences';

interface EventCardCompactProps {
  event: EventWithRegistration;
  onRegister?: () => void;
  showRegistration?: boolean;
  defaultOpen?: boolean;
}

// Past occurrence row component (read-only, visual indication)
const PastOccurrenceRow: React.FC<{
  occurrence: ExpandedOccurrence;
  wasRegistered: boolean;
  dateLocale: Locale;
  eventTimezone: string;
}> = ({ occurrence, wasRegistered, dateLocale, eventTimezone }) => {
  const tz = eventTimezone || DEFAULT_EVENT_TIMEZONE;
  const dayName = formatInTimeZone(occurrence.start_datetime, tz, 'EEEE', { locale: dateLocale });

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg opacity-60">
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm line-through text-muted-foreground">
          {formatInTimeZone(occurrence.start_datetime, tz, 'd MMM', { locale: dateLocale })}
          <span className="ml-1 capitalize">({dayName})</span>
        </span>
        <span className="text-sm font-medium line-through text-muted-foreground">
          {formatInTimeZone(occurrence.start_datetime, tz, 'HH:mm')} ({getTimezoneAbbr(tz)})
        </span>
        <Badge variant="secondary" className="text-xs">
          Zakończony
        </Badge>
      </div>
      
      {/* Show if user was registered */}
      {wasRegistered && (
        <Badge variant="outline" className="text-xs">
          <Check className="h-3 w-3 mr-1" />
          Uczestniczył
        </Badge>
      )}
    </div>
  );
};

// Component for individual occurrence row (future occurrences)
const OccurrenceRow: React.FC<{
  event: EventWithRegistration;
  occurrence: ExpandedOccurrence;
  isRegistered: boolean;
  onRegisterChange: (occurrenceIndex: number, register: boolean) => Promise<void>;
  dateLocale: Locale;
  eventTimezone: string;
}> = ({ event, occurrence, isRegistered, onRegisterChange, dateLocale, eventTimezone }) => {
  const [loading, setLoading] = useState(false);
  const tz = eventTimezone || DEFAULT_EVENT_TIMEZONE;

  const handleClick = async () => {
    setLoading(true);
    try {
      await onRegisterChange(occurrence.index, !isRegistered);
    } finally {
      setLoading(false);
    }
  };

  const dayName = formatInTimeZone(occurrence.start_datetime, tz, 'EEEE', { locale: dateLocale });

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {formatInTimeZone(occurrence.start_datetime, tz, 'd MMM', { locale: dateLocale })}
          <span className="text-muted-foreground ml-1 capitalize">({dayName})</span>
        </span>
        <span className="text-sm font-medium">
          {formatInTimeZone(occurrence.start_datetime, tz, 'HH:mm')} ({getTimezoneAbbr(tz)})
        </span>
      </div>
      
      <Button
        size="sm"
        variant={isRegistered ? 'secondary' : 'default'}
        onClick={handleClick}
        disabled={loading}
        className="min-w-[100px]"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isRegistered ? (
          <>
            <X className="h-3 w-3 mr-1" />
            Wypisz się
          </>
        ) : (
          <>
            <Check className="h-3 w-3 mr-1" />
            Zapisz się
          </>
        )}
      </Button>
    </div>
  );
};

export const EventCardCompact: React.FC<EventCardCompactProps> = ({ 
  event, 
  onRegister,
  showRegistration = true,
  defaultOpen = false
}) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const dateLocale = language === 'pl' ? pl : enUS;
  
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(event.is_registered || false);
  const [registeredOccurrences, setRegisteredOccurrences] = useState<Set<number | null>>(
    event.registered_occurrences || new Set()
  );
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the card if it's opened by default (e.g., from URL param)
  useEffect(() => {
    if (defaultOpen && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [defaultOpen]);

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const now = new Date();
  
  const isLive = now >= startDate && now <= endDate;
  const isUpcoming = isFuture(startDate);
  const isPastEvent = isPast(endDate);
  const minutesUntilStart = differenceInMinutes(startDate, now);
  const canJoinSoon = minutesUntilStart <= 15 && minutesUntilStart > 0;
  const durationMinutes = event.duration_minutes || differenceInMinutes(endDate, startDate);

  // Check if this is a multi-occurrence event
  const isMultiOccurrence = isMultiOccurrenceEvent(event);
  const allOccurrences = isMultiOccurrence ? getAllOccurrences(event) : [];
  const futureOccurrences = allOccurrences.filter(occ => !occ.is_past);
  
  // For header: show next occurrence date (or start_time for single events)
  const nextOccurrence = isMultiOccurrence ? getNextActiveOccurrence(event) : null;
  const displayDate = nextOccurrence ? nextOccurrence.start_datetime : startDate;
  
  // Timezone comparison
  const eventTimezone = event.timezone || DEFAULT_EVENT_TIMEZONE;
  const userTimezone = getUserTimezone();
  const timezonesAreDifferent = userTimezone !== eventTimezone;
  
  // Check if this is an external platform event
  const isExternalPlatform = (event as any).is_external_platform === true;
  const externalPlatformMessage = (event as any).external_platform_message || 
    'Ten webinar odbywa się na zewnętrznej platformie. Zapisz się tutaj, aby otrzymać przypomnienie w kalendarzu, a następnie użyj przycisku poniżej, aby zarejestrować się na platformie docelowej.';

  // Handle occurrence-specific registration
  const handleOccurrenceRegister = async (occurrenceIndex: number, shouldRegister: boolean) => {
    if (!user) {
      toast({
        title: t('toast.error'),
        description: t('events.loginRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      if (shouldRegister) {
        // Check for existing registration
        const { data: existingReg } = await supabase
          .from('event_registrations')
          .select('id, status')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .eq('occurrence_index', occurrenceIndex)
          .maybeSingle();

        if (existingReg) {
          const { error } = await supabase
            .from('event_registrations')
            .update({ 
              status: 'registered',
              cancelled_at: null,
              registered_at: new Date().toISOString()
            })
            .eq('id', existingReg.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('event_registrations')
            .insert({
              event_id: event.id,
              user_id: user.id,
              status: 'registered',
              occurrence_index: occurrenceIndex,
            });
          if (error) throw error;
        }

        setRegisteredOccurrences(prev => new Set([...prev, occurrenceIndex]));
        toast({
          title: t('toast.success'),
          description: t('events.registrationSuccess'),
        });

        // Sync with Google Calendar
        try {
          await supabase.functions.invoke('sync-google-calendar', {
            body: { user_id: user.id, event_id: event.id, action: 'create', occurrence_index: occurrenceIndex }
          });
        } catch (syncErr) {
          console.error('[EventCardCompact] Google Calendar sync (create) failed:', syncErr);
        }
      } else {
        // Cancel registration
        const { error } = await supabase
          .from('event_registrations')
          .update({ 
            status: 'cancelled', 
            cancelled_at: new Date().toISOString() 
          })
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .eq('occurrence_index', occurrenceIndex);

        if (error) throw error;

        setRegisteredOccurrences(prev => {
          const newSet = new Set(prev);
          newSet.delete(occurrenceIndex);
          return newSet;
        });
        toast({
          title: t('toast.success'),
          description: t('events.registrationCancelled'),
        });

        // Sync with Google Calendar
        try {
          await supabase.functions.invoke('sync-google-calendar', {
            body: { user_id: user.id, event_id: event.id, action: 'delete', occurrence_index: occurrenceIndex }
          });
        } catch (syncErr) {
          console.error('[EventCardCompact] Google Calendar sync (delete) failed:', syncErr);
        }
      }
      onRegister?.();
    } catch (error: any) {
      console.error('Occurrence registration error:', error);
      toast({
        title: t('toast.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

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
        // Cancel registration
        const { error } = await supabase
          .from('event_registrations')
          .update({ 
            status: 'cancelled', 
            cancelled_at: new Date().toISOString() 
          })
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .is('occurrence_index', null);
        
        if (error) throw error;
        setIsRegistered(false);
        toast({
          title: t('toast.success'),
          description: t('events.registrationCancelled'),
        });
        
        try {
          await supabase.functions.invoke('sync-google-calendar', {
            body: { user_id: user.id, event_id: event.id, action: 'delete' }
          });
        } catch (syncErr) {
          console.error('[EventCardCompact] Google Calendar sync (delete) failed:', syncErr);
        }
      } else {
        // Check for existing registration
        const { data: existingReg } = await supabase
          .from('event_registrations')
          .select('id, status')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .is('occurrence_index', null)
          .maybeSingle();

        if (existingReg) {
          const { error } = await supabase
            .from('event_registrations')
            .update({ 
              status: 'registered',
              cancelled_at: null,
              registered_at: new Date().toISOString()
            })
            .eq('id', existingReg.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('event_registrations')
            .insert({
              event_id: event.id,
              user_id: user.id,
              status: 'registered',
              occurrence_index: null,
            });

          if (error) throw error;
        }
        
        setIsRegistered(true);
        toast({
          title: t('toast.success'),
          description: t('events.registrationSuccess'),
        });
        
        try {
          await supabase.functions.invoke('sync-google-calendar', {
            body: { user_id: user.id, event_id: event.id, action: 'create' }
          });
        } catch (syncErr) {
          console.error('[EventCardCompact] Google Calendar sync (create) failed:', syncErr);
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

  const handleCopyInvitation = () => {
    const eventTz = event.timezone || DEFAULT_EVENT_TIMEZONE;
    const inviteUrl = `${window.location.origin}/events/register/${event.id}${user ? `?invited_by=${user.id}` : ''}`;
    const invitationText = `
🎥 Zaproszenie na spotkanie: ${event.title}

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

  const getTypeBadges = () => {
    const badges: React.ReactNode[] = [];
    
    if (isMultiOccurrence) {
      const registeredCount = registeredOccurrences.size;
      badges.push(
        <Badge key="multi" variant="outline" className="text-xs flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          Cykliczne ({registeredCount}/{futureOccurrences.length} zapisanych)
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
      badges.push(<Badge key="type" variant="outline" className="text-xs">{labels[type] || type}</Badge>);
    }
    
    return badges;
  };

  const renderButtons = () => {
    const buttons: React.ReactNode[] = [];

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

    if (event.zoom_link && (isLive || canJoinSoon)) {
      buttons.push(
        <Button
          key="zoom"
          variant="default"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => window.open(event.zoom_link!, '_blank')}
        >
          <Video className="h-4 w-4 mr-2" />
          Dołącz
        </Button>
      );
    }

    // Only show single register button for non-multi-occurrence events
    if (showRegistration && event.requires_registration && isUpcoming && !isPastEvent && !isMultiOccurrence) {
      const isFull = event.max_participants && (event.registration_count || 0) >= event.max_participants;
      
      // Change button text for external platform events
      const registerButtonText = isExternalPlatform 
        ? (isRegistered ? 'Wypisz się' : isFull ? 'Brak miejsc' : '📅 Dodaj do kalendarza')
        : (isRegistered ? 'Wypisz się' : isFull ? 'Brak miejsc' : 'Zapisz się');
      
      buttons.push(
        <Button
          key="register"
          variant={isRegistered ? 'secondary' : isExternalPlatform ? 'outline' : 'default'}
          size="sm"
          onClick={handleRegister}
          disabled={registering || (isFull && !isRegistered)}
        >
          {registering ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : isRegistered ? (
            <X className="h-4 w-4 mr-2" />
          ) : isExternalPlatform ? (
            <Calendar className="h-4 w-4 mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          {registerButtonText}
        </Button>
      );
    }

    // Only show invite button if admin enabled allow_invites for this event
    if (isUpcoming && !isPastEvent && (event as any).allow_invites === true) {
      buttons.push(
        <Button
          key="invite-guest"
          variant="outline"
          size="sm"
          onClick={handleCopyInvitation}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Zaproś
        </Button>
      );
    }

    return buttons;
  };

  // Count registered occurrences ONLY for future dates (not past)
  const futureOccurrenceIndices = new Set(futureOccurrences.map(occ => occ.index));
  
  const futureRegisteredCount = isMultiOccurrence 
    ? [...registeredOccurrences].filter(
        occIndex => occIndex !== null && futureOccurrenceIndices.has(occIndex)
      ).length
    : 0;

  // For header badge - only show if registered for FUTURE occurrences
  const hasAnyRegistration = isMultiOccurrence 
    ? futureRegisteredCount > 0 
    : isRegistered;

  return (
    <div 
      ref={cardRef}
      className={`border rounded-lg bg-card transition-all ${isLive ? 'ring-2 ring-red-500' : ''} ${defaultOpen ? 'ring-2 ring-primary/50' : ''}`}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors rounded-lg">
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Title and host */}
          <div className="flex-1 text-left min-w-0">
            <h3 className="font-semibold truncate text-sm">{event.title}</h3>
            {event.host_name && (
              <span className="text-xs text-muted-foreground truncate block">{event.host_name}</span>
            )}
          </div>

          {/* Date/Time - hidden on mobile */}
          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground flex-shrink-0">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(displayDate, 'd MMM', { locale: dateLocale })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatInTimeZone(displayDate, eventTimezone, 'HH:mm')} ({getTimezoneAbbr(eventTimezone)})</span>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasAnyRegistration && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Check className="h-3 w-3 mr-1" />
                {isMultiOccurrence ? `${futureRegisteredCount} zapisanych` : 'Zapisany'}
              </Badge>
            )}
            {isLive && (
              <Badge className="bg-red-500 animate-pulse text-xs">NA ŻYWO</Badge>
            )}
            {canJoinSoon && !isLive && (
              <Badge className="bg-orange-500 text-xs">Za {minutesUntilStart} min</Badge>
            )}
          </div>

          {/* Chevron */}
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4 border-t">
          <div className="pt-4 space-y-4">
            {/* Mobile date/time */}
            <div className="md:hidden flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(startDate, 'PPP', { locale: dateLocale })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatInTimeZone(startDate, event.timezone || DEFAULT_EVENT_TIMEZONE, 'HH:mm')} - {formatInTimeZone(endDate, event.timezone || DEFAULT_EVENT_TIMEZONE, 'HH:mm')} ({getTimezoneAbbr(event.timezone || DEFAULT_EVENT_TIMEZONE)})</span>
              </div>
            </div>

            {/* External platform banner */}
            {isExternalPlatform && isUpcoming && (
              <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <Globe className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                  {externalPlatformMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Description */}
            {event.description && (
              <div 
                className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            )}

            {/* Timezone comparison - when user is in different timezone */}
            {timezonesAreDifferent && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-medium">Twój czas:</span>
                  <span>
                    {formatInTimeZone(displayDate, userTimezone, 'HH:mm')} ({userTimezone.split('/')[1]?.replace(/_/g, ' ') || userTimezone})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>Czas wydarzenia:</span>
                  <span>
                    {formatInTimeZone(displayDate, eventTimezone, 'HH:mm')} ({eventTimezone.split('/')[1]?.replace(/_/g, ' ') || eventTimezone})
                  </span>
                </div>
              </div>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {event.host_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{event.host_name}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.max_participants && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{event.registration_count || 0}/{event.max_participants} uczestników</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{durationMinutes} min</span>
              </div>
            </div>

            {/* Type badges */}
            {getTypeBadges().length > 0 && (
              <div className="flex flex-wrap gap-2">
                {getTypeBadges()}
              </div>
            )}

            {/* Cyclic occurrences list - ALL occurrences with past marked */}
            {isMultiOccurrence && showRegistration && allOccurrences.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Terminy spotkania ({allOccurrences.length})
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {futureRegisteredCount} / {futureOccurrences.length} zapisanych
                  </Badge>
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allOccurrences.map((occurrence) => (
                    occurrence.is_past ? (
                      <PastOccurrenceRow
                        key={occurrence.index}
                        occurrence={occurrence}
                        wasRegistered={registeredOccurrences.has(occurrence.index)}
                        dateLocale={dateLocale}
                        eventTimezone={event.timezone || DEFAULT_EVENT_TIMEZONE}
                      />
                    ) : (
                      <OccurrenceRow
                        key={occurrence.index}
                        event={event}
                        occurrence={occurrence}
                        isRegistered={registeredOccurrences.has(occurrence.index)}
                        onRegisterChange={handleOccurrenceRegister}
                        dateLocale={dateLocale}
                        eventTimezone={event.timezone || DEFAULT_EVENT_TIMEZONE}
                      />
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {renderButtons().length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {renderButtons()}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default EventCardCompact;
