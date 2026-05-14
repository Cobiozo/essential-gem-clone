import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PaidEventCard } from '@/components/paid-events/PaidEventCard';
import { MyTicketOrders } from '@/components/paid-events/MyTicketOrders';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Ticket, CalendarX, Archive } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user, isPartner, isAdmin } = useAuth();
  const canSeeForms = !!user && (isPartner || isAdmin);

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

  // Map event_id -> has at least one active form (so we know whether to render the embedded panel)
  const { data: formsByEvent } = useQuery({
    queryKey: ['paid-events-has-forms', canSeeForms],
    enabled: canSeeForms,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_registration_forms')
        .select('event_id')
        .eq('is_active', true);
      if (error) throw error;
      const set = new Set<string>();
      (data || []).forEach((r: any) => r.event_id && set.add(r.event_id));
      return set;
    },
  });

  const now = new Date();
  const upcomingEvents = events?.filter(e => new Date(e.event_date) >= now) || [];
  const pastEvents = events?.filter(e => new Date(e.event_date) < now) || [];

  if (isLoading) {
    return (
      <DashboardLayout backTo={{ label: 'Strona główna', path: '/dashboard' }}>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout backTo={{ label: 'Strona główna', path: '/dashboard' }}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
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

        {/* UPCOMING — exposed */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                {tf('events.upcoming', 'Nadchodzące wydarzenia')}
              </h2>
              {upcomingEvents.length > 0 && (
                <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15 border-0">
                  {upcomingEvents.length}
                </Badge>
              )}
            </div>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <PaidEventCard
                  key={event.id}
                  event={event}
                  showPartnerForm={canSeeForms && !!formsByEvent?.has(event.id)}
                />
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

        {/* PAST — clearly de-emphasized */}
        {pastEvents.length > 0 && (
          <section>
            <Separator className="mb-6" />
            <div className="flex items-center gap-2 mb-4">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {tf('events.past', 'Zakończone wydarzenia')}
              </h2>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {pastEvents.length}
              </Badge>
            </div>

            <div className="space-y-3">
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
