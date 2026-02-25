import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, X, Calendar, Clock, Video, Users, User, 
  FileText, Phone, Target, MessageSquare 
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface MeetingSummaryCardProps {
  eventId: string;
  onClose: () => void;
}

interface MeetingDetails {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  zoom_link: string | null;
  description: string | null;
  host_user_id: string;
  created_by: string;
  is_active: boolean;
  host?: { first_name: string | null; last_name: string | null; email: string };
  booker?: { first_name: string | null; last_name: string | null; email: string };
}

interface ProspectData {
  prospect_first_name?: string;
  prospect_last_name?: string;
  prospect_phone?: string;
  booking_notes?: string;
  consultation_purpose?: string;
}

export const MeetingSummaryCard: React.FC<MeetingSummaryCardProps> = ({ eventId, onClose }) => {
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeetingDetails();
  }, [eventId]);

  const loadMeetingDetails = async () => {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('id, title, event_type, start_time, end_time, zoom_link, description, host_user_id, created_by, is_active')
        .eq('id', eventId)
        .single();

      if (error || !event) {
        setLoading(false);
        return;
      }

      const userIds = [...new Set([event.host_user_id, event.created_by].filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      const hostProfile = profiles?.find(p => p.user_id === event.host_user_id);
      const bookerProfile = profiles?.find(p => p.user_id === event.created_by);

      setMeeting({
        ...event,
        host: hostProfile ? { first_name: hostProfile.first_name, last_name: hostProfile.last_name, email: hostProfile.email } : undefined,
        booker: bookerProfile ? { first_name: bookerProfile.first_name, last_name: bookerProfile.last_name, email: bookerProfile.email } : undefined,
      });
    } catch (err) {
      console.error('Error loading meeting details:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseProspectData = (description: string | null): ProspectData | null => {
    if (!description) return null;
    try {
      return JSON.parse(description);
    } catch {
      return null;
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

  if (!meeting) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Nie znaleziono spotkania</p>
          <Button variant="outline" onClick={onClose} className="mt-4">Zamknij</Button>
        </CardContent>
      </Card>
    );
  }

  const isTripartite = meeting.event_type === 'tripartite_meeting';
  const prospectData = parseProspectData(meeting.description);
  const startDate = new Date(meeting.start_time);
  const isPast = startDate < new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isTripartite ? <Users className="h-5 w-5 text-violet-500" /> : <User className="h-5 w-5 text-fuchsia-500" />}
            Podsumowanie spotkania
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <Badge variant={!meeting.is_active ? 'destructive' : isPast ? 'secondary' : 'default'}>
            {!meeting.is_active ? 'Anulowane' : isPast ? 'Zakończone' : 'Zaplanowane'}
          </Badge>
          <Badge variant="outline">
            {isTripartite ? 'Trójstronne' : 'Konsultacje'}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="font-semibold">{meeting.title}</h3>

        {/* Date & Time */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(startDate, 'EEEE, d MMMM yyyy', { locale: pl })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{format(startDate, 'HH:mm')} - {format(new Date(meeting.end_time), 'HH:mm')}</span>
          </div>
          {meeting.zoom_link && (
            <div className="flex items-center gap-2 text-sm">
              <Video className="h-4 w-4 text-muted-foreground" />
              <a href={meeting.zoom_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                Link do spotkania
              </a>
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="border rounded-lg p-3 space-y-3">
          <p className="text-sm font-medium">Uczestnicy</p>
          {meeting.host && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {(meeting.host.first_name?.[0] || '') + (meeting.host.last_name?.[0] || '')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{meeting.host.first_name} {meeting.host.last_name}</p>
                <p className="text-xs text-muted-foreground">Prowadzący</p>
              </div>
            </div>
          )}
          {meeting.booker && meeting.booker.email !== meeting.host?.email && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {(meeting.booker.first_name?.[0] || '') + (meeting.booker.last_name?.[0] || '')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{meeting.booker.first_name} {meeting.booker.last_name}</p>
                <p className="text-xs text-muted-foreground">Rezerwujący</p>
              </div>
            </div>
          )}
        </div>

        {/* Prospect Data (tripartite) */}
        {prospectData && isTripartite && (prospectData.prospect_first_name || prospectData.prospect_last_name) && (
          <div className="border rounded-lg p-3 space-y-2 bg-violet-50 dark:bg-violet-950/20">
            <p className="text-sm font-medium flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Dane prospekta
            </p>
            <p className="text-sm">
              {prospectData.prospect_first_name} {prospectData.prospect_last_name}
            </p>
            {prospectData.prospect_phone && (
              <p className="text-sm flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" />
                {prospectData.prospect_phone}
              </p>
            )}
            {prospectData.booking_notes && (
              <p className="text-sm text-muted-foreground">
                <MessageSquare className="h-3 w-3 inline mr-1" />
                {prospectData.booking_notes}
              </p>
            )}
          </div>
        )}

        {/* Consultation Purpose */}
        {prospectData && !isTripartite && prospectData.consultation_purpose && (
          <div className="border rounded-lg p-3 space-y-2 bg-fuchsia-50 dark:bg-fuchsia-950/20">
            <p className="text-sm font-medium flex items-center gap-1">
              <Target className="h-4 w-4" />
              Cel konsultacji
            </p>
            <p className="text-sm">{prospectData.consultation_purpose}</p>
            {prospectData.booking_notes && (
              <p className="text-sm text-muted-foreground">
                <MessageSquare className="h-3 w-3 inline mr-1" />
                {prospectData.booking_notes}
              </p>
            )}
          </div>
        )}

        <Button variant="outline" onClick={onClose} className="w-full">
          Zamknij
        </Button>
      </CardContent>
    </Card>
  );
};
