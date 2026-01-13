import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  Event, 
  EventRegistration, 
  EventWithRegistration, 
  EventFormData,
  EventButton 
} from '@/types/events';

export const useEvents = () => {
  const [events, setEvents] = useState<EventWithRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Parse buttons from JSONB
      const parsedEvents = (data || []).map(event => ({
        ...event,
        buttons: (Array.isArray(event.buttons) ? event.buttons : []) as unknown as EventButton[],
        event_type: event.event_type as 'webinar' | 'meeting_public' | 'meeting_private',
      }));

      // If user is logged in, check their registrations
      if (user) {
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('user_id', user.id)
          .eq('status', 'registered');

        const registeredEventIds = new Set(registrations?.map(r => r.event_id) || []);
        
        const eventsWithRegistration = parsedEvents.map(event => ({
          ...event,
          is_registered: registeredEventIds.has(event.id),
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
        event_type: event.event_type as 'webinar' | 'meeting_public' | 'meeting_private',
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

  const getUserEvents = async () => {
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

      // Step 3: Map and sort events
      return (events || [])
        .map(event => ({
          ...event,
          buttons: (Array.isArray(event.buttons) ? event.buttons : []) as unknown as EventButton[],
          event_type: event.event_type as 'webinar' | 'meeting_public' | 'meeting_private',
          is_registered: true,
        }))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    } catch (error) {
      console.error('Error fetching user events:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchEvents();
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
