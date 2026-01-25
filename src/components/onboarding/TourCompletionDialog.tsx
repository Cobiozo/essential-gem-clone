import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PartyPopper, RotateCcw, Rocket } from 'lucide-react';

interface TourCompletionDialogProps {
  open: boolean;
  onClose: () => void;
  onRestart: () => void;
}

export const TourCompletionDialog: React.FC<TourCompletionDialogProps> = ({
  open,
  onClose,
  onRestart,
}) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <PartyPopper className="h-8 w-8 text-green-500" />
          </div>
          <DialogTitle className="text-2xl">
            Gratulacje!
          </DialogTitle>
          <DialogDescription className="text-base">
            Znasz już podstawy platformy Pure Life.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onClose} className="w-full" size="lg">
            <Rocket className="mr-2 h-4 w-4" />
            Zamknij i zacznij korzystać
          </Button>
          <Button
            onClick={onRestart}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Powtórz samouczek
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
