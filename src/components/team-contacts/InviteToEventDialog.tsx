import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Loader2, Mail, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  const [resending, setResending] = useState<string | null>(null);
  const [inviterProfile, setInviterProfile] = useState<InviterProfile | null>(null);
  const [invitedEventIds, setInvitedEventIds] = useState<Set<string>>(new Set());
  const [altEmailEventId, setAltEmailEventId] = useState<string | null>(null);
  const [altEmailValue, setAltEmailValue] = useState('');
  const [sendingAltEmail, setSendingAltEmail] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    fetchEvents();
    fetchInviterProfile();
    fetchInvitedEvents();
    setAltEmailEventId(null);
    setAltEmailValue('');
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

  const formatEventDateTime = (startTime: string) => {
    const date = new Date(startTime);
    return {
      formattedDate: date.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      formattedTime: date.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Warsaw',
      }),
    };
  };

  const sendConfirmationEmail = async (event: UpcomingEvent, email: string, firstName: string, lastName: string, phoneNumber: string) => {
    if (!user || !inviterProfile) return;
    const { formattedTime } = formatEventDateTime(event.start_time);

    await supabase.functions.invoke('send-webinar-confirmation', {
      body: {
        email,
        firstName,
        lastName,
        phoneNumber,
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
  };

  const logToHistory = async (changeType: string, newValues: Record<string, any>) => {
    if (!user) return;
    try {
      await supabase.from('team_contacts_history').insert({
        contact_id: contact.id,
        change_type: changeType,
        new_values: newValues,
        changed_by: user.id,
      });
    } catch (err) {
      console.warn('Failed to log to contact history:', err);
    }
  };

  const handleInvite = async (event: UpcomingEvent) => {
    if (!user || !contact.email || !inviterProfile) return;

    setSending(event.id);
    try {
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

      await sendConfirmationEmail(event, contact.email, contact.first_name, contact.last_name || '', contact.phone_number || '');

      await logToHistory('event_invite', {
        event_title: event.title,
        event_id: event.id,
        event_date: event.start_time,
      });

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

  const handleResend = async (event: UpcomingEvent) => {
    if (!user || !contact.email || !inviterProfile) return;

    setResending(event.id);
    try {
      await sendConfirmationEmail(event, contact.email, contact.first_name, contact.last_name || '', contact.phone_number || '');

      await logToHistory('event_invite_resend', {
        event_title: event.title,
        event_id: event.id,
        event_date: event.start_time,
        email: contact.email,
      });

      toast({
        title: 'Zaproszenie wysłane ponownie',
        description: `E-mail z zaproszeniem na "${event.title}" został wysłany ponownie`,
      });
    } catch (error: any) {
      console.error('Error resending invite:', error);
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się wysłać ponownie',
        variant: 'destructive',
      });
    } finally {
      setResending(null);
    }
  };

  const handleSendToAltEmail = async (event: UpcomingEvent) => {
    if (!user || !inviterProfile || !altEmailValue.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(altEmailValue.trim())) {
      toast({ title: 'Błąd', description: 'Podaj prawidłowy adres email', variant: 'destructive' });
      return;
    }

    setSendingAltEmail(true);
    try {
      // Register guest with alternate email
      const { error: rpcError } = await supabase.rpc('register_event_guest', {
        p_event_id: event.id,
        p_email: altEmailValue.trim(),
        p_first_name: contact.first_name,
        p_last_name: contact.last_name || undefined,
        p_phone: contact.phone_number || undefined,
        p_invited_by: user.id,
        p_source: 'partner_invite',
      });

      if (rpcError) throw rpcError;

      // Send confirmation to alternate email
      await sendConfirmationEmail(event, altEmailValue.trim(), contact.first_name, contact.last_name || '', contact.phone_number || '');

      // Save as secondary_email on contact
      const { error: updateError } = await supabase
        .from('team_contacts')
        .update({ secondary_email: altEmailValue.trim() } as any)
        .eq('id', contact.id);
      if (updateError) throw updateError;

      await logToHistory('event_invite_alt_email', {
        event_title: event.title,
        event_id: event.id,
        event_date: event.start_time,
        alt_email: altEmailValue.trim(),
      });

      toast({
        title: 'Zaproszenie wysłane na inny email',
        description: `Zaproszenie na "${event.title}" wysłane na ${altEmailValue.trim()}. Email zapisany jako drugi adres kontaktu.`,
      });

      setAltEmailEventId(null);
      setAltEmailValue('');
    } catch (error: any) {
      console.error('Error sending to alt email:', error);
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się wysłać na alternatywny email',
        variant: 'destructive',
      });
    } finally {
      setSendingAltEmail(false);
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
              const { formattedDate, formattedTime } = formatEventDateTime(event.start_time);
              const alreadyInvited = invitedEventIds.has(event.id);

              return (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{event.title}</span>
                        {getEventTypeBadge(event.event_type)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        📅 {formattedDate} • {formattedTime}
                      </p>
                    </div>
                    {!alreadyInvited && (
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

                  {alreadyInvited && (
                    <div className="mt-2 space-y-2">
                      <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100 gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Zaproszenie wysłane
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResend(event)}
                          disabled={resending === event.id}
                          className="text-xs h-7"
                        >
                          {resending === event.id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="w-3 h-3 mr-1" />
                          )}
                          Wyślij ponownie
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAltEmailEventId(altEmailEventId === event.id ? null : event.id);
                            setAltEmailValue('');
                          }}
                          className="text-xs h-7"
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Wyślij na inny email
                        </Button>
                      </div>

                      {altEmailEventId === event.id && (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="email"
                            placeholder="Podaj alternatywny email"
                            value={altEmailValue}
                            onChange={(e) => setAltEmailValue(e.target.value)}
                            className="h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSendToAltEmail(event)}
                            disabled={sendingAltEmail || !altEmailValue.trim()}
                            className="h-8 text-xs whitespace-nowrap"
                          >
                            {sendingAltEmail ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span className="ml-1">Wyślij</span>
                          </Button>
                        </div>
                      )}
                    </div>
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
