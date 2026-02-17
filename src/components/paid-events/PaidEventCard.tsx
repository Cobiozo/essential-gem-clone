import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Globe, ArrowRight, Users } from 'lucide-react';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
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

interface PaidEventCardProps {
  event: PaidEvent;
  isPast?: boolean;
}

export const PaidEventCard: React.FC<PaidEventCardProps> = ({ event, isPast = false }) => {
  const navigate = useNavigate();
  const { tf, language } = useLanguage();
  const dateLocale = language === 'pl' ? pl : enUS;
  
  const formatPrice = (priceInGrosze: number) => {
    return `${(priceInGrosze / 100).toFixed(0)} zł`;
  };

  const eventDate = new Date(event.event_date);
  const spotsLeft = event.max_tickets ? event.max_tickets - event.tickets_sold : null;
  const isSoldOut = spotsLeft !== null && spotsLeft <= 0;

  return (
    <Card 
      className={`group hover:shadow-md transition-all cursor-pointer ${isPast ? 'opacity-60' : ''}`}
      onClick={() => navigate(`/events/${event.slug}`)}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary">
              <span className="text-2xl font-bold leading-none">
                {format(eventDate, 'd')}
              </span>
              <span className="text-xs uppercase">
                {format(eventDate, 'MMM', { locale: dateLocale })}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              {!isPast && event.lowest_price && (
                <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                  {tf('events.from', 'od')} {formatPrice(event.lowest_price)}
                </Badge>
              )}
            </div>

            {event.short_description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {event.short_description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(eventDate, 'd MMM yyyy, HH:mm', { locale: dateLocale })}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {event.is_online ? (
                  <>
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span>{tf('events.online', 'Online')}</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    <span>{event.location || tf('events.location', 'Lokalizacja')}</span>
                  </>
                )}
              </div>

              {!isPast && spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 10 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <Users className="h-4 w-4" />
                  <span>{tf('events.spotsLeft', 'Zostało')} {spotsLeft} {tf('events.spots', 'miejsc')}</span>
                </div>
              )}

              {isSoldOut && !isPast && (
                <Badge variant="destructive" className="text-xs">
                  {tf('events.soldOut', 'Wyprzedane')}
                </Badge>
              )}
            </div>
          </div>

          {!isPast && (
            <div className="flex-shrink-0 self-center">
              <Button 
                variant="ghost" 
                size="sm"
                className="gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              >
                {tf('events.view', 'Zobacz')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
