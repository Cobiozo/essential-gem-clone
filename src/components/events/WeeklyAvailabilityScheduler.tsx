import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Users, 
  UserRound, 
  Clock, 
  Video, 
  Sunrise, 
  Sun, 
  Moon,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { format, isSameDay, isBefore, startOfDay, addMonths, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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

interface TimeSection {
  id: string;
  label: string;
  icon: React.ElementType;
  startHour: number;
  endHour: number;
}

const TIME_SECTIONS: TimeSection[] = [
  { id: 'morning', label: 'Rano', icon: Sunrise, startHour: 6, endHour: 12 },
  { id: 'afternoon', label: 'Popołudnie', icon: Sun, startHour: 12, endHour: 17 },
  { id: 'evening', label: 'Wieczór', icon: Moon, startHour: 17, endHour: 21 },
];

const EXTENDED_SECTION: TimeSection = {
  id: 'night',
  label: 'Nocne godziny',
  icon: Moon,
  startHour: 21,
  endHour: 24,
};

export const WeeklyAvailabilityScheduler: React.FC<WeeklyAvailabilitySchedulerProps> = ({
  meetingType,
  slotDuration,
  hostName,
  description,
  zoomLink,
  initialSlots,
  onSlotsChange,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [enabledSlots, setEnabledSlots] = useState<Set<string>>(
    new Set(initialSlots.map(s => `${s.date}_${s.time}`))
  );
  const [showExtendedHours, setShowExtendedHours] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);

  const today = startOfDay(new Date());
  const maxDate = addMonths(today, 2);

  // Sync with initial slots
  useEffect(() => {
    setEnabledSlots(new Set(initialSlots.map(s => `${s.date}_${s.time}`)));
  }, [initialSlots]);

  // Generate time slots for a section
  const generateTimeSlots = useCallback((section: TimeSection): string[] => {
    const slots: string[] = [];
    for (let hour = section.startHour; hour < section.endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    return slots;
  }, [slotDuration]);

  // Check if a slot is enabled
  const isSlotEnabled = useCallback((date: Date, time: string): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return enabledSlots.has(`${dateStr}_${time}`);
  }, [enabledSlots]);

  // Check for conflicts with global events
  const checkConflict = useCallback(async (date: Date, time: string): Promise<{hasConflict: boolean, eventTitle?: string}> => {
    if (!user) return { hasConflict: false };
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const { data: globalEvents } = await supabase
      .from('events')
      .select('id, title, start_time, event_type')
      .in('event_type', ['webinar', 'spotkanie_zespolu', 'team_training'])
      .gte('start_time', `${dateStr}T${time}:00`)
      .lt('start_time', `${dateStr}T${time}:59`)
      .eq('is_active', true);

    if (globalEvents && globalEvents.length > 0) {
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id)
        .in('event_id', globalEvents.map(e => e.id));

      if (registrations && registrations.length > 0) {
        const conflictingEvent = globalEvents.find(e => 
          registrations.some(r => r.event_id === e.id)
        );
        if (conflictingEvent) {
          return { 
            hasConflict: true, 
            eventTitle: `${conflictingEvent.title} (${format(new Date(conflictingEvent.start_time), 'dd.MM.yyyy HH:mm')})` 
          };
        }
      }
    }

    return { hasConflict: false };
  }, [user]);

  // Toggle a slot with conflict checking
  const toggleSlot = useCallback(async (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${dateStr}_${time}`;
    
    if (!enabledSlots.has(key)) {
      const conflict = await checkConflict(date, time);
      if (conflict.hasConflict) {
        toast({
          title: 'Kolizja z wydarzeniem',
          description: `Godzina ${time} koliduje z: ${conflict.eventTitle}`,
          variant: 'destructive',
        });
        return;
      }
    }
    
    setEnabledSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      
      const slotsArray: TimeSlot[] = Array.from(next).map(k => {
        const [d, t] = k.split('_');
        return { date: d, time: t };
      });
      onSlotsChange(slotsArray);
      
      return next;
    });
  }, [onSlotsChange, enabledSlots, checkConflict, toast]);

  // Select/deselect all slots for the selected date
  const toggleAllSlotsForDate = useCallback((selectAll: boolean) => {
    if (!selectedDate) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const allSections = showExtendedHours ? [...TIME_SECTIONS, EXTENDED_SECTION] : TIME_SECTIONS;
    
    setEnabledSlots(prev => {
      const newSet = new Set(prev);
      
      allSections.forEach(section => {
        const timeSlots = generateTimeSlots(section);
        timeSlots.forEach(time => {
          const key = `${dateStr}_${time}`;
          if (selectAll) {
            newSet.add(key);
          } else {
            newSet.delete(key);
          }
        });
      });
      
      const slotsArray: TimeSlot[] = Array.from(newSet).map(k => {
        const [d, t] = k.split('_');
        return { date: d, time: t };
      });
      onSlotsChange(slotsArray);
      
      return newSet;
    });
  }, [selectedDate, showExtendedHours, generateTimeSlots, onSlotsChange]);

  // Get days with availability for calendar highlighting
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

  // Count slots for selected date
  const selectedDateSlotsCount = useMemo(() => {
    if (!selectedDate) return 0;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    let count = 0;
    enabledSlots.forEach(key => {
      if (key.startsWith(dateStr)) count++;
    });
    return count;
  }, [selectedDate, enabledSlots]);

  // Group slots by date for summary
  const slotsByDate = useMemo(() => {
    const grouped = new Map<string, string[]>();
    enabledSlots.forEach(key => {
      const [date, time] = key.split('_');
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(time);
    });
    grouped.forEach((times) => {
      times.sort();
    });
    return grouped;
  }, [enabledSlots]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PL';
  };

  const formatDateForDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'EEEE, d MMM', { locale: pl });
  };

  const isDayDisabled = useCallback((date: Date) => {
    return isBefore(date, today) || !isBefore(date, maxDate);
  }, [today, maxDate]);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="text-center pb-2">
        <h2 className="text-lg font-semibold text-foreground">Harmonogram dostępności</h2>
        <p className="text-sm text-muted-foreground">
          Wybierz dzień z kalendarza, aby ustawić dostępne godziny
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Host Info & Calendar */}
        <Card className="h-fit">
          <CardContent className="p-4 space-y-4">
            {/* Host Info */}
            <div className="flex items-center gap-3 pb-3 border-b">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(hostName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate">{hostName || 'Partner'}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {meetingType === 'tripartite' ? 'Spotkanie trójstronne' : 'Konsultacje dla partnerów'}
                </p>
              </div>
            </div>

            {/* Meeting Details */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                {meetingType === 'tripartite' ? (
                  <Users className="h-3 w-3" />
                ) : (
                  <UserRound className="h-3 w-3" />
                )}
                1:1
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {slotDuration} min
              </Badge>
              {zoomLink && (
                <Badge variant="secondary" className="gap-1">
                  <Video className="h-3 w-3" />
                  Zoom
                </Badge>
              )}
            </div>

            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}

            {/* Calendar */}
            <div className="flex justify-center pt-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDayDisabled}
                locale={pl}
                className="rounded-md border pointer-events-auto"
                modifiers={{
                  hasSlots: daysWithSlots,
                }}
                modifiersStyles={{
                  hasSlots: {
                    fontWeight: 'bold',
                    backgroundColor: 'hsl(var(--primary) / 0.15)',
                    color: 'hsl(var(--primary))',
                  }
                }}
              />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary/15" />
                <span>Dni z dostępnością</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Time Slots */}
        <Card className="h-fit">
          <CardContent className="p-4">
            {selectedDate ? (
              <div className="space-y-4">
                {/* Selected Date Header */}
                <div className="flex items-center justify-between pb-3 border-b">
                  <div>
                    <h3 className="font-medium text-foreground capitalize">
                      {format(selectedDate, 'EEEE', { locale: pl })}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedDate, 'd MMMM yyyy', { locale: pl })}
                    </p>
                  </div>
                  {selectedDateSlotsCount > 0 && (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      {selectedDateSlotsCount} {selectedDateSlotsCount === 1 ? 'termin' : 'terminów'}
                    </Badge>
                  )}
                </div>

                {/* Time Sections */}
                <ScrollArea className="h-[380px] pr-4">
                  <div className="space-y-4">
                    {TIME_SECTIONS.map(section => {
                      const Icon = section.icon;
                      const timeSlots = generateTimeSlots(section);
                      
                      return (
                        <div key={section.id} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Icon className="h-4 w-4" />
                            <span>{section.label}</span>
                            <span className="text-xs">({section.startHour}:00 - {section.endHour}:00)</span>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                            {timeSlots.map(time => {
                              const isEnabled = isSlotEnabled(selectedDate, time);
                              return (
                                <Button
                                  key={time}
                                  variant={isEnabled ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleSlot(selectedDate, time)}
                                  className={cn(
                                    "h-9 text-sm font-medium transition-all",
                                    isEnabled && "bg-primary text-primary-foreground hover:bg-primary/90"
                                  )}
                                >
                                  {time}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Extended Hours (collapsible) */}
                    <Collapsible open={showExtendedHours} onOpenChange={setShowExtendedHours}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
                          {showExtendedHours ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {showExtendedHours ? 'Ukryj' : 'Pokaż'} nocne godziny (21:00 - 24:00)
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Moon className="h-4 w-4" />
                            <span>Noc</span>
                            <span className="text-xs">(21:00 - 24:00)</span>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                            {generateTimeSlots(EXTENDED_SECTION).map(time => {
                              const isEnabled = isSlotEnabled(selectedDate, time);
                              return (
                                <Button
                                  key={time}
                                  variant={isEnabled ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleSlot(selectedDate, time)}
                                  className={cn(
                                    "h-9 text-sm font-medium transition-all",
                                    isEnabled && "bg-primary text-primary-foreground hover:bg-primary/90"
                                  )}
                                >
                                  {time}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </ScrollArea>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllSlotsForDate(true)}
                    className="flex-1 gap-1"
                  >
                    <Check className="h-4 w-4" />
                    Zaznacz wszystkie
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllSlotsForDate(false)}
                    className="flex-1 gap-1"
                  >
                    <X className="h-4 w-4" />
                    Odznacz wszystkie
                  </Button>
                </div>
              </div>
            ) : (
              /* No Date Selected State */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-foreground mb-1">Wybierz dzień</h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                  Kliknij na dzień w kalendarzu po lewej stronie, aby ustawić dostępne godziny
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Section */}
      {slotsByDate.size > 0 && (
        <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Podsumowanie dostępności
                    <Badge variant="secondary">{enabledSlots.size} terminów</Badge>
                  </CardTitle>
                  {summaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {Array.from(slotsByDate.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([dateStr, times]) => (
                      <div key={dateStr} className="flex items-start gap-2 text-sm">
                        <Badge variant="outline" className="shrink-0 capitalize">
                          {formatDateForDisplay(dateStr)}
                        </Badge>
                        <span className="text-muted-foreground">
                          {times.slice(0, 6).join(', ')}
                          {times.length > 6 && ` +${times.length - 6} więcej`}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};

export default WeeklyAvailabilityScheduler;
