import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
          .select('event_id')
          .eq('user_id', user.id)
          .eq('status', 'registered');

        const registeredEventIds = new Set(registrations?.map(r => r.event_id) || []);
        
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

        setEvents(eventsWithRegistration);
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

  const registerForEvent = async (eventId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'registered',
        });

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Zapisano na wydarzenie',
      });
      
      // Emit custom event for immediate widget updates
      window.dispatchEvent(new CustomEvent('eventRegistrationChange', { 
        detail: { eventId, action: 'register' } 
      }));
      
      // Sync to Google Calendar in background (fire and forget)
      supabase.functions.invoke('sync-google-calendar', {
        body: { user_id: user.id, event_id: eventId, action: 'create' }
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

  const cancelRegistration = async (eventId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Rezerwacja anulowana',
      });
      
      // Emit custom event for immediate widget updates
      window.dispatchEvent(new CustomEvent('eventRegistrationChange', { 
        detail: { eventId, action: 'cancel' } 
      }));
      
      // Remove from Google Calendar in background (fire and forget)
      supabase.functions.invoke('sync-google-calendar', {
        body: { user_id: user.id, event_id: eventId, action: 'delete' }
      }).then(res => {
        if (res.data?.success) {
          console.log('[useEvents] Event removed from Google Calendar');
        }
      }).catch(err => {
        console.warn('[useEvents] Google Calendar sync (delete) failed:', err);
      });
      
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
      // Step 1: Get user's registrations (simple query, no nested join)
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'registered');

      if (regError) throw regError;
      if (!registrations || registrations.length === 0) return [];

      // Step 2: Get events by IDs (separate query avoids RLS issues with nested joins)
      const eventIds = registrations.map(r => r.event_id);
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

      // Step 5: Map and sort events with host and participant info
      return (events || [])
        .map(event => ({
          ...event,
          buttons: (Array.isArray(event.buttons) ? event.buttons : []) as unknown as EventButton[],
          event_type: event.event_type as EventType,
          is_registered: true,
          host_profile: event.host_user_id ? hostProfiles.get(event.host_user_id) || null : null,
          participant_profile: participantProfiles.get(event.id) || null,
        }))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    } catch (error) {
      console.error('Error fetching user events:', error);
      return [];
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();

    // Subscribe to real-time changes on event_registrations
    const channel = supabase
      .channel('event-registrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'event_registrations'
        },
        (payload) => {
          console.log('Event registration change:', payload);
          // Refetch events when any registration changes
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents]);

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
