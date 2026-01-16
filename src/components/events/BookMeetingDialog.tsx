import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { Clock, User, Video, CalendarIcon, Loader2 } from 'lucide-react';
import type { MeetingTopic, LeaderAvailability, EventsSettings, TopicWithLeader } from '@/types/events';

interface BookMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface AvailabilitySlot {
  time: string;
  available: boolean;
}

export const BookMeetingDialog: React.FC<BookMeetingDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const dateLocale = language === 'pl' ? pl : enUS;

  // State
  const [step, setStep] = useState<'topic' | 'date' | 'time' | 'confirm'>('topic');
  const [topics, setTopics] = useState<TopicWithLeader[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithLeader | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<LeaderAvailability[]>([]);
  const [settings, setSettings] = useState<EventsSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load topics and settings
  useEffect(() => {
    if (open) {
      loadTopics();
      loadSettings();
      setStep('topic');
      setSelectedTopic(null);
      setSelectedDate(undefined);
      setSelectedTime(null);
    }
  }, [open]);

  // Load availability when topic and date change
  useEffect(() => {
    if (selectedTopic && selectedDate) {
      loadAvailability();
    }
  }, [selectedTopic, selectedDate]);

  const loadTopics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leader_meeting_topics')
      .select('*')
      .eq('is_active', true)
      .order('title');
    
    if (!error && data) {
      // Fetch leader profiles
      const topicsWithLeaders: TopicWithLeader[] = [];
      for (const topic of data) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', topic.leader_user_id)
          .single();
        
        topicsWithLeaders.push({
          ...topic,
          leader: profile || undefined
        });
      }
      setTopics(topicsWithLeaders);
    }
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from('events_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    setSettings(data);
  };

  const loadAvailability = async () => {
    if (!selectedTopic || !selectedDate) return;
    
    const dayOfWeek = selectedDate.getDay();
    
    const { data } = await supabase
      .from('leader_availability')
      .select('*')
      .eq('leader_user_id', selectedTopic.leader_user_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);
    
    setAvailability(data || []);
  };

  const getAvailableSlots = (): AvailabilitySlot[] => {
    if (!availability.length || !selectedDate || !selectedTopic) return [];
    
    const slots: AvailabilitySlot[] = [];
    const duration = selectedTopic.duration_minutes || 30;
    const today = new Date();
    const minNotice = settings?.reminder_hours_before || 24;
    
    availability.forEach((avail) => {
      const startHour = parseInt(avail.start_time.split(':')[0]);
      const startMin = parseInt(avail.start_time.split(':')[1]);
      const endHour = parseInt(avail.end_time.split(':')[0]);
      const endMin = parseInt(avail.end_time.split(':')[1]);
      
      let currentHour = startHour;
      let currentMin = startMin;
      
      while (currentHour < endHour || (currentHour === endHour && currentMin + duration <= endMin)) {
        const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
        
        // Check if slot is in the future with minimum notice
        const slotDate = new Date(selectedDate);
        slotDate.setHours(currentHour, currentMin, 0, 0);
        const hoursUntilSlot = (slotDate.getTime() - today.getTime()) / (1000 * 60 * 60);
        
        slots.push({
          time: timeStr,
          available: hoursUntilSlot >= minNotice,
        });
        
        currentMin += 30; // 30-minute increments
        if (currentMin >= 60) {
          currentHour++;
          currentMin -= 60;
        }
      }
    });
    
    return slots;
  };

  const handleBook = async () => {
    if (!user || !selectedTopic || !selectedDate || !selectedTime) return;
    
    setSubmitting(true);
    
    try {
      // Create event timestamps
      const startDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + (selectedTopic.duration_minutes || 30));
      
      // Check if slot is still available (prevent double booking)
      const { data: existingEvent } = await supabase
        .from('events')
        .select('id')
        .eq('host_user_id', selectedTopic.leader_user_id)
        .gte('start_time', startDateTime.toISOString())
        .lt('start_time', endDateTime.toISOString())
        .eq('is_active', true)
        .maybeSingle();

      if (existingEvent) {
        toast({
          title: t('toast.error'),
          description: 'Ten termin został właśnie zarezerwowany. Wybierz inny.',
          variant: 'destructive',
        });
        setStep('time');
        setSelectedTime(null);
        await loadAvailability();
        return;
      }
      
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title: selectedTopic.title,
          description: selectedTopic.description,
          event_type: 'private_meeting',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          host_user_id: selectedTopic.leader_user_id,
          meeting_topic_id: selectedTopic.id,
          requires_registration: false,
          max_participants: 2,
          created_by: user.id,
          visible_to_partners: false,
          visible_to_specjalista: false,
          visible_to_clients: false,
          visible_to_everyone: false,
        })
        .select()
        .single();
      
      if (eventError) throw eventError;
      
      // Register user for the event
      const { error: regError } = await supabase
        .from('event_registrations')
        .insert({
          event_id: event.id,
          user_id: user.id,
          status: 'registered',
        });
      
      if (regError) throw regError;

      // Also register the host as participant
      await supabase
        .from('event_registrations')
        .insert({
          event_id: event.id,
          user_id: selectedTopic.leader_user_id,
          status: 'registered',
        });
      
      toast({
        title: t('toast.success'),
        description: t('events.meetingBooked'),
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error booking meeting:', error);
      toast({
        title: t('toast.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const minDate = startOfDay(addDays(new Date(), 1));
  const maxDate = addDays(new Date(), 30);

  const slots = getAvailableSlots();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('events.bookMeeting')}</DialogTitle>
          <DialogDescription>
            {step === 'topic' && t('events.selectTopicDescription')}
            {step === 'date' && t('events.selectDateDescription')}
            {step === 'time' && t('events.selectTimeDescription')}
            {step === 'confirm' && t('events.confirmBookingDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step 1: Select Topic */}
          {step === 'topic' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {topics.map((topic) => (
                    <div
                      key={topic.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedTopic?.id === topic.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{topic.title}</h4>
                          {topic.description && (
                            <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          {topic.duration_minutes} min
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        {topic.leader?.first_name} {topic.leader?.last_name}
                      </div>
                    </div>
                  ))}
                  {topics.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {t('events.noTopicsAvailable')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Date */}
          {step === 'date' && selectedTopic && (
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={dateLocale}
                disabled={(date) => isBefore(date, minDate) || date > maxDate}
                className="rounded-md border"
              />
            </div>
          )}

          {/* Step 3: Select Time */}
          {step === 'time' && selectedDate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, 'PPP', { locale: dateLocale })}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {slots.length > 0 ? (
                  slots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? 'default' : 'outline'}
                      size="sm"
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                    >
                      {slot.time}
                    </Button>
                  ))
                ) : (
                  <p className="col-span-3 text-center text-muted-foreground py-8">
                    {t('events.noSlotsAvailable')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && selectedTopic && selectedDate && selectedTime && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/50">
                <h4 className="font-medium mb-3">{t('events.bookingSummary')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedTopic.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedTopic.leader?.first_name} {selectedTopic.leader?.last_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{format(selectedDate, 'PPP', { locale: dateLocale })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedTime} ({selectedTopic.duration_minutes} min)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step !== 'topic' && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === 'date') setStep('topic');
                if (step === 'time') setStep('date');
                if (step === 'confirm') setStep('time');
              }}
            >
              {t('common.back')}
            </Button>
          )}
          
          {step === 'topic' && (
            <Button
              onClick={() => setStep('date')}
              disabled={!selectedTopic}
            >
              {t('common.next')}
            </Button>
          )}
          
          {step === 'date' && (
            <Button
              onClick={() => setStep('time')}
              disabled={!selectedDate}
            >
              {t('common.next')}
            </Button>
          )}
          
          {step === 'time' && (
            <Button
              onClick={() => setStep('confirm')}
              disabled={!selectedTime}
            >
              {t('common.next')}
            </Button>
          )}
          
          {step === 'confirm' && (
            <Button onClick={handleBook} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('events.confirmBooking')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookMeetingDialog;
