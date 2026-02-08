import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';

interface ReflinkPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reflinkCode: string;
}

export const ReflinkPreviewDialog: React.FC<ReflinkPreviewDialogProps> = ({
  open,
  onOpenChange,
  reflinkCode,
}) => {
  // Delayed iframe loading to prevent focus issues during dialog mount
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    if (open && reflinkCode) {
      // Delay iframe load by 100ms to let dialog fully mount first
      const timer = setTimeout(() => {
        setIframeSrc(`/auth?ref=${reflinkCode}&preview=true`);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIframeSrc(null);
    }
  }, [open, reflinkCode]);

  const fullUrl = `${window.location.origin}/auth?ref=${reflinkCode}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl h-[85vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Podgląd strony rejestracji</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(fullUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Otwórz w nowej karcie
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 border rounded-lg overflow-hidden bg-background">
          {iframeSrc ? (
            <iframe
              src={iframeSrc}
              className="w-full h-full border-0"
              title="Podgląd strony rejestracji"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
