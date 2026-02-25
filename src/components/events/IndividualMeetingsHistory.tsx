import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, History, Users, User, Calendar, Clock, Video, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface MeetingWithDetails {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  zoom_link: string | null;
  description: string | null;
  is_active: boolean;
  booker_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

const parseDescription = (desc: string | null): Record<string, string> => {
  if (!desc) return {};
  try { return JSON.parse(desc); } catch { return {}; }
};

export const IndividualMeetingsHistory: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tripartite' | 'consultation'>('all');
  const [timeRange, setTimeRange] = useState<'1m' | '3m' | '6m' | 'all'>('3m');

  useEffect(() => {
    if (user) loadMeetingHistory();
  }, [user, filter, timeRange]);

  const loadMeetingHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date | null = null;
      switch (timeRange) {
        case '1m': startDate = subMonths(now, 1); break;
        case '3m': startDate = subMonths(now, 3); break;
        case '6m': startDate = subMonths(now, 6); break;
        default: startDate = null;
      }

      // Fetch past meetings OR cancelled meetings (any date)
      let query = supabase
        .from('events')
        .select('id, title, event_type, start_time, end_time, zoom_link, description, is_active, created_by')
        .eq('host_user_id', user.id)
        .in('event_type', ['tripartite_meeting', 'partner_consultation'])
        .order('start_time', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('event_type', filter === 'tripartite' ? 'tripartite_meeting' : 'partner_consultation');
      }

      // We need: (end_time < now) OR (is_active = false)
      // Supabase JS doesn't support OR easily, so we fetch broader and filter client-side
      const { data: events, error } = await query;
      if (error) throw error;

      const filtered = (events || []).filter(e => {
        const isPast = new Date(e.end_time) < now;
        const isCancelled = !e.is_active;
        if (!isPast && !isCancelled) return false;
        if (startDate && new Date(e.start_time) < startDate) return false;
        return true;
      });

      // Load booker profiles
      const bookerIds = [...new Set(filtered.map(e => e.created_by).filter(Boolean))] as string[];
      let profilesMap: Record<string, { first_name: string | null; last_name: string | null; email: string }> = {};
      if (bookerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', bookerIds);
        profiles?.forEach(p => {
          profilesMap[p.user_id] = { first_name: p.first_name, last_name: p.last_name, email: p.email };
        });
      }

      const enriched: MeetingWithDetails[] = filtered.map(e => ({
        ...e,
        booker_profile: e.created_by ? profilesMap[e.created_by] || null : null,
      }));

      setMeetings(enriched);
    } catch (error) {
      console.error('Error loading meeting history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (meetingId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', meetingId)
        .eq('host_user_id', user.id);
      if (error) throw error;
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
      toast({ title: 'Spotkanie usunięte', description: 'Spotkanie zostało usunięte z historii.' });
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({ title: 'Błąd', description: 'Nie udało się usunąć spotkania.', variant: 'destructive' });
    }
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historia spotkań
        </CardTitle>
        <CardDescription>Odbyte i anulowane spotkania indywidualne</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Typ spotkania" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie typy</SelectItem>
              <SelectItem value="tripartite">Trójstronne</SelectItem>
              <SelectItem value="consultation">Konsultacje</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Okres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Ostatni miesiąc</SelectItem>
              <SelectItem value="3m">Ostatnie 3 miesiące</SelectItem>
              <SelectItem value="6m">Ostatnie 6 miesięcy</SelectItem>
              <SelectItem value="all">Wszystkie</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {meetings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Brak spotkań w wybranym okresie</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map(meeting => {
              const desc = parseDescription(meeting.description);
              const isTripartite = meeting.event_type === 'tripartite_meeting';
              const isPast = new Date(meeting.end_time) < new Date();

              return (
                <div
                  key={meeting.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30"
                >
                  <div className="p-2 rounded-full bg-muted shrink-0 mt-1">
                    {isTripartite
                      ? <Users className="h-4 w-4 text-primary" />
                      : <User className="h-4 w-4 text-primary" />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{meeting.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {isTripartite ? 'Trójstronne' : 'Konsultacje'}
                      </Badge>
                      {meeting.is_active && isPast ? (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <CheckCircle className="h-3 w-3" /> Odbyte
                        </Badge>
                      ) : !meeting.is_active ? (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <XCircle className="h-3 w-3" /> Anulowane
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(meeting.start_time), 'd MMM yyyy', { locale: pl })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(meeting.start_time), 'HH:mm')} – {format(new Date(meeting.end_time), 'HH:mm')}
                      </span>
                    </div>

                    {meeting.booker_profile && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Rezerwujący: </span>
                        <span className="font-medium">
                          {meeting.booker_profile.first_name} {meeting.booker_profile.last_name}
                        </span>
                        <span className="text-muted-foreground ml-1">({meeting.booker_profile.email})</span>
                      </div>
                    )}

                    {isTripartite && (desc.prospect_first_name || desc.prospect_last_name) && (
                      <div className="text-sm bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground">Prospekt: </span>
                        <span className="font-medium">{desc.prospect_first_name} {desc.prospect_last_name}</span>
                        {desc.prospect_phone && (
                          <span className="text-muted-foreground ml-2">Tel: {desc.prospect_phone}</span>
                        )}
                      </div>
                    )}

                    {!isTripartite && desc.consultation_purpose && (
                      <div className="text-sm bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground">Cel: </span>
                        <span>{desc.consultation_purpose}</span>
                      </div>
                    )}

                    {desc.booking_notes && (
                      <div className="text-sm text-muted-foreground">
                        Notatki: {desc.booking_notes}
                      </div>
                    )}

                    {meeting.zoom_link && (
                      <Badge variant="secondary" className="gap-1 w-fit">
                        <Video className="h-3 w-3" /> Zoom
                      </Badge>
                    )}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć spotkanie?</AlertDialogTitle>
                        <AlertDialogDescription>
                          To działanie jest nieodwracalne. Spotkanie zostanie trwale usunięte z historii.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(meeting.id)}>Usuń</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        )}

        {meetings.length > 0 && (
          <div className="pt-4 border-t text-sm text-muted-foreground">
            Łącznie: {meetings.length} spotkań
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IndividualMeetingsHistory;
