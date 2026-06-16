import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, Share2, X } from 'lucide-react';
import { shareOrDownloadImage, isMobileDevice, canUseWebShare } from '@/lib/imageShareUtils';

interface GalleryLightboxProps {
  images: string[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({ images, startIndex, open, onClose }) => {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const total = images.length;
  const prev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setIndex((i) => (i + 1) % total), [total]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, prev, next]);

  if (!total) return null;
  const current = images[index];

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx > 0 ? prev() : next(); }
    touchStartX.current = null;
  };

  const mobileShare = isMobileDevice() && canUseWebShare();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-7xl w-full p-0 overflow-hidden bg-black border-none">
        <DialogTitle className="sr-only">Podgląd zdjęcia {index + 1} z {total}</DialogTitle>
        <div className="relative select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {/* Top controls */}
          <div className="absolute top-3 right-3 z-20 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => shareOrDownloadImage(current, `gallery-${index + 1}.jpg`)}
              className="gap-2 bg-white/90 dark:bg-black/70 backdrop-blur-sm shadow-lg"
            >
              {mobileShare ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {mobileShare ? 'Zapisz' : 'Pobierz'}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={onClose}
              className="bg-white/90 dark:bg-black/70 backdrop-blur-sm shadow-lg h-9 w-9"
              aria-label="Zamknij"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Counter */}
          {total > 1 && (
            <div className="absolute top-3 left-3 z-20 rounded-full bg-black/60 text-white text-xs px-3 py-1.5 backdrop-blur-sm">
              {index + 1} / {total}
            </div>
          )}

          {/* Image */}
          <div className="flex items-center justify-center min-h-[50vh] max-h-[90vh]">
            <img
              src={current}
              alt={`Zdjęcie ${index + 1}`}
              className="max-h-[90vh] w-auto h-auto object-contain"
              draggable={false}
            />
          </div>

          {/* Arrows */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
