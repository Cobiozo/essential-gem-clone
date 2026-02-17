import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PaidEventCard } from '@/components/paid-events/PaidEventCard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Ticket, CalendarX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface PaidEvent {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  event_date: string;
  event_end_date: string | null;
  location: string | null;
  is_online: boolean;
  banner_url: string | null;
  max_tickets: number | null;
  tickets_sold: number;
  lowest_price?: number;
}

const PaidEventsListPage: React.FC = () => {
  const { tf } = useLanguage();
  const { data: events, isLoading } = useQuery({
    queryKey: ['paid-events-list'],
    queryFn: async () => {
      const { data: eventsData, error } = await supabase
        .from('paid_events')
        .select(`
          id, slug, title, short_description, event_date, event_end_date,
          location, is_online, banner_url, max_tickets, tickets_sold
        `)
        .eq('is_published', true)
        .eq('is_active', true)
        .order('event_date', { ascending: true });

      if (error) throw error;

      const eventIds = eventsData?.map(e => e.id) || [];
      const { data: ticketsData } = await supabase
        .from('paid_event_tickets')
        .select('event_id, price_pln')
        .in('event_id', eventIds)
        .eq('is_active', true)
        .order('price_pln', { ascending: true });

      const priceMap = new Map<string, number>();
      ticketsData?.forEach(ticket => {
        if (!priceMap.has(ticket.event_id)) {
          priceMap.set(ticket.event_id, ticket.price_pln);
        }
      });

      return eventsData?.map(event => ({
        ...event,
        lowest_price: priceMap.get(event.id),
      })) as PaidEvent[];
    },
  });

  const now = new Date();
  const upcomingEvents = events?.filter(e => new Date(e.event_date) >= now) || [];
  const pastEvents = events?.filter(e => new Date(e.event_date) < now) || [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Ticket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tf('events.eventsTitle', 'Eventy')}</h1>
            <p className="text-muted-foreground">
              {tf('events.paidTrainings', 'Płatne szkolenia i wydarzenia')}
            </p>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {tf('events.upcoming', 'Nadchodzące wydarzenia')}
          </h2>
          
          {upcomingEvents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              {upcomingEvents.map((event) => (
                <PaidEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
              <CalendarX className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {tf('events.noPlanned', 'Brak zaplanowanych wydarzeń')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {tf('events.checkLater', 'Sprawdź ponownie później')}
              </p>
            </div>
          )}
        </section>

        {pastEvents.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
              {tf('events.past', 'Zakończone wydarzenia')}
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 opacity-70">
              {pastEvents.slice(0, 6).map((event) => (
                <PaidEventCard key={event.id} event={event} isPast />
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PaidEventsListPage;
