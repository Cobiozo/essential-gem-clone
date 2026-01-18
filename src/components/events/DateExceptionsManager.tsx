import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarOff, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface DateException {
  id?: string;
  date: Date;
  reason: string;
}

interface DateExceptionsManagerProps {
  exceptions: DateException[];
  onExceptionsChange: (exceptions: DateException[]) => void;
}

export const DateExceptionsManager: React.FC<DateExceptionsManagerProps> = ({
  exceptions,
  onExceptionsChange,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newReason, setNewReason] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleAddException = () => {
    if (!newDate) return;

    const newException: DateException = {
      date: newDate,
      reason: newReason || 'Niedostępny/a',
    };

    onExceptionsChange([...exceptions, newException]);
    setNewDate(undefined);
    setNewReason('');
    setIsAdding(false);
  };

  const handleRemoveException = (index: number) => {
    onExceptionsChange(exceptions.filter((_, i) => i !== index));
  };

  const sortedExceptions = [...exceptions].sort((a, b) => a.date.getTime() - b.date.getTime());

  const today = startOfDay(new Date());

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarOff className="h-5 w-5" />
          Wyjątki dat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Dodaj konkretne daty, kiedy jesteś niedostępny/a (np. urlop, wyjazd służbowy).
        </p>

        {/* Add new exception */}
        {!isAdding ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj wyjątek
          </Button>
        ) : (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !newDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newDate ? format(newDate, 'd MMMM yyyy', { locale: pl }) : 'Wybierz datę'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newDate}
                    onSelect={(date) => {
                      setNewDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => isBefore(date, today)}
                    locale={pl}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Powód (opcjonalnie)</Label>
              <Input
                placeholder="np. Urlop, Wyjazd służbowy"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewDate(undefined);
                  setNewReason('');
                }}
                className="flex-1"
              >
                Anuluj
              </Button>
              <Button
                type="button"
                onClick={handleAddException}
                disabled={!newDate}
                className="flex-1"
              >
                Dodaj
              </Button>
            </div>
          </div>
        )}

        {/* List of exceptions */}
        {sortedExceptions.length > 0 ? (
          <div className="space-y-2">
            {sortedExceptions.map((exception, index) => {
              const isPast = isBefore(exception.date, today);
              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    isPast ? 'bg-muted/50 opacity-60' : 'bg-background'
                  )}
                >
                  <div>
                    <p className="font-medium">
                      {format(exception.date, 'd MMMM yyyy', { locale: pl })}
                    </p>
                    <p className="text-sm text-muted-foreground">{exception.reason}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveException(index)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4">
            Brak wyjątków - jesteś dostępny/a we wszystkich dniach zgodnie z harmonogramem.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DateExceptionsManager;
