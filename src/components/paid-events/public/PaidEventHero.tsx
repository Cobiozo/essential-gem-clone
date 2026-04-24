import React from 'react';
import { Calendar, MapPin, Globe, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PaidEventHeroProps {
  title: string;
  shortDescription?: string | null;
  bannerUrl?: string | null;
  eventDate: string;
  eventEndDate?: string | null;
  location?: string | null;
  isOnline?: boolean | null;
  /** Optional cache-busting key (e.g. event.updated_at) appended to the banner URL. */
  cacheKey?: string | null;
}

export const PaidEventHero: React.FC<PaidEventHeroProps> = ({
  title,
  shortDescription,
  bannerUrl,
  eventDate,
  eventEndDate,
  location,
  isOnline,
  cacheKey,
}) => {
  const navigate = useNavigate();
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

  // Cache-bust the banner so admins immediately see freshly uploaded images
  // and the public page never shows a stale CDN copy.
  const resolvedBannerUrl = bannerUrl
    ? cacheKey
      ? `${bannerUrl}${bannerUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheKey)}`
      : bannerUrl
    : null;

  // No banner: simple text-only header
  if (!resolvedBannerUrl) {
    return (
      <section className="relative w-full pt-8 pb-6">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Strona główna
              </Button>
            </div>
            {isOnline && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary" className="gap-1">
                  <Globe className="w-3 h-3" />
                  Online
                </Badge>
              </div>
            )}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {title}
            </h1>
            {shortDescription && (
              <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-3xl">
                {shortDescription}
              </p>
            )}
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
      </section>
    );
  }

  // Banner present: responsive aspect ratio (no min-h, so the image is never
  // artificially stretched and its composition stays intact at every width).
  // Same proportions in admin preview and on the public page.
  return (
    <section className="relative w-full">
      <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] lg:aspect-[21/9] max-h-[560px] overflow-hidden bg-muted">
        {/* Banner image */}
        <img
          src={resolvedBannerUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Bottom-only gradient (covers ~2/3) — keeps top of the image fully visible
            while ensuring text legibility over the bottom portion. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background/90 via-background/55 to-transparent" />

        {/* Top back-button overlay */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="container mx-auto px-4 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2 text-foreground/90 hover:text-foreground bg-background/40 backdrop-blur-sm hover:bg-background/60"
            >
              <ArrowLeft className="w-4 h-4" />
              Strona główna
            </Button>
          </div>
        </div>

        {/* Bottom content overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pb-6 md:pb-8">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl">
              {isOnline && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary" className="gap-1">
                    <Globe className="w-3 h-3" />
                    Online
                  </Badge>
                </div>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 md:mb-3 drop-shadow-lg">
                {title}
              </h1>
              {shortDescription && (
                <p className="text-sm sm:text-base md:text-lg text-foreground/90 mb-3 md:mb-4 max-w-3xl line-clamp-2">
                  {shortDescription}
                </p>
              )}
              <div className="flex flex-wrap gap-3 md:gap-6 text-xs sm:text-sm md:text-base">
                <div className="flex items-center gap-2 text-foreground/90">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  <span>{formatEventDate()}</span>
                </div>
                {location && (
                  <div className="flex items-center gap-2 text-foreground/90">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <span>{location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
