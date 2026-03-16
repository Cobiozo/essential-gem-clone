import React, { useState, useEffect } from 'react';
import { Calendar, Loader2, Send } from 'lucide-react';
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

  useEffect(() => {
    if (!open) return;
    fetchEvents();
  }, [open]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, end_time, event_type')
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

  const handleInvite = async (event: UpcomingEvent) => {
    if (!user || !contact.email) return;

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

      // 2. Send confirmation email via edge function
      const { error: fnError } = await supabase.functions.invoke('send-webinar-confirmation', {
        body: {
          email: contact.email,
          firstName: contact.first_name,
          lastName: contact.last_name || '',
          phoneNumber: contact.phone_number || '',
          eventId: event.id,
          invitedByUserId: user.id,
        },
      });

      if (fnError) {
        console.warn('Confirmation email may not have been sent:', fnError);
      }

      toast({
        title: 'Zaproszenie wysłane',
        description: `${contact.first_name} ${contact.last_name} został zaproszony na "${event.title}"`,
      });

      onOpenChange(false);
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
