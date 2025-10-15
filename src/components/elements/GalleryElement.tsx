import React from 'react';
import { cn } from '@/lib/utils';

interface GalleryImage {
  url: string;
  alt?: string;
  title?: string;
}

interface GalleryElementProps {
  images: GalleryImage[];
  columns?: number;
  gap?: number;
  className?: string;
}

export const GalleryElement: React.FC<GalleryElementProps> = ({
  images,
  columns = 3,
  gap = 4,
  className,
}) => {
  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
        <p className="text-muted-foreground">Dodaj zdjęcia do galerii</p>
      </div>
    );
  }

  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {images.map((image, index) => (
        <div
          key={index}
          className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
        >
          <img
            src={image.url}
            alt={image.alt || `Gallery image ${index + 1}`}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
          />
          {image.title && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-sm font-medium px-2 text-center">
                {image.title}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
