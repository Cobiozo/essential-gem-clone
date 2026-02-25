import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, CalendarCheck, Users, User, Calendar, Clock, Video, 
  XCircle, FileText, Phone, Target, MessageSquare, Mail 
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface UpcomingMeeting {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  zoom_link: string | null;
  description: string | null;
  host_user_id: string;
  created_by: string;
  otherParty?: { first_name: string | null; last_name: string | null; email: string };
}

interface ProspectData {
  prospect_first_name?: string;
  prospect_last_name?: string;
  prospect_phone?: string;
  prospect_email?: string;
  booking_notes?: string;
  consultation_purpose?: string;
}

export const UpcomingMeetings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadUpcomingMeetings();
  }, [user]);

  const loadUpcomingMeetings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();

      // Get future events where user is host
      const { data: hostedEvents } = await supabase
        .from('events')
        .select('id, title, event_type, start_time, end_time, zoom_link, description, host_user_id, created_by')
        .eq('host_user_id', user.id)
        .in('event_type', ['tripartite_meeting', 'partner_consultation'])
        .gte('start_time', now)
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      // Get future events where user is registered (as booker)
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'registered');

      const regEventIds = registrations?.map(r => r.event_id) || [];

      let bookedEvents: any[] = [];
      if (regEventIds.length > 0) {
        const { data } = await supabase
          .from('events')
          .select('id, title, event_type, start_time, end_time, zoom_link, description, host_user_id, created_by')
          .in('id', regEventIds)
          .in('event_type', ['tripartite_meeting', 'partner_consultation'])
          .gte('start_time', now)
          .eq('is_active', true)
          .neq('host_user_id', user.id)
          .order('start_time', { ascending: true });
        bookedEvents = data || [];
      }

      const allEvents = [...(hostedEvents || []), ...bookedEvents];
      // Deduplicate
      const uniqueEvents = Array.from(new Map(allEvents.map(e => [e.id, e])).values());
      uniqueEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      // Get other party profiles
      const otherPartyIds = uniqueEvents.map(e => 
        e.host_user_id === user.id ? e.created_by : e.host_user_id
      ).filter(Boolean);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', [...new Set(otherPartyIds)]);

      const result: UpcomingMeeting[] = uniqueEvents.map(event => {
        const otherPartyId = event.host_user_id === user.id ? event.created_by : event.host_user_id;
        const profile = profiles?.find(p => p.user_id === otherPartyId);
        return {
          ...event,
          otherParty: profile ? {
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
          } : undefined,
        };
      });

      setMeetings(result);
    } catch (error) {
      console.error('Error loading upcoming meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (eventId: string) => {
    setCancelling(eventId);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-individual-meeting', {
        body: { event_id: eventId },
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      toast({ title: 'Spotkanie anulowane', description: 'Powiadomienia zostały wysłane.' });
      loadUpcomingMeetings();
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message || 'Nie udało się anulować spotkania', variant: 'destructive' });
    } finally {
      setCancelling(null);
    }
  };

  const parseProspectData = (description: string | null): ProspectData | null => {
    if (!description) return null;
    try { return JSON.parse(description); } catch { return null; }
  };

  const canCancel = (startTime: string): boolean => {
    const hoursUntil = (new Date(startTime).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntil > 2;
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
          <CalendarCheck className="h-5 w-5" />
          Zarezerwowane spotkania
        </CardTitle>
        <CardDescription>Twoje nadchodzące spotkania indywidualne</CardDescription>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Brak nadchodzących spotkań</p>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map(meeting => {
              const isTripartite = meeting.event_type === 'tripartite_meeting';
              const prospectData = parseProspectData(meeting.description);
              const isHost = meeting.host_user_id === user?.id;

              return (
                <div key={meeting.id} className="rounded-lg border p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {isTripartite ? <Users className="h-4 w-4 text-violet-500" /> : <User className="h-4 w-4 text-fuchsia-500" />}
                      <span className="font-medium">{meeting.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {isTripartite ? 'Trójstronne' : 'Konsultacje'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {isHost ? 'Prowadzący' : 'Uczestnik'}
                      </Badge>
                    </div>
                  </div>

                  {/* Date, Time, Partner */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(meeting.start_time), 'EEEE, d MMM yyyy', { locale: pl })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(meeting.start_time), 'HH:mm')} - {format(new Date(meeting.end_time), 'HH:mm')}
                    </span>
                    {meeting.otherParty && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {meeting.otherParty.first_name} {meeting.otherParty.last_name}
                      </span>
                    )}
                    {meeting.zoom_link && (
                      <a href={meeting.zoom_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <Video className="h-3.5 w-3.5" />
                        Zoom
                      </a>
                    )}
                  </div>

                  {/* Prospect / Purpose */}
                  {prospectData && isTripartite && (prospectData.prospect_first_name || prospectData.prospect_last_name) && (
                    <div className="text-sm bg-violet-50 dark:bg-violet-950/20 rounded p-2 space-y-1">
                      <p className="font-medium flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Prospekt: {prospectData.prospect_first_name} {prospectData.prospect_last_name}
                      </p>
                      {prospectData.prospect_phone && (
                        <p className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{prospectData.prospect_phone}</p>
                      )}
                      {prospectData.prospect_email && (
                        <p className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{prospectData.prospect_email}</p>
                      )}
                      {prospectData.booking_notes && (
                        <p className="text-muted-foreground"><MessageSquare className="h-3 w-3 inline mr-1" />{prospectData.booking_notes}</p>
                      )}
                    </div>
                  )}
                  {prospectData && !isTripartite && prospectData.consultation_purpose && (
                    <div className="text-sm bg-fuchsia-50 dark:bg-fuchsia-950/20 rounded p-2 space-y-1">
                      <p className="font-medium flex items-center gap-1"><Target className="h-3 w-3" />Cel: {prospectData.consultation_purpose}</p>
                      {prospectData.booking_notes && (
                        <p className="text-muted-foreground"><MessageSquare className="h-3 w-3 inline mr-1" />{prospectData.booking_notes}</p>
                      )}
                    </div>
                  )}

                  {/* Cancel */}
                  {canCancel(meeting.start_time) ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={cancelling === meeting.id}>
                          {cancelling === meeting.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          Anuluj spotkanie
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Anulować spotkanie?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ta operacja jest nieodwracalna. Wszyscy uczestnicy zostaną powiadomieni o anulowaniu.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Nie</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleCancel(meeting.id)}>Tak, anuluj</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : !isHost && meeting.otherParty?.email ? (
                    <div className="flex items-start gap-2 text-sm bg-muted/50 rounded p-2">
                      <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Anulowanie możliwe tylko przez kontakt z prowadzącym:</p>
                        <p className="font-medium">{meeting.otherParty.first_name} {meeting.otherParty.last_name}</p>
                        <a href={`mailto:${meeting.otherParty.email}`} className="text-primary underline">{meeting.otherParty.email}</a>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
