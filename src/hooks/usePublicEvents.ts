import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EventWithRegistration, EventButton, EventType } from '@/types/events';
import { isMultiOccurrenceEvent, getFutureOccurrences } from '@/hooks/useOccurrences';

type PublicEventType = 'webinar' | 'team_training';

export const usePublicEvents = (eventType: PublicEventType) => {
  const [events, setEvents] = useState<EventWithRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query - include multi-occurrence events even if first end_time passed
      const now = new Date().toISOString();
      // Include events that ended up to 3h ago (for overtime detection)
      const recentCutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .eq('is_published', true)
        .eq('event_type', eventType)
        .or(`end_time.gte.${recentCutoff},occurrences.not.is.null`)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Parse buttons from JSONB
      const parsedEvents = (data || []).map(event => ({
        ...event,
        buttons: (Array.isArray(event.buttons) ? event.buttons : []) as unknown as EventButton[],
        event_type: event.event_type as EventType,
      }));

      // Filter by visibility based on user role
      const filteredEvents = parsedEvents.filter(event => {
        // Everyone can see
        if (event.visible_to_everyone) return true;
        
        // Not logged in - can only see visible_to_everyone
        if (!user || !userRole) return false;
        
        const role = userRole.role;
        
        // Admin sees all
        if (role === 'admin') return true;
        
        // Check role-specific visibility
        if (role === 'partner' && event.visible_to_partners) return true;
        if (role === 'specjalista' && event.visible_to_specjalista) return true;
        if ((role === 'client' || role === 'user') && event.visible_to_clients) return true;
        
        return false;
      });

      // If user is logged in, check their registrations
      if (user) {
        const eventIds = filteredEvents.map(e => e.id);
        
        if (eventIds.length > 0) {
          const { data: registrations } = await supabase
            .from('event_registrations')
            .select('event_id, occurrence_index')
            .eq('user_id', user.id)
            .eq('status', 'registered')
            .in('event_id', eventIds);

          // Create map: event_id -> Set<occurrence_index>
          const registrationsByEvent = new Map<string, Set<number | null>>();
          registrations?.forEach(r => {
            if (!registrationsByEvent.has(r.event_id)) {
              registrationsByEvent.set(r.event_id, new Set());
            }
            registrationsByEvent.get(r.event_id)!.add(r.occurrence_index);
          });
          
          const registeredEventIds = new Set(registrations?.map(r => r.event_id) || []);
          
          // Get registration counts for events
          const { data: counts } = await supabase
            .from('event_registrations')
            .select('event_id')
            .eq('status', 'registered')
            .in('event_id', eventIds);

          const countMap = new Map<string, number>();
          counts?.forEach(c => {
            countMap.set(c.event_id, (countMap.get(c.event_id) || 0) + 1);
          });
          
          const eventsWithRegistration = filteredEvents.map(event => ({
            ...event,
            is_registered: registeredEventIds.has(event.id),
            registration_count: countMap.get(event.id) || 0,
            registered_occurrences: registrationsByEvent.get(event.id) || new Set<number | null>(),
          }));

          setEvents(eventsWithRegistration);
        } else {
          setEvents([]);
        }
      } else {
        setEvents(filteredEvents.map(e => ({
          ...e,
          registered_occurrences: new Set<number | null>(),
        })));
      }
    } catch (error) {
      console.error('Error fetching public events:', error);
    } finally {
      setLoading(false);
    }
  }, [user, userRole, eventType]);

  // Split events into upcoming and past - for multi-occurrence, check if ANY occurrence is future
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date();
    
    const hasUpcomingSchedule = (event: EventWithRegistration): boolean => {
      // For multi-occurrence events - check if there are any future occurrences
      if (isMultiOccurrenceEvent(event)) {
        return getFutureOccurrences(event).length > 0;
      }
      // For regular events - check end_time
      return new Date(event.end_time) >= now;
    };
    
    return {
      upcomingEvents: events.filter(hasUpcomingSchedule),
      pastEvents: events.filter(e => !hasUpcomingSchedule(e)),
    };
  }, [events]);

  useEffect(() => {
    fetchEvents();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`public-events-${eventType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `event_type=eq.${eventType}`,
        },
        () => fetchEvents()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_registrations',
        },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents, eventType]);

  return {
    events,
    upcomingEvents,
    pastEvents,
    loading,
    refetch: fetchEvents,
  };
};
