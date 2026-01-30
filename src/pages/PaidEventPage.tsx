import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';

import { PaidEventHero } from '@/components/paid-events/public/PaidEventHero';
import { PaidEventNavigation } from '@/components/paid-events/public/PaidEventNavigation';
import { PaidEventSection } from '@/components/paid-events/public/PaidEventSection';
import { PaidEventSidebar } from '@/components/paid-events/public/PaidEventSidebar';
import { PaidEventSpeakers } from '@/components/paid-events/public/PaidEventSpeakers';
import { PaidEventSchedule } from '@/components/paid-events/public/PaidEventSchedule';
import { PurchaseDrawer } from '@/components/paid-events/public/PurchaseDrawer';

interface ContentSection {
  id: string;
  section_type: string;
  title: string;
  content: string | null;
  position: number;
  is_active: boolean;
  background_color: string | null;
  text_color: string | null;
  icon_name: string | null;
  items: any[] | null;
}

interface Ticket {
  id: string;
  name: string;
  price: number;
  description: string | null;
  benefits: string[] | null;
  highlight_text: string | null;
  is_featured: boolean | null;
  available_quantity: number | null;
  max_per_order: number | null;
  is_active: boolean | null;
}

interface PaidEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  event_date: string;
  event_end_date: string | null;
  location: string | null;
  is_online: boolean | null;
  banner_url: string | null;
  max_tickets: number | null;
  tickets_sold: number | null;
  is_active: boolean | null;
  is_published: boolean | null;
  visible_to_partners: boolean | null;
  visible_to_clients: boolean | null;
  visible_to_specjalista: boolean | null;
  visible_to_everyone: boolean | null;
}

const PaidEventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isPartner, isClient, isSpecjalista } = useAuth();
  
  const [activeSection, setActiveSection] = useState<string>('');
  const [purchaseDrawerOpen, setPurchaseDrawerOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Fetch event data
  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['paid-event', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_events')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as PaidEvent | null;
    },
    enabled: !!slug,
  });

  // Fetch content sections
  const { data: contentSections = [] } = useQuery({
    queryKey: ['paid-event-sections', event?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_content_sections')
        .select('*')
        .eq('event_id', event!.id)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as ContentSection[];
    },
    enabled: !!event?.id,
  });

  // Fetch tickets
  const { data: tickets = [] } = useQuery({
    queryKey: ['paid-event-tickets', event?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_tickets')
        .select('*')
        .eq('event_id', event!.id)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      
      // Parse benefits from JSONB
      return (data || []).map((ticket: any) => ({
        ...ticket,
        benefits: Array.isArray(ticket.benefits) ? ticket.benefits : [],
      })) as Ticket[];
    },
    enabled: !!event?.id,
  });

  // Check access permissions
  const hasAccess = useMemo(() => {
    if (!event) return false;
    if (isAdmin) return true; // Admins can always see
    
    if (!event.is_published || !event.is_active) {
      return isAdmin; // Only admins can see unpublished
    }

    if (event.visible_to_everyone) return true;
    if (event.visible_to_partners && isPartner) return true;
    if (event.visible_to_clients && isClient) return true;
    if (event.visible_to_specjalista && isSpecjalista) return true;

    // If all visibility flags are false and not visible_to_everyone, allow public access
    if (!event.visible_to_partners && !event.visible_to_clients && 
        !event.visible_to_specjalista && event.visible_to_everyone !== false) {
      return true;
    }

    return false;
  }, [event, isAdmin, isPartner, isClient, isSpecjalista]);

  // Build navigation items from content sections
  const navigationItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    
    contentSections.forEach((section) => {
      items.push({
        id: section.section_type === 'custom' ? `section-${section.id}` : section.section_type,
        label: section.title,
      });
    });

    // Add speakers section if we have speakers data (future: from DB)
    // items.push({ id: 'speakers', label: 'Prelegenci' });

    return items;
  }, [contentSections]);

  // Handle scroll navigation
  const handleNavigate = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  }, []);

  // Handle purchase
  const handlePurchase = useCallback((ticketId: string) => {
    setSelectedTicketId(ticketId);
    setPurchaseDrawerOpen(true);
  }, []);

  // Get selected ticket info for drawer
  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    const ticket = tickets.find(t => t.id === selectedTicketId);
    if (!ticket) return null;
    return {
      id: ticket.id,
      name: ticket.name,
      price: ticket.price,
    };
  }, [selectedTicketId, tickets]);

  // Loading state
  if (eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Not found
  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Wydarzenie nie znalezione</h1>
        <p className="text-muted-foreground text-center">
          Wydarzenie o podanym adresie nie istnieje lub zostało usunięte.
        </p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Powrót do strony głównej
        </Button>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Brak dostępu</h1>
        <p className="text-muted-foreground text-center">
          Nie masz uprawnień do wyświetlenia tego wydarzenia.
        </p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Powrót do strony głównej
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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

      {/* Navigation */}
      {navigationItems.length > 0 && (
        <PaidEventNavigation
          items={navigationItems}
          activeSection={activeSection}
          onNavigate={handleNavigate}
        />
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Content Column */}
          <div className="flex-1 min-w-0">
            {/* Description (default if no sections) */}
            {contentSections.length === 0 && event.description && (
              <div 
                className="prose prose-lg max-w-none dark:prose-invert mb-8"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            )}

            {/* CMS Sections */}
            {contentSections.map((section) => (
              <PaidEventSection
                key={section.id}
                id={section.section_type === 'custom' ? `section-${section.id}` : section.section_type}
                title={section.title}
                content={section.content}
                items={section.items?.map((item: any) => ({
                  text: typeof item === 'string' ? item : item.text,
                  icon: typeof item === 'object' ? item.icon : undefined,
                }))}
                iconName={section.icon_name}
                backgroundColor={section.background_color}
                textColor={section.text_color}
              />
            ))}

            {/* Speakers Section - placeholder for future DB integration */}
            {/* <PaidEventSpeakers speakers={[]} /> */}

            {/* Schedule Section - placeholder for future DB integration */}
            {/* <PaidEventSchedule items={[]} /> */}
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-[380px] flex-shrink-0">
            <PaidEventSidebar
              tickets={tickets.map(t => ({
                id: t.id,
                name: t.name,
                price: t.price,
                description: t.description,
                benefits: t.benefits || [],
                highlightText: t.highlight_text,
                isFeatured: t.is_featured || false,
                available: t.available_quantity,
                maxPerOrder: t.max_per_order || undefined,
              }))}
              eventDate={event.event_date}
              maxTickets={event.max_tickets}
              ticketsSold={event.tickets_sold}
              onPurchase={handlePurchase}
            />
          </div>
        </div>
      </div>

      {/* Purchase Drawer */}
      <PurchaseDrawer
        open={purchaseDrawerOpen}
        onOpenChange={setPurchaseDrawerOpen}
        eventId={event.id}
        eventTitle={event.title}
        ticket={selectedTicket}
      />
    </div>
  );
};

export default PaidEventPage;
