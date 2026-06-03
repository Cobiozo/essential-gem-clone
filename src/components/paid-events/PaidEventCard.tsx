import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Globe, ArrowRight, Users, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { getAppDateLocale } from '@/utils/dateLocale';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MyEventFormLinks } from './MyEventFormLinks';
import { MyEventTicketsInline } from './MyEventTicketsInline';

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

interface PaidEventCardProps {
  event: PaidEvent;
  isPast?: boolean;
  /** When true, renders the partner registration-form panel inside the card. */
  showPartnerForm?: boolean;
}

export const PaidEventCard: React.FC<PaidEventCardProps> = ({ event, isPast = false, showPartnerForm = false }) => {
  const navigate = useNavigate();
  const { tf, language } = useLanguage();
  const { user } = useAuth();
  const dateLocale = getAppDateLocale(language);
  
  const formatPrice = (priceInGrosze: number) => {
    return `${(priceInGrosze / 100).toFixed(0)} zł`;
  };

  const eventDate = new Date(event.event_date);
  const spotsLeft = event.max_tickets ? event.max_tickets - event.tickets_sold : null;
  const isSoldOut = spotsLeft !== null && spotsLeft <= 0;

  return (
    <Card
      className={
        isPast
          ? 'group transition-all opacity-60 grayscale'
          : 'group hover:shadow-lg hover:-translate-y-0.5 transition-all border-l-4 border-l-primary bg-card'
      }
    >
      <CardContent
        className="p-3 sm:p-4 cursor-pointer"
        onClick={() => navigate(`/events/${event.slug}`)}
      >
        {/* Banner — full width on mobile */}
        {event.banner_url && (
          <div className="mb-3 sm:hidden">
            <img
              src={event.banner_url}
              alt={event.title}
              loading="lazy"
              className="w-full aspect-[16/7] object-cover rounded-lg bg-muted"
            />
          </div>
        )}

        <div className="flex gap-3 sm:gap-4">
          {event.banner_url && (
            <div className="hidden sm:block flex-shrink-0">
              <img
                src={event.banner_url}
                alt={event.title}
                loading="lazy"
                className="w-40 h-20 object-cover rounded-lg bg-muted"
              />
            </div>
          )}

          <div className="flex-shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary">
              <span className="text-xl sm:text-2xl font-bold leading-none">
                {format(eventDate, 'd')}
              </span>
              <span className="text-[10px] sm:text-xs uppercase">
                {format(eventDate, 'MMM', { locale: dateLocale })}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
              {isPast ? (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {tf('events.endedBadge', 'Zakończone')}
                </Badge>
              ) : (
                <Badge className="text-[10px] uppercase tracking-wider bg-green-500/15 text-green-600 hover:bg-green-500/15 border-0">
                  {tf('events.upcomingBadge', 'Nadchodzi')}
                </Badge>
              )}
              {!isPast && event.lowest_price && (
                <Badge variant="secondary" className="whitespace-nowrap text-[10px] sm:text-xs">
                  {tf('events.from', 'od')} {formatPrice(event.lowest_price)}
                </Badge>
              )}
              {isSoldOut && !isPast && (
                <Badge variant="destructive" className="text-[10px] sm:text-xs">
                  {tf('events.soldOut', 'Wyprzedane')}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-base sm:text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {event.title}
            </h3>
          </div>
        </div>

        <div className="mt-2.5 sm:mt-3 sm:pl-[72px]">
          {event.short_description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3">
              {event.short_description}
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1.5 sm:gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                {format(eventDate, 'd MMM yyyy, HH:mm', { locale: dateLocale })}
              </span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              {event.is_online ? (
                <>
                  <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>{tf('events.online', 'Online')}</span>
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{event.location || tf('events.location', 'Lokalizacja')}</span>
                </>
              )}
            </div>

            {!isPast && spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 10 && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <Users className="h-4 w-4 shrink-0" />
                <span>{tf('events.spotsLeft', 'Zostało')} {spotsLeft} {tf('events.spots', 'miejsc')}</span>
              </div>
            )}
          </div>

          {!isPast && (
            <div className="mt-3 flex sm:justify-end">
              <Button
                variant="default"
                size="sm"
                className="w-full sm:w-auto gap-1"
              >
                {tf('events.view', 'Zobacz')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {!isPast && user && (
        <div className="border-t bg-muted/20 px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <MyEventTicketsInline eventId={event.id} />
        </div>
      )}

      {!isPast && showPartnerForm && (
        <div className="border-t bg-muted/30 px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">
              {tf('events.partnerLinkTitle', 'Twój link partnerski do tego wydarzenia')}
            </h4>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <MyEventFormLinks eventId={event.id} compact />
          </div>
        </div>
      )}
    </Card>
  );
};
