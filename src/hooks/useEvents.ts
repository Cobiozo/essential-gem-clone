import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isMultiOccurrenceEvent, getAllOccurrences } from '@/hooks/useOccurrences';
import type { 
  Event, 
  EventRegistration, 
  EventWithRegistration, 
  EventFormData,
  EventButton,
  EventType
} from '@/types/events';

// All valid event types
const ALL_EVENT_TYPES: EventType[] = [
  'webinar', 
  'meeting_public', 
  'meeting_private', 
  'team_training',
  'tripartite_meeting',
  'partner_consultation'
];

export const useEvents = () => {
  const [events, setEvents] = useState<EventWithRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();
      // Fetch events where:
      // - end_time >= now (future single events) OR
      // - occurrences is not null (multi-occurrence events - filtered client-side)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .or(`end_time.gte.${now},occurrences.not.is.null`)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Parse buttons from JSONB
      const parsedEvents = (data || []).map(event => ({
        ...event,
        buttons: (Array.isArray(event.buttons) ? event.buttons : []) as unknown as EventButton[],
        event_type: event.event_type as EventType,
      }));

      // If user is logged in, check their registrations and fetch host/participant profiles
      if (user) {
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('event_id, occurrence_index')
          .eq('user_id', user.id)
          .eq('status', 'registered');

        // Create a Set for simple event_id check AND a Map for occurrence-specific check
        const registeredEventIds = new Set(registrations?.map(r => r.event_id) || []);
        // Map: "event_id:occurrence_index" -> true (for per-occurrence registration tracking)
        const registrationMap = new Map<string, boolean>(
          (registrations || []).map(r => [
            `${r.event_id}:${r.occurrence_index ?? 'null'}`,
            true
          ])
        );
        // Store in global for expandEventsForCalendar to use
        (window as any).__eventRegistrationMap = registrationMap;
        
        // Get individual meeting event IDs for profile fetching
        const individualMeetingIds = parsedEvents
          .filter(e => ['tripartite_meeting', 'partner_consultation'].includes(e.event_type))
          .map(e => e.id);
        
        // Fetch host profiles for individual meetings
        const hostUserIds = parsedEvents
          .filter(e => ['tripartite_meeting', 'partner_consultation'].includes(e.event_type) && e.host_user_id)
          .map(e => e.host_user_id);
        
        const { data: hostProfiles } = hostUserIds.length > 0 
          ? await supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .in('id', hostUserIds)
          : { data: [] as { id: string; first_name: string | null; last_name: string | null }[] };
        
        const hostProfileMap = new Map<string, { first_name: string | null; last_name: string | null }>(
          (hostProfiles || []).map(p => [p.id, { first_name: p.first_name, last_name: p.last_name }])
        );
        
        // Fetch participant profiles (from event_registrations) for meetings where user is host
        const userHostedMeetingIds = parsedEvents
          .filter(e => ['tripartite_meeting', 'partner_consultation'].includes(e.event_type) && e.host_user_id === user.id)
          .map(e => e.id);
        
        let participantProfileMap = new Map<string, { first_name: string | null; last_name: string | null; email: string }>();
        
        if (userHostedMeetingIds.length > 0) {
          const { data: participantRegs } = await supabase
            .from('event_registrations')
            .select('event_id, user_id')
            .in('event_id', userHostedMeetingIds)
            .eq('status', 'registered');
          
          const participantUserIds = participantRegs?.map(r => r.user_id) || [];
          
          if (participantUserIds.length > 0) {
            const { data: participantProfiles } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, email')
              .in('id', participantUserIds);
            
            // Map event_id to participant profile
            participantRegs?.forEach(reg => {
              const profile = participantProfiles?.find(p => p.id === reg.user_id);
              if (profile) {
                participantProfileMap.set(reg.event_id, {
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  email: profile.email || '',
                });
              }
            });
          }
        }
        
        const eventsWithRegistration = parsedEvents.map(event => ({
          ...event,
          is_registered: registeredEventIds.has(event.id),
          host_profile: hostProfileMap.get(event.host_user_id) || null,
          participant_profile: participantProfileMap.get(event.id) || null,
        }));

        // Filter individual meetings - only show to host or registered participant
        const filteredEvents = eventsWithRegistration.filter(event => {
          // For webinars, team trainings, public meetings - show to everyone
          if (!['tripartite_meeting', 'partner_consultation'].includes(event.event_type)) {
            return true;
          }
          
          // For individual meetings - only show if user is host OR registered
          return event.host_user_id === user.id || event.is_registered;
        });

        setEvents(filteredEvents);
      } else {
        setEvents(parsedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać wydarzeń',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const fetchAllEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) throw error;

      const parsedEvents = (data || []).map(event => ({
        ...event,
        buttons: (Array.isArray(event.buttons) ? event.buttons : []) as unknown as EventButton[],
        event_type: event.event_type as EventType,
      }));

      setEvents(parsedEvents);
    } catch (error) {
      console.error('Error fetching all events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createEvent = async (eventData: EventFormData): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          title: eventData.title,
          description: eventData.description,
          event_type: eventData.event_type,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          zoom_link: eventData.zoom_link,
          location: eventData.location,
          visible_to_everyone: eventData.visible_to_everyone,
          visible_to_partners: eventData.visible_to_partners,
          visible_to_specjalista: eventData.visible_to_specjalista,
          visible_to_clients: eventData.visible_to_clients,
          image_url: eventData.image_url,
          buttons: JSON.parse(JSON.stringify(eventData.buttons)),
          max_participants: eventData.max_participants,
          requires_registration: eventData.requires_registration,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Wydarzenie zostało utworzone',
      });
      
      await fetchAllEvents();
      return true;
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się utworzyć wydarzenia',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateEvent = async (id: string, eventData: Partial<EventFormData>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (eventData.title !== undefined) updateData.title = eventData.title;
      if (eventData.description !== undefined) updateData.description = eventData.description;
      if (eventData.event_type !== undefined) updateData.event_type = eventData.event_type;
      if (eventData.start_time !== undefined) updateData.start_time = eventData.start_time;
      if (eventData.end_time !== undefined) updateData.end_time = eventData.end_time;
      if (eventData.zoom_link !== undefined) updateData.zoom_link = eventData.zoom_link;
      if (eventData.location !== undefined) updateData.location = eventData.location;
      if (eventData.visible_to_everyone !== undefined) updateData.visible_to_everyone = eventData.visible_to_everyone;
      if (eventData.visible_to_partners !== undefined) updateData.visible_to_partners = eventData.visible_to_partners;
      if (eventData.visible_to_specjalista !== undefined) updateData.visible_to_specjalista = eventData.visible_to_specjalista;
      if (eventData.visible_to_clients !== undefined) updateData.visible_to_clients = eventData.visible_to_clients;
      if (eventData.image_url !== undefined) updateData.image_url = eventData.image_url;
      if (eventData.buttons !== undefined) updateData.buttons = JSON.parse(JSON.stringify(eventData.buttons));
      if (eventData.max_participants !== undefined) updateData.max_participants = eventData.max_participants;
      if (eventData.requires_registration !== undefined) updateData.requires_registration = eventData.requires_registration;

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Wydarzenie zostało zaktualizowane',
      });
      
      await fetchAllEvents();
      return true;
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować wydarzenia',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteEvent = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Wydarzenie zostało usunięte',
      });
      
      await fetchAllEvents();
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć wydarzenia',
        variant: 'destructive',
      });
      return false;
    }
  };

  const registerForEvent = async (eventId: string, occurrenceIndex?: number): Promise<boolean> => {
    if (!user) return false;

    try {
      // Build query to check for existing registration
      // For multi-occurrence events, check specific occurrence_index
      // For single events, check where occurrence_index is null
      let query = supabase
        .from('event_registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', user.id);
      
      if (occurrenceIndex !== undefined) {
        query = query.eq('occurrence_index', occurrenceIndex);
      } else {
        query = query.is('occurrence_index', null);
      }
      
      const { data: existingReg } = await query.maybeSingle();

      if (existingReg) {
        // Update existing registration to 'registered'
        const { error } = await supabase
          .from('event_registrations')
          .update({ 
            status: 'registered',
            cancelled_at: null,
            registered_at: new Date().toISOString()
          })
          .eq('id', existingReg.id);

        if (error) throw error;
        console.log('[useEvents] Re-activated existing registration for occurrence:', occurrenceIndex);
      } else {
        // Insert new registration with occurrence_index
        const { error } = await supabase
          .from('event_registrations')
          .insert({
            event_id: eventId,
            user_id: user.id,
            status: 'registered',
            occurrence_index: occurrenceIndex ?? null,
          });

        if (error) throw error;
        console.log('[useEvents] Created new registration for occurrence:', occurrenceIndex);
      }

      toast({
        title: 'Sukces',
        description: 'Zapisano na wydarzenie',
      });
      
      // Emit custom event for immediate widget updates
      window.dispatchEvent(new CustomEvent('eventRegistrationChange', { 
        detail: { eventId, occurrenceIndex, action: 'register' } 
      }));
      
      // Sync to Google Calendar in background (fire and forget)
      supabase.functions.invoke('sync-google-calendar', {
        body: { user_id: user.id, event_id: eventId, action: 'create', occurrence_index: occurrenceIndex }
      }).then(res => {
        if (res.data?.success) {
          console.log('[useEvents] Event synced to Google Calendar');
        }
      }).catch(err => {
        console.warn('[useEvents] Google Calendar sync failed:', err);
      });
      
      await fetchEvents();
      return true;
    } catch (error) {
      console.error('Error registering for event:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać na wydarzenie',
        variant: 'destructive',
      });
      return false;
    }
  };

  const cancelRegistration = async (eventId: string, occurrenceIndex?: number): Promise<boolean> => {
    if (!user) return false;

    console.log('[useEvents] ========== Cancel Registration ==========');
    console.log('[useEvents] Cancel registration:', { 
      eventId, 
      occurrenceIndex, 
      userId: user.id,
      hasOccurrenceIndex: occurrenceIndex !== undefined 
    });

    try {
      // Build query to find the specific registration
      let query = supabase
        .from('event_registrations')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('user_id', user.id);
      
      if (occurrenceIndex !== undefined) {
        query = query.eq('occurrence_index', occurrenceIndex);
      } else {
        query = query.is('occurrence_index', null);
      }

      const { error, count } = await query;

      if (error) throw error;
      
      console.log('[useEvents] Registration cancelled in DB, affected rows:', count);

      toast({
        title: 'Sukces',
        description: 'Rezerwacja anulowana',
      });
      
      // Emit custom event for immediate widget updates
      window.dispatchEvent(new CustomEvent('eventRegistrationChange', { 
        detail: { eventId, occurrenceIndex, action: 'cancel' } 
      }));
      
      // Remove from Google Calendar - use await to ensure request is sent
      try {
        console.log('[useEvents] Sending delete request to Google Calendar sync:', { 
          eventId, 
          occurrenceIndex,
          hasOccurrenceIndex: occurrenceIndex !== undefined 
        });
        
        const res = await supabase.functions.invoke('sync-google-calendar', {
          body: { user_id: user.id, event_id: eventId, action: 'delete', occurrence_index: occurrenceIndex }
        });
        
        console.log('[useEvents] Google Calendar delete response:', res.data);
        
        if (res.error) {
          console.error('[useEvents] Google Calendar sync error:', res.error);
        } else if (res.data?.success) {
          console.log('[useEvents] Event successfully removed from Google Calendar');
        } else if (res.data?.reason === 'no_sync_record') {
          console.log('[useEvents] No sync record found (event was not in Google Calendar)');
        } else {
          console.warn('[useEvents] Google Calendar sync returned unexpected:', res.data);
        }
      } catch (syncErr) {
        console.error('[useEvents] Google Calendar sync (delete) failed:', syncErr);
        // Don't block - user already unregistered from event
      }
      
      console.log('[useEvents] ========== Cancel Complete ==========');
      
      await fetchEvents();
      return true;
    } catch (error) {
      console.error('Error cancelling registration:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się anulować rezerwacji',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getEventRegistrations = async (eventId: string) => {
    try {
      // First get registrations
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'registered');

      if (regError) throw regError;
      if (!registrations || registrations.length === 0) return [];

      // Then get profiles for those users
      const userIds = registrations.map(r => r.user_id);
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      if (profError) throw profError;

      // Merge data
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      return registrations.map(r => ({
        ...r,
        profiles: profileMap.get(r.user_id) || null,
      }));
    } catch (error) {
      console.error('Error fetching registrations:', error);
      return [];
    }
  };

  const getUserEvents = useCallback(async () => {
    if (!user) return [];

    try {
      // Step 1: Get user's ACTIVE registrations WITH occurrence_index for multi-occurrence support
      // CRITICAL: Only fetch registrations with status='registered' to ensure
      // cancelled registrations don't appear in "Moje spotkania"
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select('event_id, occurrence_index, status')
        .eq('user_id', user.id)
        .eq('status', 'registered');

      if (regError) throw regError;
      
      // Strict filtering: only show events where user is actively registered
      const activeRegistrations = (registrations || []).filter(r => r.status === 'registered');
      console.log(`📅 getUserEvents: Found ${activeRegistrations.length} active registrations for user ${user.id}`);
      
      if (activeRegistrations.length === 0) return [];

      // Step 2: Get events by IDs (separate query avoids RLS issues with nested joins)
      const eventIds = [...new Set(activeRegistrations.map(r => r.event_id))];
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .eq('is_active', true);

      if (eventsError) throw eventsError;

      // Step 3: Get host profiles for individual meetings
      const hostUserIds = [...new Set(
        (events || [])
          .filter(e => ['tripartite_meeting', 'partner_consultation'].includes(e.event_type))
          .map(e => e.host_user_id)
          .filter(Boolean)
      )] as string[];

      let hostProfiles: Map<string, { first_name: string | null; last_name: string | null }> = new Map();
      
      if (hostUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', hostUserIds);
        
        hostProfiles = new Map(
          (profiles || []).map(p => [p.user_id, { first_name: p.first_name, last_name: p.last_name }])
        );
      }

      // Step 4: Get participant profiles for individual meetings where current user is host
      const individualMeetingIds = (events || [])
        .filter(e => 
          ['tripartite_meeting', 'partner_consultation'].includes(e.event_type) &&
          e.host_user_id === user.id
        )
        .map(e => e.id);

      let participantProfiles: Map<string, { first_name: string | null; last_name: string | null; email: string }> = new Map();

      if (individualMeetingIds.length > 0) {
        // Get registrations for these events (excluding current user = host)
        const { data: participantRegs } = await supabase
          .from('event_registrations')
          .select('event_id, user_id')
          .in('event_id', individualMeetingIds)
          .neq('user_id', user.id)
          .eq('status', 'registered');

        if (participantRegs && participantRegs.length > 0) {
          const participantUserIds = [...new Set(participantRegs.map(r => r.user_id))];
          
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, email')
            .in('user_id', participantUserIds);

          // Map event_id -> participant profile
          participantRegs.forEach(reg => {
            const profile = profiles?.find(p => p.user_id === reg.user_id);
            if (profile) {
              participantProfiles.set(reg.event_id, {
                first_name: profile.first_name,
                last_name: profile.last_name,
                email: profile.email
              });
            }
          });
        }
      }

      // Step 5: Expand multi-occurrence events based on user's registrations
      const expandedEvents: EventWithRegistration[] = [];
      const eventMap = new Map((events || []).map(e => [e.id, e]));
      const seenEventTimes = new Set<string>(); // Deduplikacja po event_id + start_time

      // Build a map of event_id -> has specific occurrence registrations (with status='registered')
      const eventHasSpecificOccurrences = new Map<string, boolean>();
      activeRegistrations.forEach(reg => {
        if (reg.occurrence_index !== null && reg.occurrence_index !== undefined) {
          eventHasSpecificOccurrences.set(reg.event_id, true);
        }
      });

      activeRegistrations.forEach(reg => {
        const event = eventMap.get(reg.event_id);
        if (!event) return;

        const baseEvent = {
          ...event,
          buttons: (Array.isArray(event.buttons) ? event.buttons : []) as unknown as EventButton[],
          event_type: event.event_type as EventType,
          is_registered: true,
          host_profile: event.host_user_id ? hostProfiles.get(event.host_user_id) || null : null,
          participant_profile: participantProfiles.get(event.id) || null,
        };

        // For multi-occurrence events with null occurrence_index,
        // skip if there are ANY registrations with specific occurrence_index (they take precedence)
        if (isMultiOccurrenceEvent(baseEvent) && 
            reg.occurrence_index === null && 
            eventHasSpecificOccurrences.get(reg.event_id)) {
          console.log(`📅 Skipping legacy registration for ${baseEvent.title} - has specific occurrence registrations`);
          return;
        }

        let startTimeForDedupe: string;
        let eventToPush: EventWithRegistration;

        // Check if this is a multi-occurrence event with specific occurrence_index
        if (isMultiOccurrenceEvent(baseEvent) && reg.occurrence_index !== null && reg.occurrence_index !== undefined) {
          const allOccurrences = getAllOccurrences(baseEvent);
          const occurrence = allOccurrences.find(o => o.index === reg.occurrence_index);
          
          if (!occurrence) return;
          
          startTimeForDedupe = occurrence.start_datetime.toISOString();
          eventToPush = {
            ...baseEvent,
            start_time: startTimeForDedupe,
            end_time: occurrence.end_datetime.toISOString(),
            duration_minutes: occurrence.duration_minutes,
            _occurrence_index: occurrence.index,
            _is_multi_occurrence: true,
          } as EventWithRegistration & { _occurrence_index: number; _is_multi_occurrence: boolean };
        } else {
          // Single occurrence or legacy registration without occurrence_index
          startTimeForDedupe = new Date(baseEvent.start_time).toISOString();
          eventToPush = baseEvent;
        }

        // Deduplikacja: klucz = event_id + start_time (zapobiega duplikatom legacy + nowe rejestracje)
        const dedupeKey = `${reg.event_id}:${startTimeForDedupe}`;
        if (!seenEventTimes.has(dedupeKey)) {
          expandedEvents.push(eventToPush);
          seenEventTimes.add(dedupeKey);
        }
      });

      // Sort by start_time
      return expandedEvents.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    } catch (error) {
      console.error('Error fetching user events:', error);
      return [];
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();

    if (!user?.id) return;

    // Subscribe to real-time changes on event_registrations filtered by user_id
    const channel = supabase
      .channel(`event-registrations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_registrations',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents, user?.id]);

  return {
    events,
    loading,
    fetchEvents,
    fetchAllEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    registerForEvent,
    cancelRegistration,
    getEventRegistrations,
    getUserEvents,
  };
};
