import React from 'react';
import { Calendar, MapPin, Clock, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface PaidEventHeroProps {
  title: string;
  shortDescription?: string | null;
  bannerUrl?: string | null;
  eventDate: string;
  eventEndDate?: string | null;
  location?: string | null;
  isOnline?: boolean | null;
}

export const PaidEventHero: React.FC<PaidEventHeroProps> = ({
  title,
  shortDescription,
  bannerUrl,
  eventDate,
  eventEndDate,
  location,
  isOnline,
}) => {
  const startDate = new Date(eventDate);
  const endDate = eventEndDate ? new Date(eventEndDate) : null;

  const formatEventDate = () => {
    if (endDate) {
      const isSameDay = startDate.toDateString() === endDate.toDateString();
      if (isSameDay) {
        return `${format(startDate, 'd MMMM yyyy', { locale: pl })}, ${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`;
      }
      return `${format(startDate, 'd MMMM yyyy, HH:mm', { locale: pl })} - ${format(endDate, 'd MMMM yyyy, HH:mm', { locale: pl })}`;
    }
    return format(startDate, 'd MMMM yyyy, HH:mm', { locale: pl });
  };

  return (
    <section className="relative w-full">
      {/* Banner Image */}
      {bannerUrl && (
        <div className="absolute inset-0 h-[300px] md:h-[400px] overflow-hidden">
          <img
            src={bannerUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        </div>
      )}

      {/* Content */}
      <div className={`relative ${bannerUrl ? 'pt-[200px] md:pt-[280px]' : 'pt-8'} pb-6`}>
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {isOnline && (
                <Badge variant="secondary" className="gap-1">
                  <Globe className="w-3 h-3" />
                  Online
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {title}
            </h1>

            {/* Short Description */}
            {shortDescription && (
              <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-3xl">
                {shortDescription}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 md:gap-6 text-sm md:text-base">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-5 h-5 text-primary" />
                <span>{formatEventDate()}</span>
              </div>

              {location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
