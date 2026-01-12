import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  LeaderPermission, 
  LeaderMeetingTopic, 
  LeaderAvailability,
  LeaderWithProfile,
  AvailableSlot
} from '@/types/events';
import { addDays, format, parse, isBefore, isAfter, startOfDay, setHours, setMinutes } from 'date-fns';

export const useLeaderAvailability = () => {
  const [isLeader, setIsLeader] = useState(false);
  const [leaderPermission, setLeaderPermission] = useState<LeaderPermission | null>(null);
  const [topics, setTopics] = useState<LeaderMeetingTopic[]>([]);
  const [availability, setAvailability] = useState<LeaderAvailability[]>([]);
  const [activeLeaders, setActiveLeaders] = useState<LeaderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const checkLeaderStatus = useCallback(async () => {
    if (!user) {
      setIsLeader(false);
      setLeaderPermission(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('leader_permissions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setLeaderPermission(data);
      setIsLeader(data?.can_host_private_meetings || false);
    } catch (error) {
      console.error('Error checking leader status:', error);
    }
  }, [user]);

  const fetchMyTopics = useCallback(async () => {
    if (!user || !isLeader) return;

    try {
      const { data, error } = await supabase
        .from('leader_meeting_topics')
        .select('*')
        .eq('leader_user_id', user.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  }, [user, isLeader]);

  const fetchMyAvailability = useCallback(async () => {
    if (!user || !isLeader) return;

    try {
      const { data, error } = await supabase
        .from('leader_availability')
        .select('*')
        .eq('leader_user_id', user.id)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  }, [user, isLeader]);

  const fetchActiveLeaders = useCallback(async () => {
    try {
      const { data: permissions, error: permError } = await supabase
        .from('leader_permissions')
        .select('user_id, zoom_link, can_host_private_meetings')
        .eq('can_host_private_meetings', true);

      if (permError) throw permError;

      if (!permissions || permissions.length === 0) {
        setActiveLeaders([]);
        return;
      }

      const userIds = permissions.map(p => p.user_id);
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      const leaders: LeaderWithProfile[] = (profiles || []).map(profile => {
        const perm = permissions.find(p => p.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: profile.email || '',
          zoom_link: perm?.zoom_link || null,
          can_host_private_meetings: perm?.can_host_private_meetings || false,
        };
      });

      setActiveLeaders(leaders);
    } catch (error) {
      console.error('Error fetching active leaders:', error);
    }
  }, []);

  const addTopic = async (title: string, description: string, durationMinutes: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const maxOrder = topics.length > 0 ? Math.max(...topics.map(t => t.sort_order)) : 0;
      
      const { error } = await supabase
        .from('leader_meeting_topics')
        .insert({
          leader_user_id: user.id,
          title,
          description,
          duration_minutes: durationMinutes,
          sort_order: maxOrder + 1,
        });

      if (error) throw error;

      toast({ title: 'Sukces', description: 'Temat został dodany' });
      await fetchMyTopics();
      return true;
    } catch (error) {
      console.error('Error adding topic:', error);
      toast({ title: 'Błąd', description: 'Nie udało się dodać tematu', variant: 'destructive' });
      return false;
    }
  };

  const updateTopic = async (id: string, updates: Partial<LeaderMeetingTopic>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('leader_meeting_topics')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchMyTopics();
      return true;
    } catch (error) {
      console.error('Error updating topic:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować tematu', variant: 'destructive' });
      return false;
    }
  };

  const deleteTopic = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('leader_meeting_topics')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Sukces', description: 'Temat został usunięty' });
      await fetchMyTopics();
      return true;
    } catch (error) {
      console.error('Error deleting topic:', error);
      toast({ title: 'Błąd', description: 'Nie udało się usunąć tematu', variant: 'destructive' });
      return false;
    }
  };

  const addAvailabilitySlot = async (
    dayOfWeek: number | null, 
    specificDate: string | null,
    startTime: string, 
    endTime: string,
    slotDuration: number = 30
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('leader_availability')
        .insert({
          leader_user_id: user.id,
          day_of_week: dayOfWeek,
          specific_date: specificDate,
          start_time: startTime,
          end_time: endTime,
          slot_duration_minutes: slotDuration,
        });

      if (error) throw error;

      toast({ title: 'Sukces', description: 'Slot dostępności został dodany' });
      await fetchMyAvailability();
      return true;
    } catch (error) {
      console.error('Error adding availability slot:', error);
      toast({ title: 'Błąd', description: 'Nie udało się dodać slotu', variant: 'destructive' });
      return false;
    }
  };

  const deleteAvailabilitySlot = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('leader_availability')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Sukces', description: 'Slot został usunięty' });
      await fetchMyAvailability();
      return true;
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      toast({ title: 'Błąd', description: 'Nie udało się usunąć slotu', variant: 'destructive' });
      return false;
    }
  };

  const updateZoomLink = async (zoomLink: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('leader_permissions')
        .update({ zoom_link: zoomLink })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Sukces', description: 'Link Zoom został zaktualizowany' });
      await checkLeaderStatus();
      return true;
    } catch (error) {
      console.error('Error updating zoom link:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować linku', variant: 'destructive' });
      return false;
    }
  };

  const getLeaderTopics = async (leaderUserId: string): Promise<LeaderMeetingTopic[]> => {
    try {
      const { data, error } = await supabase
        .from('leader_meeting_topics')
        .select('*')
        .eq('leader_user_id', leaderUserId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching leader topics:', error);
      return [];
    }
  };

  const getLeaderAvailableSlots = async (
    leaderUserId: string, 
    daysAhead: number = 30
  ): Promise<AvailableSlot[]> => {
    try {
      // Fetch leader's availability
      const { data: availabilityData, error: availError } = await supabase
        .from('leader_availability')
        .select('*')
        .eq('leader_user_id', leaderUserId)
        .eq('is_active', true);

      if (availError) throw availError;
      if (!availabilityData || availabilityData.length === 0) return [];

      // Fetch existing bookings
      const startDate = new Date();
      const endDate = addDays(startDate, daysAhead);
      
      const { data: bookings, error: bookError } = await supabase
        .from('events')
        .select('start_time, end_time')
        .eq('host_user_id', leaderUserId)
        .eq('event_type', 'meeting_private')
        .eq('is_active', true)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (bookError) throw bookError;

      const bookedTimes = new Set(
        (bookings || []).map(b => new Date(b.start_time).toISOString())
      );

      // Generate available slots
      const slots: AvailableSlot[] = [];
      
      for (let i = 0; i < daysAhead; i++) {
        const currentDate = addDays(startOfDay(startDate), i);
        const dayOfWeek = currentDate.getDay();

        for (const avail of availabilityData) {
          // Check if this availability applies to this day
          const matchesDay = avail.day_of_week === dayOfWeek;
          const matchesSpecificDate = avail.specific_date && 
            format(currentDate, 'yyyy-MM-dd') === avail.specific_date;

          if (!matchesDay && !matchesSpecificDate) continue;

          // Parse start and end times
          const [startHour, startMin] = avail.start_time.split(':').map(Number);
          const [endHour, endMin] = avail.end_time.split(':').map(Number);
          
          let slotTime = setMinutes(setHours(currentDate, startHour), startMin);
          const endTime = setMinutes(setHours(currentDate, endHour), endMin);

          // Generate slots
          while (isBefore(slotTime, endTime)) {
            const slotIso = slotTime.toISOString();
            
            // Skip if already booked or in the past
            if (!bookedTimes.has(slotIso) && isAfter(slotTime, new Date())) {
              slots.push({
                date: format(slotTime, 'yyyy-MM-dd'),
                time: format(slotTime, 'HH:mm'),
                datetime: slotIso,
              });
            }

            // Move to next slot
            slotTime = new Date(slotTime.getTime() + avail.slot_duration_minutes * 60000);
          }
        }
      }

      // Sort by datetime
      return slots.sort((a, b) => 
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );
    } catch (error) {
      console.error('Error fetching available slots:', error);
      return [];
    }
  };

  const bookMeeting = async (
    leaderUserId: string,
    topicId: string,
    startTime: string,
    durationMinutes: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Get leader info
      const leader = activeLeaders.find(l => l.user_id === leaderUserId);
      const topic = await supabase
        .from('leader_meeting_topics')
        .select('title')
        .eq('id', topicId)
        .single();

      const endTime = new Date(new Date(startTime).getTime() + durationMinutes * 60000);

      // Create the meeting event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title: `Spotkanie: ${topic.data?.title || 'Prywatne'}`,
          event_type: 'meeting_private',
          start_time: startTime,
          end_time: endTime.toISOString(),
          host_user_id: leaderUserId,
          created_by: user.id,
          meeting_topic_id: topicId,
          zoom_link: leader?.zoom_link,
          visible_to_everyone: false,
          visible_to_partners: false,
          visible_to_specjalista: false,
          visible_to_clients: false,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Register the user for this meeting
      const { error: regError } = await supabase
        .from('event_registrations')
        .insert({
          event_id: event.id,
          user_id: user.id,
          status: 'registered',
        });

      if (regError) throw regError;

      toast({ 
        title: 'Sukces', 
        description: 'Spotkanie zostało zarezerwowane' 
      });
      
      return true;
    } catch (error) {
      console.error('Error booking meeting:', error);
      toast({ 
        title: 'Błąd', 
        description: 'Nie udało się zarezerwować spotkania', 
        variant: 'destructive' 
      });
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await checkLeaderStatus();
      await fetchActiveLeaders();
      setLoading(false);
    };
    init();
  }, [checkLeaderStatus, fetchActiveLeaders]);

  useEffect(() => {
    if (isLeader) {
      fetchMyTopics();
      fetchMyAvailability();
    }
  }, [isLeader, fetchMyTopics, fetchMyAvailability]);

  return {
    isLeader,
    leaderPermission,
    topics,
    availability,
    activeLeaders,
    loading,
    checkLeaderStatus,
    fetchMyTopics,
    fetchMyAvailability,
    fetchActiveLeaders,
    addTopic,
    updateTopic,
    deleteTopic,
    addAvailabilitySlot,
    deleteAvailabilitySlot,
    updateZoomLink,
    getLeaderTopics,
    getLeaderAvailableSlots,
    bookMeeting,
  };
};
