import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  User, 
  Users, 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  Video,
  CheckCircle,
  ArrowRight,
  Globe,
  ExternalLink
} from 'lucide-react';
import { format, addMinutes, parse, addDays, getDay, startOfDay, isAfter, isBefore } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { PartnerWithAvailability } from '@/types/events';

interface PartnerMeetingBookingProps {
  meetingType: 'tripartite' | 'consultation';
}

interface AvailableSlot {
  date: string;
  time: string;
  slot_duration_minutes: number;
  leaderTime?: string;
  leaderTimezone?: string;
}

interface WeeklyRange {
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

type BookingStep = 'select-partner' | 'select-datetime' | 'confirm';

export const PartnerMeetingBooking: React.FC<PartnerMeetingBookingProps> = ({ meetingType }) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<BookingStep>('select-partner');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  
  // Partners with availability
  const [partners, setPartners] = useState<PartnerWithAvailability[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithAvailability | null>(null);
  
  // Date and time selection
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [leaderTimezone, setLeaderTimezone] = useState<string>('Europe/Warsaw');
  
  // Meeting settings from leader_meeting_settings
  const [meetingSettings, setMeetingSettings] = useState<{
    title: string;
    description: string;
    image_url: string;
  } | null>(null);
  
  // Get user's local timezone
  const userTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  // Load partners with enabled permissions and availability
  useEffect(() => {
    loadPartners();
  }, [meetingType]);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const permissionField = meetingType === 'tripartite' 
        ? 'tripartite_meeting_enabled' 
        : 'partner_consultation_enabled';

      console.log('[PartnerMeetingBooking] Loading partners for meetingType:', meetingType);

      // Get leader permissions with the required permission enabled
      const { data: permissions, error: permError } = await supabase
        .from('leader_permissions')
        .select('user_id, zoom_link, tripartite_meeting_enabled, partner_consultation_enabled, use_external_booking, external_calendly_url')
        .eq(permissionField, true);

      if (permError) {
        console.error('[PartnerMeetingBooking] Error loading permissions:', permError);
        throw permError;
      }
      
      console.log('[PartnerMeetingBooking] Found permissions:', permissions?.length || 0);
      
      if (!permissions || permissions.length === 0) {
        setPartners([]);
        setLoading(false);
        return;
      }

      const userIds = permissions.map(p => p.user_id);

      // Get profiles for these users
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      if (profError) {
        console.error('[PartnerMeetingBooking] Error loading profiles:', profError);
        throw profError;
      }

      // Check which leaders have weekly availability (day_of_week based)
      const { data: availabilityData, error: availError } = await supabase
        .from('leader_availability')
        .select('leader_user_id')
        .in('leader_user_id', userIds)
        .not('day_of_week', 'is', null)
        .eq('is_active', true);

      if (availError) {
        console.error('[PartnerMeetingBooking] Error loading availability:', availError);
      }

      const leadersWithAvailability = new Set(availabilityData?.map(a => a.leader_user_id) || []);

      // Merge data
      const partnersData: PartnerWithAvailability[] = permissions
        .filter(p => p.user_id !== user?.id) // Exclude current user
        .map(perm => {
          const profile = profiles?.find(p => p.user_id === perm.user_id);
          return {
            user_id: perm.user_id,
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
            email: profile?.email || '',
            zoom_link: perm.zoom_link,
            tripartite_meeting_enabled: perm.tripartite_meeting_enabled || false,
            partner_consultation_enabled: perm.partner_consultation_enabled || false,
            has_availability: leadersWithAvailability.has(perm.user_id),
            use_external_booking: perm.use_external_booking || false,
            external_calendly_url: perm.external_calendly_url,
          };
        })
        // Show partners with availability OR using external booking
        .filter(p => p.has_availability || p.use_external_booking);

      console.log('[PartnerMeetingBooking] Final partners list:', partnersData.length);
      setPartners(partnersData);
    } catch (error) {
      console.error('Error loading partners:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się załadować listy partnerów',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load available dates when partner is selected
  useEffect(() => {
    if (selectedPartner && !selectedPartner.use_external_booking) {
      loadAvailableDates();
    }
  }, [selectedPartner]);

  const loadAvailableDates = async () => {
    if (!selectedPartner) return;

    try {
      // Map meeting type to availability meeting_type
      const availabilityMeetingType = meetingType === 'tripartite' ? 'tripartite' : 'consultation';
      
      // Get weekly schedule for this partner filtered by meeting type
      const { data: weeklySchedule } = await supabase
        .from('leader_availability')
        .select('day_of_week, meeting_type')
        .eq('leader_user_id', selectedPartner.user_id)
        .not('day_of_week', 'is', null)
        .in('meeting_type', [availabilityMeetingType, 'both'])
        .eq('is_active', true);

      // Get date exceptions (blocked dates) filtered by meeting type
      const { data: exceptions } = await supabase
        .from('leader_availability_exceptions')
        .select('exception_date, meeting_type')
        .eq('leader_user_id', selectedPartner.user_id)
        .in('meeting_type', [availabilityMeetingType, 'both']);

      const activeDays = new Set(weeklySchedule?.map(s => s.day_of_week) || []);
      const blockedDates = new Set(exceptions?.map(e => e.exception_date) || []);

      // Generate available dates for next 30 days
      const dates: string[] = [];
      const today = startOfDay(new Date());
      
      for (let i = 0; i < 30; i++) {
        const date = addDays(today, i);
        const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, etc.
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Check if this day of week is enabled and not blocked
        if (activeDays.has(dayOfWeek) && !blockedDates.has(dateStr)) {
          dates.push(dateStr);
        }
      }

      setAvailableDates(dates);
    } catch (error) {
      console.error('Error loading available dates:', error);
    }
  };

  // Generate time slots from range
  const generateSlotsFromRange = useCallback((startTime: string, endTime: string, duration: number): string[] => {
    const slots: string[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    while (currentMinutes + duration <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      currentMinutes += duration;
    }
    
    return slots;
  }, []);

  const loadAvailableSlots = useCallback(async () => {
    if (!selectedPartner || !selectedDate) return;

    setLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const dayOfWeek = getDay(selectedDate);
      const partnerId = selectedPartner.user_id;

      // Map meeting type to availability meeting_type
      const availabilityMeetingType = meetingType === 'tripartite' ? 'tripartite' : 'consultation';
      
      // 1. Parallel fetch: weekly ranges + booked meetings + blocking events + Google token + leader permissions
      const [weeklyResult, meetingsResult, blockingResult, tokenResult, permissionsResult] = await Promise.all([
        supabase
          .from('leader_availability')
          .select('start_time, end_time, slot_duration_minutes, timezone, meeting_type')
          .eq('leader_user_id', partnerId)
          .eq('day_of_week', dayOfWeek)
          .in('meeting_type', [availabilityMeetingType, 'both'])
          .eq('is_active', true),
        supabase
          .from('events')
          .select('start_time, end_time, event_type')
          .eq('host_user_id', partnerId)
          .in('event_type', ['tripartite_meeting', 'partner_consultation'])
          .gte('start_time', `${dateStr}T00:00:00`)
          .lt('start_time', `${dateStr}T23:59:59`)
          .eq('is_active', true),
        supabase
          .from('events')
          .select('start_time, end_time')
          .in('event_type', ['webinar', 'spotkanie_zespolu', 'team_training'])
          .gte('end_time', `${dateStr}T00:00:00`)
          .lte('start_time', `${dateStr}T23:59:59`)
          .eq('is_active', true),
        supabase
          .from('user_google_tokens')
          .select('id')
          .eq('user_id', partnerId)
          .maybeSingle(),
        supabase
          .from('leader_permissions')
          .select('tripartite_slot_duration, consultation_slot_duration')
          .eq('user_id', partnerId)
          .maybeSingle(),
      ]);

      const weeklyRanges = weeklyResult.data;
      if (!weeklyRanges || weeklyRanges.length === 0) {
        setAvailableSlots([]);
        setLoadingSlots(false);
        return;
      }

      const partnerTimezone = weeklyRanges[0]?.timezone || 'Europe/Warsaw';
      setLeaderTimezone(partnerTimezone);
      
      // Use separate slot duration for each meeting type
      const permissions = permissionsResult.data;
      const slotDuration = meetingType === 'tripartite'
        ? (permissions?.tripartite_slot_duration || weeklyRanges[0]?.slot_duration_minutes || 60)
        : (permissions?.consultation_slot_duration || weeklyRanges[0]?.slot_duration_minutes || 60);

      // 2. Generate all possible slots from ranges
      let allSlots: string[] = [];
      weeklyRanges.forEach(range => {
        const rangeSlots = generateSlotsFromRange(
          range.start_time?.substring(0, 5) || '09:00',
          range.end_time?.substring(0, 5) || '17:00',
          range.slot_duration_minutes || 60
        );
        allSlots = [...allSlots, ...rangeSlots];
      });

      // Remove duplicates and sort
      allSlots = [...new Set(allSlots)].sort();

      // 3. Process booked meetings with overlap checking
      const bookedMeetings = meetingsResult.data || [];
      
      const isSlotBlockedByExistingMeeting = (slotTime: string): boolean => {
        const slotStart = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
        const slotEnd = addMinutes(slotStart, slotDuration);
        
        return bookedMeetings.some(meeting => {
          const meetingStart = new Date(meeting.start_time);
          const meetingEnd = new Date(meeting.end_time);
          
          // Overlap: slotStart < meetingEnd AND slotEnd > meetingStart
          return slotStart < meetingEnd && slotEnd > meetingStart;
        });
      };

      // 4. Calculate blocked times from platform events
      const blockedByPlatform = new Set<string>();
      blockingResult.data?.forEach(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        
        allSlots.forEach(slotTime => {
          const slotStart = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
          const slotEnd = addMinutes(slotStart, slotDuration);
          
          if (slotStart < eventEnd && slotEnd > eventStart) {
            blockedByPlatform.add(slotTime);
          }
        });
      });

      // 5. Check Google Calendar busy times (only if token exists)
      let googleBusySlots = new Set<string>();
      
      if (tokenResult.data) {
        try {
          const { data: busyData } = await supabase.functions.invoke(
            'check-google-calendar-busy',
            { body: { leader_user_id: partnerId, date: dateStr } }
          );
          
          if (busyData?.busy && Array.isArray(busyData.busy)) {
            busyData.busy.forEach((busySlot: { start: string; end: string }) => {
              const busyStart = new Date(busySlot.start);
              const busyEnd = new Date(busySlot.end);
              
              allSlots.forEach(slotTime => {
                const slotStart = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
                const slotEnd = addMinutes(slotStart, slotDuration);
                
                if (slotStart < busyEnd && slotEnd > busyStart) {
                  googleBusySlots.add(slotTime);
                }
              });
            });
          }
        } catch (error) {
          console.warn('[PartnerMeetingBooking] Google Calendar check failed:', error);
        }
      }

      // 6. Filter out all blocked slots
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const currentTime = format(now, 'HH:mm');

      const availableSlotsList: AvailableSlot[] = allSlots
        .filter(slotTime => {
          if (dateStr === today && slotTime <= currentTime) return false;
          if (isSlotBlockedByExistingMeeting(slotTime)) return false;
          if (blockedByPlatform.has(slotTime)) return false;
          if (googleBusySlots.has(slotTime)) return false;
          return true;
        })
        .map(slotTime => {
          let displayTime = slotTime;
          try {
            const leaderDateTime = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
            displayTime = formatInTimeZone(leaderDateTime, userTimezone, 'HH:mm');
          } catch (e) {
            console.warn('[PartnerMeetingBooking] Timezone conversion error:', e);
          }
          
          return {
            date: dateStr,
            time: displayTime,
            slot_duration_minutes: slotDuration,
            leaderTime: slotTime,
            leaderTimezone: partnerTimezone,
          };
        });

      console.log('[PartnerMeetingBooking] Available slots:', availableSlotsList.length);
      setAvailableSlots(availableSlotsList);
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedPartner?.user_id, selectedDate, userTimezone, generateSlotsFromRange, meetingType]);

  // Load available time slots when date is selected
  useEffect(() => {
    if (selectedPartner && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedPartner?.user_id, loadAvailableSlots]);

  useEffect(() => {
    if (!selectedPartner) return;

    // Use stable channel name with partner ID
    const channelName = `booking-${selectedPartner.user_id}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `host_user_id=eq.${selectedPartner.user_id}`
        },
        () => {
          // Debounce refresh to avoid multiple rapid calls
          loadAvailableDates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPartner?.user_id]); // Only depend on user_id, not the whole object

  const handleSelectPartner = async (partner: PartnerWithAvailability) => {
    setSelectedPartner(partner);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    
    // Load meeting settings for this partner and meeting type
    try {
      const { data: settings } = await supabase
        .from('leader_meeting_settings')
        .select('title, description, image_url')
        .eq('leader_user_id', partner.user_id)
        .eq('meeting_type', meetingType === 'tripartite' ? 'tripartite' : 'consultation')
        .maybeSingle();
      
      setMeetingSettings(settings || null);
    } catch (error) {
      console.error('Error loading meeting settings:', error);
    }
    
    setStep('select-datetime');
  };

  const handleSelectSlot = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep('confirm');
  };

  const handleBookMeeting = async () => {
    if (!user || !selectedPartner || !selectedSlot) return;

    setBooking(true);
    try {
      const timeToUse = selectedSlot.leaderTime || selectedSlot.time;
      
      const localStartDate = parse(`${selectedSlot.date} ${timeToUse}`, 'yyyy-MM-dd HH:mm', new Date());
      const startDateTime = localStartDate.toISOString();
      const endDate = addMinutes(localStartDate, selectedSlot.slot_duration_minutes);
      const endDateTime = endDate.toISOString();

      // Check if slot is still available before creating (prevent double booking)
      const { data: existingEvent } = await supabase
        .from('events')
        .select('id')
        .eq('host_user_id', selectedPartner.user_id)
        .in('event_type', ['tripartite_meeting', 'partner_consultation'])
        .gte('start_time', startDateTime)
        .lt('end_time', endDateTime)
        .eq('is_active', true)
        .maybeSingle();

      if (existingEvent) {
        toast({
          title: 'Slot już zajęty',
          description: 'Ten termin został właśnie zarezerwowany przez kogoś innego. Wybierz inny.',
          variant: 'destructive',
        });
        setBooking(false);
        loadAvailableSlots();
        return;
      }

      // Check for conflicts with webinars and team trainings
      // Use strict < and > to allow back-to-back meetings (event ends when slot starts = OK)
      const { data: blockingEvent } = await supabase
        .from('events')
        .select('id, title')
        .in('event_type', ['webinar', 'team_training', 'spotkanie_zespolu'])
        .lt('start_time', endDateTime)
        .gt('end_time', startDateTime)
        .eq('is_active', true)
        .maybeSingle();

      if (blockingEvent) {
        toast({
          title: 'Konflikt czasowy',
          description: `W tym czasie odbywa się: ${blockingEvent.title}`,
          variant: 'destructive',
        });
        setBooking(false);
        loadAvailableSlots();
        return;
      }

      // Create the event
      const eventTitle = meetingSettings?.title || (meetingType === 'tripartite' 
        ? 'Spotkanie trójstronne' 
        : 'Konsultacje dla partnerów');

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title: eventTitle,
          event_type: meetingType === 'tripartite' 
            ? 'tripartite_meeting' 
            : 'partner_consultation',
          start_time: startDateTime,
          end_time: endDateTime,
          host_user_id: selectedPartner.user_id,
          zoom_link: selectedPartner.zoom_link,
          created_by: user.id,
          visible_to_partners: true,
          visible_to_specjalista: false,
          visible_to_clients: false,
          visible_to_everyone: false,
          requires_registration: false,
          max_participants: 2,
          is_active: true,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Register both users for the event
      const { error: regError } = await supabase
        .from('event_registrations')
        .insert([
          { event_id: event.id, user_id: user.id, status: 'registered' },
          { event_id: event.id, user_id: selectedPartner.user_id, status: 'registered' },
        ]);

      if (regError) throw regError;

      // Sync to Google Calendar for both users
      supabase.functions.invoke('sync-google-calendar', {
        body: { 
          user_ids: [user.id, selectedPartner.user_id], 
          event_id: event.id, 
          action: 'create' 
        }
      }).catch(err => console.log('[PartnerMeetingBooking] GCal sync skipped or failed:', err));

      // Send email notifications
      const emailTopic = meetingSettings?.title || (meetingType === 'tripartite' ? 'Spotkanie trójstronne' : 'Konsultacje partnerskie');
      const emailDate = format(selectedDate!, 'dd.MM.yyyy', { locale: pl });
      const emailTime = selectedSlot!.time;

      // Get current user's profile for email
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      // Email to leader/host (meeting_booked)
      supabase.functions.invoke('send-notification-email', {
        body: {
          event_type_id: '1a6d6530-c93e-4486-83b8-6f875a989d0b', // meeting_booked
          recipient_user_id: selectedPartner.user_id,
          payload: {
            temat: emailTopic,
            data_spotkania: emailDate,
            godzina_spotkania: emailTime,
            imie_rezerwujacego: userProfile?.first_name || '',
            nazwisko_rezerwujacego: userProfile?.last_name || '',
          },
        },
      }).catch(err => console.log('[PartnerMeetingBooking] Email to leader failed:', err));

      // Email to booking user (meeting_confirmed)
      supabase.functions.invoke('send-notification-email', {
        body: {
          event_type_id: '8f25b35a-1fb9-41e6-a6f2-d7b4863d092e', // meeting_confirmed
          recipient_user_id: user.id,
          payload: {
            temat: emailTopic,
            data_spotkania: emailDate,
            godzina_spotkania: emailTime,
            imie_lidera: selectedPartner.first_name || '',
            nazwisko_lidera: selectedPartner.last_name || '',
          },
        },
      }).catch(err => console.log('[PartnerMeetingBooking] Email to booker failed:', err));

      toast({
        title: 'Sukces!',
        description: 'Spotkanie zostało zarezerwowane. Powiadomienia email zostały wysłane.',
      });

      // Reset to partner selection
      setStep('select-partner');
      setSelectedPartner(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      
      loadPartners();
    } catch (error: any) {
      console.error('Error booking meeting:', error);
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się zarezerwować spotkania',
        variant: 'destructive',
      });
    } finally {
      setBooking(false);
    }
  };

  const goBack = () => {
    if (step === 'confirm') {
      setSelectedSlot(null);
      setStep('select-datetime');
    } else if (step === 'select-datetime') {
      setSelectedPartner(null);
      setSelectedDate(undefined);
      setAvailableSlots([]);
      setStep('select-partner');
    }
  };

  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const today = startOfDay(new Date());
    // Allow today and future dates (not just after today)
    return availableDates.includes(dateStr) && !isBefore(date, today);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Step 1: Select Partner
  if (step === 'select-partner') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {meetingType === 'tripartite' ? (
              <>
                <Users className="h-5 w-5" />
                Spotkanie trójstronne
              </>
            ) : (
              <>
                <User className="h-5 w-5" />
                Konsultacje dla partnerów
              </>
            )}
          </CardTitle>
          <CardDescription>
            Wybierz partnera, z którym chcesz umówić spotkanie
          </CardDescription>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak dostępnych partnerów dla tego typu spotkania</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {partners.map((partner) => (
                <button
                  key={partner.user_id}
                  onClick={() => handleSelectPartner(partner)}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left w-full"
                >
                  <Avatar>
                    <AvatarFallback>
                      {(partner.first_name?.[0] || '') + (partner.last_name?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {partner.first_name} {partner.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {partner.email}
                    </p>
                  </div>
                  {partner.use_external_booking ? (
                    <Badge variant="outline" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Zewnętrzny
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Dostępny</Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Step 2: Select Date & Time (or show external booking)
  if (step === 'select-datetime' && selectedPartner) {
    // External booking
    if (selectedPartner.use_external_booking && selectedPartner.external_calendly_url) {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-lg">
                  Rezerwacja u {selectedPartner.first_name} {selectedPartner.last_name}
                </CardTitle>
                <CardDescription>
                  Ten partner używa zewnętrznego systemu rezerwacji
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-center py-8">
            <ExternalLink className="h-12 w-12 mx-auto mb-4 text-primary" />
            <p className="mb-4 text-muted-foreground">
              Kliknij poniżej, aby przejść do systemu rezerwacji
            </p>
            <Button asChild>
              <a href={selectedPartner.external_calendly_url} target="_blank" rel="noopener noreferrer">
                Przejdź do rezerwacji
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Internal booking
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-lg">
                Wybierz termin
              </CardTitle>
              <CardDescription>
                Spotkanie z {selectedPartner.first_name} {selectedPartner.last_name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => !isDateAvailable(date)}
                locale={pl}
                className="rounded-md border"
                classNames={{
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary font-bold",
                  day_today: "bg-accent text-accent-foreground font-semibold ring-1 ring-primary/30",
                }}
              />
            </div>

            {/* Time Slots */}
            <div>
              {!selectedDate ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Wybierz datę z kalendarza</p>
                </div>
              ) : loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Brak dostępnych terminów w tym dniu</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium mb-3">
                    {format(selectedDate, 'd MMMM yyyy', { locale: pl })}
                  </p>
                  <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                    {availableSlots.map((slot, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectSlot(slot)}
                        className="h-10"
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                  {userTimezone !== leaderTimezone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <Globe className="h-3 w-3" />
                      Godziny w Twojej strefie czasowej ({userTimezone})
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Confirm
  if (step === 'confirm' && selectedPartner && selectedSlot) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-lg">Potwierdź rezerwację</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meeting Info */}
          {meetingSettings && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium">{meetingSettings.title}</h3>
              {meetingSettings.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {meetingSettings.description}
                </p>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {(selectedPartner.first_name?.[0] || '') + (selectedPartner.last_name?.[0] || '')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {selectedPartner.first_name} {selectedPartner.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{selectedPartner.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(selectedSlot.date), 'd MMMM yyyy', { locale: pl })}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{selectedSlot.time} ({selectedSlot.slot_duration_minutes} min)</span>
            </div>

            {selectedPartner.zoom_link && (
              <div className="flex items-center gap-2 text-sm">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span>Zoom</span>
              </div>
            )}
          </div>

          <Button 
            onClick={handleBookMeeting} 
            disabled={booking}
            className="w-full gap-2"
          >
            {booking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Rezerwacja...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Potwierdź rezerwację
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
};
