import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, History, Users, User, Calendar, Clock, Video } from 'lucide-react';
import { format, subMonths, isAfter } from 'date-fns';
import { pl } from 'date-fns/locale';

interface MeetingWithParticipant {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  zoom_link: string | null;
  participant?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export const IndividualMeetingsHistory: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tripartite' | 'consultation'>('all');
  const [timeRange, setTimeRange] = useState<'1m' | '3m' | '6m' | 'all'>('3m');

  useEffect(() => {
    if (user) {
      loadMeetingHistory();
    }
  }, [user, filter, timeRange]);

  const loadMeetingHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date | null = null;

      switch (timeRange) {
        case '1m':
          startDate = subMonths(now, 1);
          break;
        case '3m':
          startDate = subMonths(now, 3);
          break;
        case '6m':
          startDate = subMonths(now, 6);
          break;
        default:
          startDate = null;
      }

      // Build query for past meetings where current user is host
      let query = supabase
        .from('events')
        .select('id, title, event_type, start_time, end_time, zoom_link')
        .eq('host_user_id', user.id)
        .in('event_type', ['tripartite_meeting', 'partner_consultation'])
        .lt('end_time', now.toISOString())
        .order('start_time', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('event_type', filter === 'tripartite' ? 'tripartite_meeting' : 'partner_consultation');
      }

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }

      const { data: events, error: eventsError } = await query;

      if (eventsError) throw eventsError;
      if (!events || events.length === 0) {
        setMeetings([]);
        setLoading(false);
        return;
      }

      // Get registrations for these events
      const eventIds = events.map(e => e.id);
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id, user_id')
        .in('event_id', eventIds)
        .neq('user_id', user.id); // Exclude host

      // Get profiles for participants
      const participantIds = [...new Set(registrations?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', participantIds);

      // Map events with participants
      const meetingsWithParticipants: MeetingWithParticipant[] = events.map(event => {
        const registration = registrations?.find(r => r.event_id === event.id);
        const participant = registration 
          ? profiles?.find(p => p.user_id === registration.user_id)
          : null;

        return {
          ...event,
          participant: participant ? {
            first_name: participant.first_name,
            last_name: participant.last_name,
            email: participant.email,
          } : undefined,
        };
      });

      setMeetings(meetingsWithParticipants);
    } catch (error) {
      console.error('Error loading meeting history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    if (type === 'tripartite_meeting') {
      return <Users className="h-4 w-4 text-violet-500" />;
    }
    return <User className="h-4 w-4 text-fuchsia-500" />;
  };

  const getEventTypeName = (type: string) => {
    if (type === 'tripartite_meeting') {
      return 'Trójstronne';
    }
    return 'Konsultacje';
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
        <CardDescription>
          Przegląd odbytych spotkań indywidualnych
        </CardDescription>
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

        {/* Meetings list */}
        {meetings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Brak spotkań w wybranym okresie</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map(meeting => (
              <div
                key={meeting.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30"
              >
                <div className="p-2 rounded-full bg-muted">
                  {getEventIcon(meeting.event_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{meeting.title}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {getEventTypeName(meeting.event_type)}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(meeting.start_time), 'd MMM yyyy', { locale: pl })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(meeting.start_time), 'HH:mm')}
                    </span>
                    {meeting.participant && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {meeting.participant.first_name} {meeting.participant.last_name}
                      </span>
                    )}
                  </div>
                </div>

                {meeting.zoom_link && (
                  <Badge variant="secondary" className="gap-1 shrink-0">
                    <Video className="h-3 w-3" />
                    Zoom
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
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
