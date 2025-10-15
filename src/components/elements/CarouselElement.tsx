import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

interface CarouselElementProps {
  images: Array<{ url: string; alt?: string; caption?: string }>;
  autoplay?: boolean;
  interval?: number;
  className?: string;
}

export const CarouselElement: React.FC<CarouselElementProps> = ({
  images,
  autoplay = true,
  interval = 3000,
  className,
}) => {
  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <p className="text-muted-foreground">Dodaj obrazki do karuzeli</p>
      </div>
    );
  }

  return (
    <Carousel
      opts={{
        align: 'start',
        loop: true,
      }}
      className={cn('w-full', className)}
    >
      <CarouselContent>
        {images.map((image, index) => (
          <CarouselItem key={index}>
            <div className="relative aspect-video">
              <img
                src={image.url}
                alt={image.alt || `Slide ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-white text-sm">{image.caption}</p>
                </div>
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2" />
      <CarouselNext className="right-2" />
    </Carousel>
  );
};
