import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

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
  // Add preview=true to prevent redirect for logged-in users viewing iframe
  const previewUrl = `/auth?ref=${reflinkCode}&preview=true`;
  // Full URL for "open in new tab" - without preview flag for normal behavior
  const fullUrl = `${window.location.origin}/auth?ref=${reflinkCode}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl h-[85vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
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
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="Podgląd strony rejestracji"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
