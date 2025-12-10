import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
        <p className="text-muted-foreground">Dodaj zdjęcia do galerii</p>
      </div>
    );
  }

  const getGalleryGridClass = (cols: number) => {
    if (cols === 1) return 'grid-cols-1';
    if (cols === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (cols === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    if (cols === 4) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
  };

  return (
    <>
      <div
        className={cn('grid', getGalleryGridClass(columns), className)}
        style={{ gap: `${gap * 0.25}rem` }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
            onClick={() => setSelectedImage(image)}
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

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-7xl w-full p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {selectedImage?.alt || 'Podgląd obrazu'}
          </DialogTitle>
          <div className="relative">
            <img
              src={selectedImage?.url}
              alt={selectedImage?.alt || 'Powiększony obraz'}
              className="w-full h-auto max-h-[90vh] object-contain"
            />
            {selectedImage?.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <p className="text-white text-lg font-medium">
                  {selectedImage.title}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
