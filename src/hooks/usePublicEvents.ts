import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EventWithRegistration, EventButton, EventType } from '@/types/events';

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
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .eq('is_published', true)
        .eq('event_type', eventType)
        .or(`end_time.gte.${now},occurrences.not.is.null`)
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
            .select('event_id')
            .eq('user_id', user.id)
            .eq('status', 'registered')
            .in('event_id', eventIds);

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
          }));

          setEvents(eventsWithRegistration);
        } else {
          setEvents([]);
        }
      } else {
        setEvents(filteredEvents);
      }
    } catch (error) {
      console.error('Error fetching public events:', error);
    } finally {
      setLoading(false);
    }
  }, [user, userRole, eventType]);

  // Split events into upcoming and past
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.end_time) >= now);
  const pastEvents = events.filter(e => new Date(e.end_time) < now);

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
