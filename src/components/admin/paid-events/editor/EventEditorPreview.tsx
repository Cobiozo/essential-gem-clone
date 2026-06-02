import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PaidEventHero } from '@/components/paid-events/public/PaidEventHero';
import { PaidEventSection } from '@/components/paid-events/public/PaidEventSection';
import { PaidEventSidebar } from '@/components/paid-events/public/PaidEventSidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserX, Info, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { EditorPreviewMode } from './PaidEventEditorLayout';

interface EventEditorPreviewProps {
  eventId: string;
  eventSlug: string;
  highlightedSection?: string | null;
  previewMode?: EditorPreviewMode;
}

export const EventEditorPreview: React.FC<EventEditorPreviewProps> = ({
  eventId,
  eventSlug,
  highlightedSection,
  previewMode = 'admin',
}) => {
  const { toast } = useToast();
  const isGuestPreview = previewMode === 'guest';
  const isPartnerPreview = previewMode === 'partner';
  const isAdminPreview = previewMode === 'admin';

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

  const { data: tickets = [] } = useQuery({
    queryKey: ['paid-event-tickets-preview', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_tickets')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('position', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

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

  // Guest visibility flags only apply in guest mode
  const eventAny = event as any;
  const guestShowDescription = eventAny.guests_show_description ?? true;
  const guestShowSpeakers = eventAny.guests_show_speakers ?? true;
  const guestShowTickets = eventAny.guests_show_tickets ?? true;

  const visibleSections = isGuestPreview
    ? sections.filter((s: any) => s.visible_to_guests !== false)
    : sections;

  const showSpeakersBlock = !isGuestPreview || guestShowSpeakers;
  const showTicketsBlock = !isGuestPreview || guestShowTickets;
  const showSectionsBlock = !isGuestPreview || guestShowDescription;

  const audienceLabel: Record<string, string> = {
    all: 'Wszyscy',
    guest_only: 'Goście',
    logged_in: 'Zalogowani',
  };

  // Filter tickets exactly like PaidEventPage does
  const filteredTickets = tickets.filter((t: any) => {
    const aud = t.audience ?? 'all';
    if (isAdminPreview) return true;
    if (aud === 'all') return true;
    if (isGuestPreview) return aud === 'guest_only';
    if (isPartnerPreview) return aud === 'logged_in';
    return true;
  });

  // Map to PaidEventSidebar shape (price in PLN units, not grosze)
  const sidebarTickets = filteredTickets.map((t: any) => ({
    id: t.id,
    name: t.name,
    price: (Number(t.price_pln) || 0) / 100,
    description: t.description ?? null,
    benefits: Array.isArray(t.benefits) ? t.benefits : [],
    highlightText: t.highlight_text ?? null,
    isFeatured: t.is_featured ?? false,
    available: t.quantity_available ?? null,
    maxPerOrder: 1,
    isFree: false,
  }));

  const handlePreviewPurchase = () => {
    toast({
      title: 'Podgląd',
      description: 'To jest tylko podgląd — akcja zakupu niedostępna.',
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-background">
        <div
          className={cn(
            'sticky top-0 z-10 text-xs text-center py-1.5 font-medium flex items-center justify-center gap-1.5',
            isGuestPreview && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
            isPartnerPreview && 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
            isAdminPreview && 'bg-primary/10 text-primary'
          )}
        >
          {isGuestPreview && (
            <>
              <UserX className="w-3.5 h-3.5" />
              Podgląd: niezalogowany gość — widzi tylko elementy włączone w „Ustawieniach głównych"
            </>
          )}
          {isPartnerPreview && (
            <>
              <User className="w-3.5 h-3.5" />
              Podgląd: zalogowany partner — widzi pełną treść strony
            </>
          )}
          {isAdminPreview && (
            <>
              <Info className="w-3.5 h-3.5" />
              Podgląd strony wydarzenia — /events/{eventSlug}
            </>
          )}
        </div>

        <PaidEventHero
          title={event.title}
          shortDescription={event.short_description}
          bannerUrl={event.banner_url}
          eventDate={event.event_date}
          eventEndDate={event.event_end_date}
          location={event.location}
          isOnline={event.is_online}
          cacheKey={event.updated_at ?? null}
        />

        <div className="container mx-auto px-4 py-8">
          <div
            className={cn(
              'flex flex-col gap-8',
              showTicketsBlock && 'lg:flex-row'
            )}
          >
            <div className="flex-1 min-w-0 space-y-8">
              {showSectionsBlock && (
                <>
                  {visibleSections.map((section: any) => (
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

                  {visibleSections.length === 0 && !isGuestPreview && (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center text-muted-foreground">
                        Brak sekcji treści. Dodaj pierwszą sekcję w zakładce "Sekcje".
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {showSpeakersBlock && speakers.length > 0 && (
                <section className="py-8">
                  <h2 className="text-2xl font-bold mb-6">Prelegenci</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {speakers.map((speaker: any) => (
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

            {showTicketsBlock && (
              <div className="lg:w-[380px] lg:shrink-0">
                {isAdminPreview && filteredTickets.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1 justify-end">
                    {filteredTickets.map((t: any) => (
                      <Badge key={t.id} variant="outline" className="text-[10px]">
                        {t.name}: {audienceLabel[t.audience ?? 'all']}
                      </Badge>
                    ))}
                  </div>
                )}

                {sidebarTickets.length > 0 ? (
                  <PaidEventSidebar
                    tickets={sidebarTickets}
                    eventDate={event.event_date}
                    maxTickets={eventAny.max_tickets ?? null}
                    ticketsSold={eventAny.tickets_sold ?? 0}
                    onPurchase={handlePreviewPurchase}
                    showLastSpotsLabel={eventAny.show_last_spots_label ?? false}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      {isGuestPreview && 'Niezalogowany gość nie zobaczy żadnego biletu na tej stronie.'}
                      {isPartnerPreview && 'Zalogowany użytkownik nie zobaczy żadnego biletu na tej stronie.'}
                      {isAdminPreview && 'Brak biletów. Dodaj pierwszy bilet w zakładce "Bilety".'}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
