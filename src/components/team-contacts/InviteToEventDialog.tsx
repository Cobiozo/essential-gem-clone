import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { TeamContact } from './types';

interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  event_type: string;
  host_name: string | null;
  image_url: string | null;
}

interface InviterProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
}

interface InviteToEventDialogProps {
  contact: TeamContact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InviteToEventDialog: React.FC<InviteToEventDialogProps> = ({
  contact,
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [inviterProfile, setInviterProfile] = useState<InviterProfile | null>(null);
  const [invitedEventIds, setInvitedEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !user) return;
    fetchEvents();
    fetchInviterProfile();
    fetchInvitedEvents();
  }, [open, user]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, end_time, event_type, host_name, image_url')
        .eq('is_active', true)
        .eq('allow_invites', true)
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInviterProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone_number')
        .eq('user_id', user.id)
        .single();
      if (data) setInviterProfile(data);
    } catch (error) {
      console.error('Error fetching inviter profile:', error);
    }
  };

  const fetchInvitedEvents = async () => {
    if (!contact.email) return;
    try {
      const { data } = await supabase
        .from('guest_event_registrations')
        .select('event_id')
        .eq('email', contact.email)
        .eq('status', 'registered');
      if (data) {
        setInvitedEventIds(new Set(data.map((r) => r.event_id)));
      }
    } catch (error) {
      console.error('Error fetching invited events:', error);
    }
  };

  const handleInvite = async (event: UpcomingEvent) => {
    if (!user || !contact.email || !inviterProfile) return;

    setSending(event.id);
    try {
      // 1. Register guest via RPC
      const { error: rpcError } = await supabase.rpc('register_event_guest', {
        p_event_id: event.id,
        p_email: contact.email,
        p_first_name: contact.first_name,
        p_last_name: contact.last_name || undefined,
        p_phone: contact.phone_number || undefined,
        p_invited_by: user.id,
        p_source: 'partner_invite',
      });

      if (rpcError) throw rpcError;

      // Format date and time in Warsaw timezone
      const startDate = new Date(event.start_time);
      const formattedTime = startDate.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Warsaw',
      });

      // 2. Send confirmation email via edge function with full data
      const { error: fnError } = await supabase.functions.invoke('send-webinar-confirmation', {
        body: {
          email: contact.email,
          firstName: contact.first_name,
          lastName: contact.last_name || '',
          phoneNumber: contact.phone_number || '',
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.start_time,
          eventTime: formattedTime,
          eventHost: event.host_name || 'Zespół Pure Life',
          imageUrl: event.image_url || '',
          invitedByUserId: user.id,
          source: 'partner_invite',
          inviterName: `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim(),
          inviterEmail: inviterProfile.email || '',
          inviterPhone: inviterProfile.phone_number || '',
        },
      });

      if (fnError) {
        console.warn('Confirmation email may not have been sent:', fnError);
      }

      // Log to contact history
      try {
        await supabase.from('team_contacts_history').insert({
          contact_id: contact.id,
          change_type: 'event_invite',
          new_values: {
            event_title: event.title,
            event_id: event.id,
            event_date: event.start_time,
          },
          changed_by: user.id,
        });
      } catch (histErr) {
        console.warn('Failed to log invite to contact history:', histErr);
      }

      // Optimistic update — mark as invited without closing dialog
      setInvitedEventIds((prev) => new Set(prev).add(event.id));

      toast({
        title: 'Zaproszenie wysłane',
        description: `${contact.first_name} ${contact.last_name} został zaproszony na "${event.title}"`,
      });
    } catch (error: any) {
      console.error('Error inviting to event:', error);
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się wysłać zaproszenia',
        variant: 'destructive',
      });
    } finally {
      setSending(null);
    }
  };

  const getEventTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      webinar: 'Webinar',
      team_training: 'Szkolenie',
      spotkanie_zespolu: 'Spotkanie',
    };
    return <Badge variant="outline" className="text-xs">{labels[type] || type}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Zaproś na wydarzenie
          </DialogTitle>
          <DialogDescription>
            Wybierz wydarzenie, na które chcesz zaprosić {contact.first_name} {contact.last_name}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Brak nadchodzących wydarzeń z możliwością zapraszania gości</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {events.map((event) => {
              const date = new Date(event.start_time);
              const formattedDate = date.toLocaleDateString('pl-PL', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              });
              const formattedTime = date.toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Warsaw',
              });
              const alreadyInvited = invitedEventIds.has(event.id);

              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{event.title}</span>
                      {getEventTypeBadge(event.event_type)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      📅 {formattedDate} • {formattedTime}
                    </p>
                  </div>
                  {alreadyInvited ? (
                    <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100 gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Zaproszenie wysłane
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleInvite(event)}
                      disabled={sending === event.id || !contact.email}
                    >
                      {sending === event.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span className="ml-1">Zaproś</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!contact.email && (
          <p className="text-sm text-destructive">
            Ten kontakt nie ma adresu email — nie można wysłać zaproszenia.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
