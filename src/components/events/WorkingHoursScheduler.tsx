import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Clock, Save, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeRange {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  ranges: TimeRange[];
}

export interface WeeklySchedule {
  [dayOfWeek: number]: DaySchedule;
}

interface WorkingHoursSchedulerProps {
  initialSchedule?: WeeklySchedule;
  onScheduleChange: (schedule: WeeklySchedule) => void;
  slotDuration: number;
  isSaving?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Nd', fullLabel: 'Niedziela' },
  { value: 1, label: 'Pn', fullLabel: 'Poniedziałek' },
  { value: 2, label: 'Wt', fullLabel: 'Wtorek' },
  { value: 3, label: 'Śr', fullLabel: 'Środa' },
  { value: 4, label: 'Cz', fullLabel: 'Czwartek' },
  { value: 5, label: 'Pt', fullLabel: 'Piątek' },
  { value: 6, label: 'Sb', fullLabel: 'Sobota' },
];

const DEFAULT_RANGE: TimeRange = { start: '09:00', end: '17:00' };

const getDefaultSchedule = (): WeeklySchedule => ({
  0: { enabled: false, ranges: [{ ...DEFAULT_RANGE }] },
  1: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
  2: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
  3: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
  4: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
  5: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
  6: { enabled: false, ranges: [{ ...DEFAULT_RANGE }] },
});

export const WorkingHoursScheduler: React.FC<WorkingHoursSchedulerProps> = ({
  initialSchedule,
  onScheduleChange,
  slotDuration,
  isSaving = false,
}) => {
  const [schedule, setSchedule] = useState<WeeklySchedule>(initialSchedule || getDefaultSchedule());
  const [useSameHours, setUseSameHours] = useState(false);
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    if (initialSchedule) {
      setSchedule(initialSchedule);
    }
  }, [initialSchedule]);

  const updateSchedule = (newSchedule: WeeklySchedule) => {
    setSchedule(newSchedule);
    onScheduleChange(newSchedule);
  };

  const toggleDay = (dayOfWeek: number) => {
    const newSchedule = { ...schedule };
    newSchedule[dayOfWeek] = {
      ...newSchedule[dayOfWeek],
      enabled: !newSchedule[dayOfWeek].enabled,
    };
    updateSchedule(newSchedule);
  };

  const updateTimeRange = (dayOfWeek: number, rangeIndex: number, field: 'start' | 'end', value: string) => {
    const newSchedule = { ...schedule };
    newSchedule[dayOfWeek] = {
      ...newSchedule[dayOfWeek],
      ranges: newSchedule[dayOfWeek].ranges.map((range, idx) =>
        idx === rangeIndex ? { ...range, [field]: value } : range
      ),
    };

    // If "use same hours" is enabled, apply to all enabled days
    if (useSameHours) {
      const updatedRange = newSchedule[dayOfWeek].ranges[rangeIndex];
      DAYS_OF_WEEK.forEach(({ value: day }) => {
        if (newSchedule[day].enabled && day !== dayOfWeek) {
          newSchedule[day].ranges = newSchedule[day].ranges.map((range, idx) =>
            idx === rangeIndex ? { ...updatedRange } : range
          );
        }
      });
    }

    updateSchedule(newSchedule);
  };

  const addTimeRange = (dayOfWeek: number) => {
    const newSchedule = { ...schedule };
    const lastRange = newSchedule[dayOfWeek].ranges[newSchedule[dayOfWeek].ranges.length - 1];
    const newStart = lastRange ? lastRange.end : '14:00';
    newSchedule[dayOfWeek] = {
      ...newSchedule[dayOfWeek],
      ranges: [...newSchedule[dayOfWeek].ranges, { start: newStart, end: '18:00' }],
    };
    updateSchedule(newSchedule);
  };

  const removeTimeRange = (dayOfWeek: number, rangeIndex: number) => {
    const newSchedule = { ...schedule };
    if (newSchedule[dayOfWeek].ranges.length > 1) {
      newSchedule[dayOfWeek] = {
        ...newSchedule[dayOfWeek],
        ranges: newSchedule[dayOfWeek].ranges.filter((_, idx) => idx !== rangeIndex),
      };
      updateSchedule(newSchedule);
    }
  };

  const handleUseSameHoursChange = (checked: boolean) => {
    setUseSameHours(checked);
    if (checked) {
      // Find first enabled day and copy its schedule to all enabled days
      const firstEnabledDay = DAYS_OF_WEEK.find(({ value }) => schedule[value].enabled);
      if (firstEnabledDay) {
        const templateRanges = schedule[firstEnabledDay.value].ranges;
        const newSchedule = { ...schedule };
        DAYS_OF_WEEK.forEach(({ value }) => {
          if (newSchedule[value].enabled) {
            newSchedule[value].ranges = templateRanges.map(r => ({ ...r }));
          }
        });
        updateSchedule(newSchedule);
      }
    }
  };

  const countGeneratedSlots = (ranges: TimeRange[]): number => {
    let count = 0;
    ranges.forEach(range => {
      const [startH, startM] = range.start.split(':').map(Number);
      const [endH, endM] = range.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      count += Math.floor((endMinutes - startMinutes) / slotDuration);
    });
    return count;
  };

  const enabledDaysCount = DAYS_OF_WEEK.filter(({ value }) => schedule[value].enabled).length;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Godziny pracy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Day toggles */}
        <div className="flex flex-wrap gap-2 justify-center">
          {DAYS_OF_WEEK.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleDay(value)}
              className={cn(
                'w-10 h-10 rounded-full text-sm font-medium transition-all',
                schedule[value].enabled
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Use same hours checkbox */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="same-hours"
            checked={useSameHours}
            onCheckedChange={handleUseSameHoursChange}
          />
          <Label htmlFor="same-hours" className="text-sm cursor-pointer">
            Użyj tych samych godzin dla wszystkich dni
          </Label>
        </div>

        {/* Timezone display */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-4">
          <Globe className="h-4 w-4" />
          <span>{timezone}</span>
        </div>

        {/* Day schedules */}
        <div className="space-y-4">
          {DAYS_OF_WEEK.filter(({ value }) => schedule[value].enabled).map(({ value: dayOfWeek, fullLabel }) => (
            <div key={dayOfWeek} className="space-y-2">
              <Label className="font-medium">{fullLabel}</Label>
              {schedule[dayOfWeek].ranges.map((range, rangeIndex) => (
                <div key={rangeIndex} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={range.start}
                    onChange={(e) => updateTimeRange(dayOfWeek, rangeIndex, 'start', e.target.value)}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">—</span>
                  <Input
                    type="time"
                    value={range.end}
                    onChange={(e) => updateTimeRange(dayOfWeek, rangeIndex, 'end', e.target.value)}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => addTimeRange(dayOfWeek)}
                    className="h-8 w-8"
                    title="Dodaj zakres"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  {schedule[dayOfWeek].ranges.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTimeRange(dayOfWeek, rangeIndex)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Usuń zakres"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {countGeneratedSlots([range])} slotów
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {enabledDaysCount === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">
            Wybierz dni tygodnia, w które jesteś dostępny/a
          </p>
        )}

        {/* Summary */}
        {enabledDaysCount > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="font-medium mb-1">Podsumowanie:</p>
            <p className="text-muted-foreground">
              Dostępność: {enabledDaysCount} dni w tygodniu
              {slotDuration && ` • Czas trwania spotkania: ${slotDuration} min`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkingHoursScheduler;
