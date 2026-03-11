import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

interface EventReg {
  event_id: string;
  event_title: string;
  event_date: string;
  status: string;
  registered_at: string;
}

interface ContactEventHistoryProps {
  email: string;
}

export const ContactEventHistory: React.FC<ContactEventHistoryProps> = ({ email }) => {
  const [events, setEvents] = useState<EventReg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('guest_event_registrations')
          .select('event_id, status, registered_at, events(title, start_time)')
          .eq('email', email.toLowerCase().trim())
          .order('registered_at', { ascending: false });

        if (error) throw error;

        const mapped: EventReg[] = (data || []).map((r: any) => ({
          event_id: r.event_id,
          event_title: r.events?.title || 'Nieznane wydarzenie',
          event_date: r.events?.start_time || '',
          status: r.status || 'registered',
          registered_at: r.registered_at || '',
        }));

        setEvents(mapped);
      } catch (err) {
        console.error('Error fetching contact event history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [email]);

  if (loading) {
    return (
      <>
        <Separator className="my-2" />
        <div className="space-y-2">
          <Label>Rejestracje na wydarzenia</Label>
          <div className="h-8 bg-muted/50 rounded animate-pulse" />
        </div>
      </>
    );
  }

  if (events.length === 0) return null;

  return (
    <>
      <Separator className="my-2" />
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Rejestracje na wydarzenia ({events.length})
        </Label>
        <div className="rounded-md border bg-muted/30 divide-y">
          {events.map((ev, i) => {
            const eventDate = ev.event_date
              ? new Date(ev.event_date).toLocaleDateString('pl-PL', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              : '';

            return (
              <div key={`${ev.event_id}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{ev.event_title}</span>
                  {eventDate && (
                    <span className="ml-2 text-muted-foreground">({eventDate})</span>
                  )}
                </div>
                <Badge
                  variant={ev.status === 'registered' ? 'default' : 'secondary'}
                  className="ml-2 shrink-0"
                >
                  {ev.status === 'registered' ? 'Zarejestrowany' : ev.status === 'cancelled' ? 'Anulowany' : ev.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
