import React, { useState, useEffect, useCallback } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { format, addMinutes, parse, isSameDay, isAfter, startOfDay } from 'date-fns';
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
        .select('user_id, zoom_link, tripartite_meeting_enabled, partner_consultation_enabled')
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
      console.log('[PartnerMeetingBooking] User IDs with permissions:', userIds);

      // Get profiles for these users
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      if (profError) {
        console.error('[PartnerMeetingBooking] Error loading profiles:', profError);
        throw profError;
      }
      
      console.log('[PartnerMeetingBooking] Found profiles:', profiles?.length || 0);

      // Check which leaders have availability
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: availabilityData, error: availError } = await supabase
        .from('leader_availability')
        .select('leader_user_id, specific_date')
        .in('leader_user_id', userIds)
        .gte('specific_date', today)
        .eq('is_active', true);

      if (availError) {
        console.error('[PartnerMeetingBooking] Error loading availability:', availError);
      }
      
      console.log('[PartnerMeetingBooking] Availability data:', availabilityData?.length || 0);

      const leadersWithAvailability = new Set(availabilityData?.map(a => a.leader_user_id) || []);
      console.log('[PartnerMeetingBooking] Leaders with availability:', Array.from(leadersWithAvailability));

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
          };
        })
        .filter(p => p.has_availability); // Only show partners with availability

      console.log('[PartnerMeetingBooking] Final partners list:', partnersData.length, partnersData.map(p => p.email));
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
    if (selectedPartner) {
      loadAvailableDates();
    }
  }, [selectedPartner]);

  const loadAvailableDates = async () => {
    if (!selectedPartner) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get all availability slots for this partner
      const { data: availability } = await supabase
        .from('leader_availability')
        .select('specific_date')
        .eq('leader_user_id', selectedPartner.user_id)
        .gte('specific_date', today)
        .eq('is_active', true);

      // Get already booked events for this partner
      const { data: bookedEvents } = await supabase
        .from('events')
        .select('start_time')
        .eq('host_user_id', selectedPartner.user_id)
        .in('event_type', ['tripartite_meeting', 'partner_consultation'])
        .gte('start_time', `${today}T00:00:00`)
        .eq('is_active', true);

      const bookedDates = new Set(
        bookedEvents?.map(e => format(new Date(e.start_time), 'yyyy-MM-dd')) || []
      );

      // Filter dates that still have availability
      const uniqueDates = [...new Set(availability?.map(a => a.specific_date).filter(Boolean) as string[])];
      
      // For each date, check if there's at least one unbooked slot
      const availableDatesList: string[] = [];
      
      for (const date of uniqueDates) {
        const slotsForDate = availability?.filter(a => a.specific_date === date) || [];
        const bookedTimesForDate = bookedEvents
          ?.filter(e => format(new Date(e.start_time), 'yyyy-MM-dd') === date)
          .map(e => format(new Date(e.start_time), 'HH:mm')) || [];
        
        // Check if any slot is still available
        const { data: dateSlots } = await supabase
          .from('leader_availability')
          .select('start_time')
          .eq('leader_user_id', selectedPartner.user_id)
          .eq('specific_date', date)
          .eq('is_active', true);

        const hasAvailableSlot = dateSlots?.some(
          slot => !bookedTimesForDate.includes(slot.start_time?.substring(0, 5) || '')
        );

        if (hasAvailableSlot) {
          availableDatesList.push(date);
        }
      }

      setAvailableDates(availableDatesList);
    } catch (error) {
      console.error('Error loading available dates:', error);
    }
  };

  // Load available time slots when date is selected
  useEffect(() => {
    if (selectedPartner && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedPartner]);

  const loadAvailableSlots = async () => {
    if (!selectedPartner || !selectedDate) return;

    setLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Get availability for this date
      const { data: availability } = await supabase
        .from('leader_availability')
        .select('start_time, slot_duration_minutes')
        .eq('leader_user_id', selectedPartner.user_id)
        .eq('specific_date', dateStr)
        .eq('is_active', true);

      // Get already booked individual meetings for this partner on this date
      const { data: individualMeetings } = await supabase
        .from('events')
        .select('start_time, title')
        .eq('host_user_id', selectedPartner.user_id)
        .in('event_type', ['tripartite_meeting', 'partner_consultation'])
        .gte('start_time', `${dateStr}T00:00:00`)
        .lt('start_time', `${dateStr}T23:59:59`)
        .eq('is_active', true);

      // Get global events (webinars, team meetings) on this date
      const { data: globalEvents } = await supabase
        .from('events')
        .select('id, start_time, title, event_type')
        .in('event_type', ['webinar', 'spotkanie_zespolu', 'team_training'])
        .gte('start_time', `${dateStr}T00:00:00`)
        .lt('start_time', `${dateStr}T23:59:59`)
        .eq('is_active', true);

      // Check if the selected partner is registered for any global events
      let registeredGlobalEventTimes: string[] = [];
      if (globalEvents && globalEvents.length > 0) {
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('user_id', selectedPartner.user_id)
          .in('event_id', globalEvents.map(e => e.id));

        if (registrations && registrations.length > 0) {
          const registeredEventIds = new Set(registrations.map(r => r.event_id));
          registeredGlobalEventTimes = globalEvents
            .filter(e => registeredEventIds.has(e.id))
            .map(e => format(new Date(e.start_time), 'HH:mm'));
        }
      }

      // Combine all blocked times
      const individualMeetingTimes = individualMeetings?.map(e => 
        format(new Date(e.start_time), 'HH:mm')
      ) || [];
      
      const allBlockedTimes = new Set([
        ...individualMeetingTimes,
        ...registeredGlobalEventTimes
      ]);

      console.log('[PartnerMeetingBooking] Blocked times for', dateStr, ':', Array.from(allBlockedTimes));

      // Filter out booked slots
      const slots: AvailableSlot[] = (availability || [])
        .filter(slot => !allBlockedTimes.has(slot.start_time?.substring(0, 5) || ''))
        .map(slot => ({
          date: dateStr,
          time: slot.start_time?.substring(0, 5) || '09:00',
          slot_duration_minutes: slot.slot_duration_minutes || 60,
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Real-time subscription for availability updates
  useEffect(() => {
    if (!selectedPartner) return;

    const channel = supabase
      .channel('booking-availability-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `host_user_id=eq.${selectedPartner.user_id}`
        },
        () => {
          // Refresh available slots when new booking is made
          if (selectedDate) {
            loadAvailableSlots();
          }
          loadAvailableDates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPartner, selectedDate]);

  const handleSelectPartner = (partner: PartnerWithAvailability) => {
    setSelectedPartner(partner);
    setSelectedDate(undefined);
    setSelectedSlot(null);
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
      // Parse local time and convert to ISO string (properly handles timezone offset)
      const localStartDate = parse(`${selectedSlot.date} ${selectedSlot.time}`, 'yyyy-MM-dd HH:mm', new Date());
      const startDateTime = localStartDate.toISOString();
      const endDate = addMinutes(localStartDate, selectedSlot.slot_duration_minutes);
      const endDateTime = endDate.toISOString();

      // Create the event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title: meetingType === 'tripartite' 
            ? 'Spotkanie trójstronne' 
            : 'Konsultacje dla partnerów',
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

      toast({
        title: 'Sukces!',
        description: 'Spotkanie zostało zarezerwowane',
      });

      // Reset to partner selection
      setStep('select-partner');
      setSelectedPartner(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      
      // Reload partners to refresh availability
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
    return availableDates.includes(dateStr) && isAfter(date, startOfDay(new Date()));
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

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
          step === 'select-partner' ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <User className="h-4 w-4" />
          Partner
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
          step === 'select-datetime' ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <CalendarIcon className="h-4 w-4" />
          Termin
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
          step === 'confirm' ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <CheckCircle className="h-4 w-4" />
          Potwierdź
        </div>
      </div>

      {/* Step 1: Select Partner */}
      {step === 'select-partner' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {meetingType === 'tripartite' ? (
                <Users className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
              Wybierz partnera
            </CardTitle>
            <CardDescription>
              Wybierz partnera, z którym chcesz umówić spotkanie
            </CardDescription>
          </CardHeader>
          <CardContent>
            {partners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Brak dostępnych partnerów z aktywnymi terminami</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partners.map(partner => (
                  <button
                    key={partner.user_id}
                    onClick={() => handleSelectPartner(partner)}
                    className="w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {(partner.first_name?.[0] || '') + (partner.last_name?.[0] || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {partner.first_name} {partner.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{partner.email}</p>
                    </div>
                    {partner.zoom_link && (
                      <Badge variant="secondary" className="gap-1">
                        <Video className="h-3 w-3" />
                        Zoom
                      </Badge>
                    )}
                    <ChevronLeft className="h-5 w-5 rotate-180 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Date & Time */}
      {step === 'select-datetime' && selectedPartner && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Wybierz termin
                </CardTitle>
                <CardDescription>
                  Spotkanie z: {selectedPartner.first_name} {selectedPartner.last_name}
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
                  locale={pl}
                  disabled={(date) => !isDateAvailable(date)}
                  modifiers={{
                    available: (date) => isDateAvailable(date),
                  }}
                  modifiersStyles={{
                    available: { fontWeight: 'bold' },
                  }}
                  className="rounded-md border"
                />
              </div>

              {/* Time slots */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {selectedDate 
                    ? `Dostępne godziny - ${format(selectedDate, 'd MMMM', { locale: pl })}`
                    : 'Wybierz datę, aby zobaczyć godziny'
                  }
                </h4>
                
                {!selectedDate ? (
                  <p className="text-sm text-muted-foreground">
                    Kliknij na podświetloną datę w kalendarzu
                  </p>
                ) : loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Brak dostępnych godzin w tym dniu
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map(slot => (
                      <Button
                        key={`${slot.date}-${slot.time}`}
                        variant="outline"
                        className="justify-start"
                        onClick={() => handleSelectSlot(slot)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {slot.time}
                        <span className="text-xs text-muted-foreground ml-auto">
                          ({slot.slot_duration_minutes} min)
                        </span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && selectedPartner && selectedSlot && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Potwierdź rezerwację
                </CardTitle>
                <CardDescription>
                  Sprawdź szczegóły spotkania przed zatwierdzeniem
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
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

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Typ spotkania</p>
                  <p className="font-medium">
                    {meetingType === 'tripartite' ? 'Spotkanie trójstronne' : 'Konsultacje dla partnerów'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(parse(selectedSlot.date, 'yyyy-MM-dd', new Date()), 'd MMMM yyyy', { locale: pl })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Godzina</p>
                  <p className="font-medium">{selectedSlot.time}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Czas trwania</p>
                  <p className="font-medium">{selectedSlot.slot_duration_minutes} minut</p>
                </div>
              </div>

              {selectedPartner.zoom_link && (
                <div className="flex items-center gap-2 text-sm pt-2 border-t">
                  <Video className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Link do spotkania zostanie udostępniony w kalendarzu</span>
                </div>
              )}
            </div>

            <Button 
              onClick={handleBookMeeting} 
              disabled={booking}
              className="w-full"
              size="lg"
            >
              {booking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Zarezerwuj spotkanie
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PartnerMeetingBooking;
