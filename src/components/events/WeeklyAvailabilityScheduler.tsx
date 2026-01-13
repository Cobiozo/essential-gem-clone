import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, UserRound, Clock, Video, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay, addMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface TimeSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

interface WeeklyAvailabilitySchedulerProps {
  meetingType: 'tripartite' | 'consultation';
  slotDuration: number;
  hostName: string;
  description: string;
  zoomLink: string;
  initialSlots: TimeSlot[];
  onSlotsChange: (slots: TimeSlot[]) => void;
}

const TIMEZONE = '(GMT+01:00) Czas środkowoeuropejski – Warszawa';

export const WeeklyAvailabilityScheduler: React.FC<WeeklyAvailabilitySchedulerProps> = ({
  meetingType,
  slotDuration,
  hostName,
  description,
  zoomLink,
  initialSlots,
  onSlotsChange,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [show24Hours, setShow24Hours] = useState(true);
  const [enabledSlots, setEnabledSlots] = useState<Set<string>>(
    new Set(initialSlots.map(s => `${s.date}_${s.time}`))
  );

  // Maximum date allowed (1 month from today)
  const maxDate = useMemo(() => addMonths(new Date(), 1), []);

  // Generate time slots based on duration
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const startHour = show24Hours ? 0 : 8;
    const endHour = show24Hours ? 24 : 20;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        if (hour === endHour - 1 && minute + slotDuration > 60) break;
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, [slotDuration, show24Hours]);

  // Get days of current week
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    });
  }, [weekStart]);

  // Navigate weeks
  const goToPreviousWeek = useCallback(() => {
    const newStart = addDays(weekStart, -7);
    if (!isBefore(newStart, startOfDay(new Date()))) {
      setWeekStart(newStart);
    }
  }, [weekStart]);

  const goToNextWeek = useCallback(() => {
    const newStart = addDays(weekStart, 7);
    if (isBefore(newStart, maxDate)) {
      setWeekStart(newStart);
    }
  }, [weekStart, maxDate]);

  const goToToday = useCallback(() => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
    setSelectedDate(new Date());
  }, []);

  // Toggle a slot
  const toggleSlot = useCallback((date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${dateStr}_${time}`;
    
    setEnabledSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      
      // Convert to array and call onSlotsChange
      const slotsArray: TimeSlot[] = Array.from(next).map(k => {
        const [d, t] = k.split('_');
        return { date: d, time: t };
      });
      onSlotsChange(slotsArray);
      
      return next;
    });
  }, [onSlotsChange]);

  // Check if a slot is enabled
  const isSlotEnabled = useCallback((date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return enabledSlots.has(`${dateStr}_${time}`);
  }, [enabledSlots]);

  // Check if a day is in the past or too far in future
  const isDayDisabled = useCallback((date: Date) => {
    const today = startOfDay(new Date());
    return isBefore(date, today) || !isBefore(date, maxDate);
  }, [maxDate]);

  // Get days that have enabled slots (for calendar modifiers)
  const daysWithSlots = useMemo(() => {
    const days: Date[] = [];
    enabledSlots.forEach(key => {
      const [dateStr] = key.split('_');
      const date = new Date(dateStr);
      if (!days.some(d => isSameDay(d, date))) {
        days.push(date);
      }
    });
    return days;
  }, [enabledSlots]);

  // Handle calendar date selection
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setWeekStart(startOfWeek(date, { weekStartsOn: 0 }));
    }
  }, []);

  const getDayName = (date: Date) => {
    return format(date, 'EEEE', { locale: pl });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PL';
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Left Panel - Host info & Calendar */}
      <div className="w-full xl:w-80 space-y-4 shrink-0">
        {/* Host Info Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(hostName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{hostName || 'Partner'}</span>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">
                {meetingType === 'tripartite' ? 'Spotkanie trójstronne' : 'Konsultacje dla partnerów'}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                {meetingType === 'tripartite' ? (
                  <Users className="h-4 w-4" />
                ) : (
                  <UserRound className="h-4 w-4" />
                )}
                <span>Jeden na jednego</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{slotDuration} minut</span>
              </div>
              {zoomLink && (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  <span>Spotkanie na Zoomie</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Calendar */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">
                {format(selectedDate, 'LLLL yyyy', { locale: pl })}
              </span>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={goToToday}
                  className="text-xs h-7 px-2"
                >
                  Dzisiaj
                </Button>
              </div>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              locale={pl}
              disabled={(date) => isDayDisabled(date)}
              modifiers={{
                hasSlots: daysWithSlots,
              }}
              modifiersStyles={{
                hasSlots: {
                  fontWeight: 'bold',
                  color: 'hsl(var(--primary))',
                },
              }}
              className="w-full"
            />
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Week Grid */}
      <div className="flex-1 min-w-0">
        {/* Header with timezone and controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>{TIMEZONE}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch 
                checked={show24Hours} 
                onCheckedChange={setShow24Hours}
                id="24h-toggle"
              />
              <label htmlFor="24h-toggle" className="text-sm cursor-pointer">
                24 godziny
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={!show24Hours} 
                onCheckedChange={(v) => setShow24Hours(!v)}
                id="work-week-toggle"
              />
              <label htmlFor="work-week-toggle" className="text-sm cursor-pointer">
                Tydzień pracy
              </label>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousWeek}
            disabled={isBefore(addDays(weekStart, -1), startOfDay(new Date()))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextWeek}
            disabled={!isBefore(addDays(weekStart, 7), maxDate)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Week Grid */}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {/* Day Headers */}
            {weekDays.map((day) => (
              <div 
                key={day.toISOString()} 
                className="text-center pb-2 border-b"
              >
                <div className="text-sm text-muted-foreground capitalize">
                  {getDayName(day)}
                </div>
                <div className={cn(
                  "text-lg font-bold mt-1",
                  isToday(day) && "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}

            {/* Time Slots for each day */}
            {weekDays.map((day) => {
              const disabled = isDayDisabled(day);
              
              return (
                <div key={day.toISOString()} className="space-y-1">
                  {disabled ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      Brak dostępności
                    </div>
                  ) : (
                    timeSlots.map((time) => {
                      const enabled = isSlotEnabled(day, time);
                      return (
                        <Button
                          key={`${day.toISOString()}_${time}`}
                          variant={enabled ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "w-full text-xs h-8",
                            enabled && "bg-primary hover:bg-primary/90"
                          )}
                          onClick={() => toggleSlot(day, time)}
                        >
                          {time}
                        </Button>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyAvailabilityScheduler;
