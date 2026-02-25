import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Users, User, Video, Calendar, Clock, XCircle, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MeetingEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string;
  zoom_link: string | null;
  is_active: boolean;
  created_by: string | null;
  booker_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

interface GroupedMeetings {
  [dateKey: string]: MeetingEvent[];
}

const parseDescription = (desc: string | null): Record<string, string> => {
  if (!desc) return {};
  try {
    return JSON.parse(desc);
  } catch {
    return {};
  }
};

export const LeaderMeetingSchedule: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<MeetingEvent[]>([]);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadMeetings();
  }, [user]);

  const handleCancelMeeting = async (eventId: string) => {
    setCancellingId(eventId);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-individual-meeting', {
        body: { event_id: eventId },
      });
      if (error) throw error;
      toast.success('Spotkanie zostało anulowane');
      loadMeetings();
    } catch (err: any) {
      console.error('Cancel meeting error:', err);
      toast.error(err.message || 'Nie udało się anulować spotkania');
    } finally {
      setCancellingId(null);
    }
  };

  const loadMeetings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, description, event_type, start_time, end_time, zoom_link, is_active, created_by')
        .eq('host_user_id', user.id)
        .in('event_type', ['tripartite_meeting', 'partner_consultation'])
        .eq('is_active', true)
        .gte('start_time', now)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Load booker profiles
      const bookerIds = [...new Set((events || []).map(e => e.created_by).filter(Boolean))] as string[];
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

      const enriched: MeetingEvent[] = (events || []).map(e => ({
        ...e,
        booker_profile: e.created_by ? profilesMap[e.created_by] || null : null,
      }));

      setMeetings(enriched);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
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

  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Brak zaplanowanych spotkań</p>
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const grouped: GroupedMeetings = {};
  meetings.forEach(m => {
    const dateKey = format(parseISO(m.start_time), 'yyyy-MM-dd');
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(m);
  });

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      {sortedDates.map(dateKey => (
        <Card key={dateKey}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(parseISO(dateKey), 'EEEE, d MMMM yyyy', { locale: pl })}
              <Badge variant="secondary" className="ml-auto">{grouped[dateKey].length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {grouped[dateKey].map(meeting => {
              const desc = parseDescription(meeting.description);
              const isTripartite = meeting.event_type === 'tripartite_meeting';
              const startTime = format(parseISO(meeting.start_time), 'HH:mm');
              const endTime = format(parseISO(meeting.end_time), 'HH:mm');

              return (
                <div
                  key={meeting.id}
                  className={cn(
                    "border rounded-lg p-4 space-y-2",
                    !meeting.is_active && "opacity-60 bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {isTripartite ? (
                        <Badge variant="outline" className="gap-1 text-violet-600 border-violet-300">
                          <Users className="h-3 w-3" /> Trójstronne
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-fuchsia-600 border-fuchsia-300">
                          <User className="h-3 w-3" /> Konsultacje
                        </Badge>
                      )}
                      <span className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {startTime} – {endTime}
                      </span>
                    </div>
                    {meeting.is_active ? (
                      <Badge className="bg-green-100 text-green-700 gap-1">
                        <CheckCircle className="h-3 w-3" /> Aktywne
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> Anulowane
                      </Badge>
                    )}
                  </div>

                  {/* Who booked */}
                  {meeting.booker_profile && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Rezerwujący: </span>
                      <span className="font-medium">
                        {meeting.booker_profile.first_name} {meeting.booker_profile.last_name}
                      </span>
                      <span className="text-muted-foreground ml-1">({meeting.booker_profile.email})</span>
                    </div>
                  )}

                  {/* Prospect data or consultation purpose */}
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
                      <span>Notatki: </span>{desc.booking_notes}
                    </div>
                  )}

                  {meeting.zoom_link && (
                    <div className="text-sm">
                      <a
                        href={meeting.zoom_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline flex items-center gap-1 w-fit"
                      >
                        <Video className="h-3 w-3" /> Link do spotkania
                      </a>
                    </div>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full mt-1 gap-1"
                        disabled={cancellingId === meeting.id}
                      >
                        {cancellingId === meeting.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        Anuluj spotkanie
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Anulować to spotkanie?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Spotkanie zostanie anulowane, a wszyscy uczestnicy zostaną powiadomieni.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Nie, zostaw</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleCancelMeeting(meeting.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Tak, anuluj
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
