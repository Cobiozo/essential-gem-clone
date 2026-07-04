import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trash2, Plus, Copy, Video } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { EventOccurrence } from '@/types/occurrences';
import type { LeaderZoomLinkWithOwner } from '@/hooks/useLeaderZoomLinks';
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
  mainZoomLink?: string | null;
  leaderZoomLinks?: LeaderZoomLinkWithOwner[];
}

const durationOptions = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '120 min' },
  { value: 180, label: '180 min' },
];

type LinkMode = 'main' | 'custom' | 'leader';

const getLinkMode = (occ: EventOccurrence): LinkMode => {
  const src = occ.zoom_link_source;
  if (src && typeof src === 'object' && 'leader_user_id' in src) return 'leader';
  if (src === 'custom') return 'custom';
  // Legacy: if zoom_link is set but no source, treat as custom
  if (!src && occ.zoom_link !== null && occ.zoom_link !== undefined) return 'custom';
  return 'main';
};

export const OccurrencesEditor: React.FC<OccurrencesEditorProps> = ({
  occurrences,
  onChange,
  defaultDuration = 60,
  mainZoomLink = null,
  leaderZoomLinks = [],
}) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [newDuration, setNewDuration] = useState(defaultDuration);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);

  const leaderLinksById = useMemo(() => {
    const map = new Map<string, LeaderZoomLinkWithOwner>();
    leaderZoomLinks.forEach(l => map.set(l.id, l));
    return map;
  }, [leaderZoomLinks]);

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
      zoom_link: null,
      zoom_link_source: 'main',
    };
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
      onChange(occurrences.filter((_, i) => i !== index));
    } else {
      setPendingDeleteIndex(index);
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (pendingDeleteIndex !== null) {
      onChange(occurrences.filter((_, i) => i !== pendingDeleteIndex));
    }
    setDeleteDialogOpen(false);
    setPendingDeleteIndex(null);
  };

  const handleRemoveAllPast = () => {
    onChange(occurrences.filter(occ => !isPastOccurrence(occ.date, occ.time, occ.duration_minutes)));
  };

  const hasPastOccurrences = occurrences.some(occ => isPastOccurrence(occ.date, occ.time, occ.duration_minutes));

  const handleDuplicateOccurrence = (occ: EventOccurrence) => {
    setNewTime(occ.time);
    setNewDuration(occ.duration_minutes);
  };

  const formatOccurrenceDate = (date: string) => {
    try {
      return format(parseISO(date), 'EEEE, d MMMM yyyy', { locale: pl });
    } catch {
      return date;
    }
  };

  const updateAt = (index: number, patch: Partial<EventOccurrence>) => {
    onChange(occurrences.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  };

  const handleModeChange = (index: number, mode: LinkMode) => {
    const occ = occurrences[index];
    if (mode === 'main') {
      updateAt(index, { zoom_link: null, zoom_link_source: 'main' });
    } else if (mode === 'custom') {
      const existing = typeof occ.zoom_link === 'string' && getLinkMode(occ) === 'custom' ? occ.zoom_link : '';
      updateAt(index, { zoom_link: existing, zoom_link_source: 'custom' });
    } else {
      // leader — pick first available by default
      const first = leaderZoomLinks[0];
      updateAt(index, {
        zoom_link: first?.zoom_url || '',
        zoom_link_source: first
          ? { leader_user_id: first.user_id, link_id: first.id }
          : null,
      });
    }
  };

  const handlePickLeaderLink = (index: number, linkId: string) => {
    const link = leaderLinksById.get(linkId);
    if (!link) return;
    updateAt(index, {
      zoom_link: link.zoom_url,
      zoom_link_source: { leader_user_id: link.user_id, link_id: link.id },
    });
  };

  return (
    <div className="space-y-4">
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

      {occurrences.length > 0 && (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {occurrences.map((occ, index) => {
            const isPast = isPastOccurrence(occ.date, occ.time, occ.duration_minutes);
            const mode = getLinkMode(occ);
            const leaderSelectedId =
              occ.zoom_link_source && typeof occ.zoom_link_source === 'object'
                ? occ.zoom_link_source.link_id
                : '';

            return (
              <div
                key={`${occ.date}-${occ.time}-${index}`}
                className={`p-3 rounded-lg border ${isPast ? 'bg-muted/50 opacity-60' : 'bg-card'}`}
              >
                <div className="flex items-center justify-between">
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
                          <Badge variant="secondary" className="text-xs">Zakończone</Badge>
                        )}
                        {!isPast && mode === 'custom' && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Video className="h-3 w-3" /> Własny link
                          </Badge>
                        )}
                        {!isPast && mode === 'leader' && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Video className="h-3 w-3" /> Link lidera
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

                {!isPast && (
                  <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                    <Label className="text-xs flex items-center gap-2 text-muted-foreground">
                      <Video className="h-3.5 w-3.5" />
                      Link Zoom dla tego terminu
                    </Label>
                    <Select value={mode} onValueChange={(v) => handleModeChange(index, v as LinkMode)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Główny link wydarzenia</SelectItem>
                        <SelectItem value="custom">Własny link dla tego terminu</SelectItem>
                        <SelectItem value="leader" disabled={leaderZoomLinks.length === 0}>
                          Link lidera z bazy
                          {leaderZoomLinks.length === 0 ? ' (brak dostępnych)' : ''}
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {mode === 'main' && (
                      <p className="text-xs text-muted-foreground">
                        {mainZoomLink
                          ? <>Używa głównego linku wydarzenia: <span className="text-foreground/80 break-all">{mainZoomLink}</span></>
                          : 'Główny link wydarzenia nie jest jeszcze ustawiony.'}
                      </p>
                    )}

                    {mode === 'custom' && (
                      <Input
                        type="url"
                        placeholder="https://zoom.us/j/..."
                        value={occ.zoom_link || ''}
                        onChange={(e) => updateAt(index, { zoom_link: e.target.value, zoom_link_source: 'custom' })}
                        className="h-9 text-sm"
                      />
                    )}

                    {mode === 'leader' && (
                      <>
                        <Select
                          value={leaderSelectedId}
                          onValueChange={(v) => handlePickLeaderLink(index, v)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Wybierz link lidera" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {leaderZoomLinks.map((link) => (
                              <SelectItem key={link.id} value={link.id}>
                                {link.owner_name} — {link.label}
                                {link.is_default ? ' ★' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {occ.zoom_link && (
                          <p className="text-xs text-muted-foreground break-all">
                            {occ.zoom_link}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
            <Select value={newDuration.toString()} onValueChange={(v) => setNewDuration(parseInt(v))}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
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

      {occurrences.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Dodaj co najmniej jeden termin spotkania
        </p>
      )}

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
