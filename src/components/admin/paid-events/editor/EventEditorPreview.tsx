import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PaidEventHero } from '@/components/paid-events/public/PaidEventHero';
import { PaidEventSection } from '@/components/paid-events/public/PaidEventSection';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventEditorPreviewProps {
  eventId: string;
  eventSlug: string;
  highlightedSection?: string | null;
}

export const EventEditorPreview: React.FC<EventEditorPreviewProps> = ({
  eventId,
  eventSlug,
  highlightedSection,
}) => {
  // Fetch event data
  const { data: event } = useQuery({
    queryKey: ['paid-event-preview', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch sections
  const { data: sections = [] } = useQuery({
    queryKey: ['paid-event-sections-preview', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_content_sections')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('position', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch tickets
  const { data: tickets = [] } = useQuery({
    queryKey: ['paid-event-tickets-preview', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_tickets')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('position', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch speakers
  const { data: speakers = [] } = useQuery({
    queryKey: ['paid-event-speakers-preview', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_speakers')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (!event) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Ładowanie podglądu...
      </div>
    );
  }

  const formatPrice = (priceInGrosze: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(priceInGrosze / 100);
  };

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-background">
        {/* Preview Badge */}
        <div className="sticky top-0 z-10 bg-primary/10 text-primary text-xs text-center py-1 font-medium">
          Podgląd strony wydarzenia — /events/{eventSlug}
        </div>

        {/* Hero Section */}
        <PaidEventHero
          title={event.title}
          shortDescription={event.short_description}
          bannerUrl={event.banner_url}
          eventDate={event.event_date}
          eventEndDate={event.event_end_date}
          location={event.location}
          isOnline={event.is_online}
        />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Sections */}
            <div className="lg:col-span-2 space-y-8">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={cn(
                    'transition-all duration-200 rounded-lg',
                    highlightedSection === section.id && 'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  <PaidEventSection
                    id={section.id}
                    title={section.title}
                    content={section.content}
                    items={section.items as any}
                    iconName={section.icon_name}
                    backgroundColor={section.background_color}
                    textColor={section.text_color}
                  />
                </div>
              ))}

              {sections.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Brak sekcji treści. Dodaj pierwszą sekcję w zakładce "Sekcje".
                  </CardContent>
                </Card>
              )}

              {/* Speakers Section */}
              {speakers.length > 0 && (
                <section className="py-8">
                  <h2 className="text-2xl font-bold mb-6">Prelegenci</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {speakers.map((speaker) => (
                      <Card key={speaker.id}>
                        <CardContent className="p-4 flex items-start gap-4">
                          {speaker.photo_url ? (
                            <img
                              src={speaker.photo_url}
                              alt={speaker.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
                              {speaker.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{speaker.name}</h3>
                            {speaker.title && (
                              <p className="text-sm text-muted-foreground">{speaker.title}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column - Tickets */}
            <div className="lg:col-span-1">
              <div className="sticky top-12 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="w-5 h-5" />
                      Rejestracja
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tickets.map((ticket) => (
                      <Card key={ticket.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{ticket.name}</h3>
                            {ticket.is_featured && (
                              <Badge variant="default">Popularne</Badge>
                            )}
                          </div>
                          <p className="text-2xl font-bold text-primary mb-2">
                            {formatPrice(ticket.price_pln)}
                          </p>
                          {ticket.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {ticket.description}
                            </p>
                          )}
                          {ticket.benefits && Array.isArray(ticket.benefits) && (
                            <ul className="space-y-1 text-sm">
                              {(ticket.benefits as string[]).map((benefit, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <Check className="w-4 h-4 text-green-500" />
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {tickets.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Brak biletów. Dodaj pierwszy bilet w zakładce "Bilety".
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
