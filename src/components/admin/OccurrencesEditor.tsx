import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trash2, Plus, Copy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { EventOccurrence } from '@/types/occurrences';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OccurrencesEditorProps {
  occurrences: EventOccurrence[];
  onChange: (occurrences: EventOccurrence[]) => void;
  defaultDuration?: number;
}

const durationOptions = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '120 min' },
  { value: 180, label: '180 min' },
];

export const OccurrencesEditor: React.FC<OccurrencesEditorProps> = ({
  occurrences,
  onChange,
  defaultDuration = 60,
}) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [newDuration, setNewDuration] = useState(defaultDuration);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);

  const isPastOccurrence = (date: string, time: string, duration: number) => {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const endTime = new Date(year, month - 1, day, hours, minutes);
    endTime.setMinutes(endTime.getMinutes() + duration);
    return endTime < new Date();
  };

  const handleAddOccurrence = () => {
    if (!newDate) return;
    
    const newOccurrence: EventOccurrence = {
      date: newDate,
      time: newTime,
      duration_minutes: newDuration,
    };
    
    // Add and sort by date + time
    const updated = [...occurrences, newOccurrence].sort((a, b) => {
      const dateTimeA = `${a.date}T${a.time}`;
      const dateTimeB = `${b.date}T${b.time}`;
      return dateTimeA.localeCompare(dateTimeB);
    });
    
    onChange(updated);
    setNewDate('');
  };

  const handleRemoveOccurrence = (index: number) => {
    const occ = occurrences[index];
    const isPast = isPastOccurrence(occ.date, occ.time, occ.duration_minutes);
    
    if (isPast) {
      // Past occurrence - delete without confirmation
      const updated = occurrences.filter((_, i) => i !== index);
      onChange(updated);
    } else {
      // Future occurrence - show confirmation dialog
      setPendingDeleteIndex(index);
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (pendingDeleteIndex !== null) {
      const updated = occurrences.filter((_, i) => i !== pendingDeleteIndex);
      onChange(updated);
    }
    setDeleteDialogOpen(false);
    setPendingDeleteIndex(null);
  };

  const handleRemoveAllPast = () => {
    const updated = occurrences.filter(occ => 
      !isPastOccurrence(occ.date, occ.time, occ.duration_minutes)
    );
    onChange(updated);
  };

  const hasPastOccurrences = occurrences.some(occ => 
    isPastOccurrence(occ.date, occ.time, occ.duration_minutes)
  );

  const handleDuplicateOccurrence = (occ: EventOccurrence) => {
    // Set form to same values for easy duplication with different date
    setNewTime(occ.time);
    setNewDuration(occ.duration_minutes);
  };

  const formatOccurrenceDate = (date: string) => {
    try {
      const parsed = parseISO(date);
      return format(parsed, 'EEEE, d MMMM yyyy', { locale: pl });
    } catch {
      return date;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-primary font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Terminy spotkania
        </Label>
        <div className="flex items-center gap-2">
          {hasPastOccurrences && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveAllPast}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Usuń zakończone
            </Button>
          )}
          <Badge variant="secondary">{occurrences.length} terminów</Badge>
        </div>
      </div>

      {/* Existing occurrences list */}
      {occurrences.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {occurrences.map((occ, index) => {
            const isPast = isPastOccurrence(occ.date, occ.time, occ.duration_minutes);
            return (
              <div
                key={`${occ.date}-${occ.time}-${index}`}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isPast ? 'bg-muted/50 opacity-60' : 'bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">
                      {formatOccurrenceDate(occ.date)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {occ.time} ({occ.duration_minutes} min)
                      {isPast && (
                        <Badge variant="secondary" className="text-xs">
                          Zakończone
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDuplicateOccurrence(occ)}
                    title="Skopiuj ustawienia"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveOccurrence(index)}
                    title="Usuń termin"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new occurrence form */}
      <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
        <Label className="text-sm font-medium">Dodaj nowy termin</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Data</Label>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Godzina</Label>
            <Input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Czas trwania</Label>
            <Select
              value={newDuration.toString()}
              onValueChange={(v) => setNewDuration(parseInt(v))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddOccurrence}
          disabled={!newDate}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Dodaj termin
        </Button>
      </div>

      {/* Empty state */}
      {occurrences.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Dodaj co najmniej jeden termin spotkania
        </p>
      )}

      {/* Confirmation dialog for deleting future occurrences */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń przyszły termin?</AlertDialogTitle>
            <AlertDialogDescription>
              Ten termin jeszcze się nie odbył. Jeśli są zapisani uczestnicy, 
              ich rejestracje zostaną anulowane. Czy na pewno chcesz usunąć ten termin?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Usuń termin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OccurrencesEditor;
