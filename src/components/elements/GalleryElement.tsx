import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Download, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shareOrDownloadImage, isMobileDevice, canUseWebShare } from '@/lib/imageShareUtils';

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const total = images?.length || 0;
  const prev = useCallback(() => setSelectedIndex((i) => (i === null ? null : (i - 1 + total) % total)), [total]);
  const next = useCallback(() => setSelectedIndex((i) => (i === null ? null : (i + 1) % total)), [total]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIndex, prev, next]);

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

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;
  const mobileShare = isMobileDevice() && canUseWebShare();

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx > 0 ? prev() : next(); }
    touchStartX.current = null;
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
            onClick={() => setSelectedIndex(index)}
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

      <Dialog open={selectedIndex !== null} onOpenChange={(v) => !v && setSelectedIndex(null)}>
        <DialogContent className="max-w-7xl w-full p-0 overflow-hidden bg-black border-none">
          <DialogTitle className="sr-only">
            {selectedImage?.alt || 'Podgląd obrazu'}
          </DialogTitle>
          <div className="relative select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="absolute top-4 right-4 z-20">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => selectedImage && shareOrDownloadImage(selectedImage.url, 'gallery-image.jpg')}
                className="gap-2 bg-white/90 dark:bg-black/70 backdrop-blur-sm shadow-lg"
              >
                {mobileShare ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {mobileShare ? 'Zapisz do galerii' : 'Pobierz'}
              </Button>
            </div>

            {total > 1 && (
              <div className="absolute top-4 left-4 z-20 rounded-full bg-black/60 text-white text-xs px-3 py-1.5 backdrop-blur-sm">
                {(selectedIndex ?? 0) + 1} / {total}
              </div>
            )}

            <img
              src={selectedImage?.url}
              alt={selectedImage?.alt || 'Powiększony obraz'}
              className="w-full h-auto max-h-[90vh] object-contain"
              draggable={false}
            />

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Poprzednie zdjęcie"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Następne zdjęcie"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {selectedImage?.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pointer-events-none">
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
