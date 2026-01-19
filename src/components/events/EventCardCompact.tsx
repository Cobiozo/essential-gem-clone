import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isFuture, differenceInMinutes } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
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
  ChevronDown
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { EventWithRegistration, EventButton } from '@/types/events';
import { isMultiOccurrenceEvent, getFutureOccurrences } from '@/hooks/useOccurrences';

interface EventCardCompactProps {
  event: EventWithRegistration;
  onRegister?: () => void;
  showRegistration?: boolean;
  defaultOpen?: boolean;
}

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
        // Build cancel query with occurrence_index
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
        
        try {
          await supabase.functions.invoke('sync-google-calendar', {
            body: { user_id: user.id, event_id: event.id, action: 'delete', occurrence_index: occurrenceIndex }
          });
        } catch (syncErr) {
          console.error('[EventCardCompact] Google Calendar sync (delete) failed:', syncErr);
        }
      } else {
        // Check for existing registration with occurrence_index
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
              occurrence_index: occurrenceIndex ?? null,
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
            body: { user_id: user.id, event_id: event.id, action: 'create', occurrence_index: occurrenceIndex }
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
    const inviteUrl = `${window.location.origin}/events/register/${event.id}${user ? `?invited_by=${user.id}` : ''}`;
    const invitationText = `
🎥 Zaproszenie na spotkanie: ${event.title}

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

  const getTypeBadges = () => {
    const badges: React.ReactNode[] = [];
    
    if (isMultiOccurrenceEvent(event)) {
      const futureCount = getFutureOccurrences(event).length;
      badges.push(
        <Badge key="multi" variant="outline" className="text-xs flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          Cykliczne
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

    if (isUpcoming && !isPastEvent && ['webinar', 'team_training'].includes(event.event_type)) {
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

  return (
    <div 
      ref={cardRef}
      className={`border rounded-lg bg-card transition-all ${isLive ? 'ring-2 ring-red-500' : ''} ${defaultOpen ? 'ring-2 ring-primary/50' : ''}`}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors rounded-lg">
          {/* Thumbnail */}
          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="h-6 w-6 text-muted-foreground" />
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
              <span>{format(startDate, 'd MMM', { locale: dateLocale })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{format(startDate, 'HH:mm')}</span>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isRegistered && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Check className="h-3 w-3 mr-1" />
                Zapisany
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
                <span>{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}</span>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div 
                className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
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
