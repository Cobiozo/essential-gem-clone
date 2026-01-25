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
import { GraduationCap, SkipForward } from 'lucide-react';

interface TourWelcomeDialogProps {
  open: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export const TourWelcomeDialog: React.FC<TourWelcomeDialogProps> = ({
  open,
  onStart,
  onSkip,
}) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">
            Witaj w Pure Life!
          </DialogTitle>
          <DialogDescription className="text-base">
            Przygotowaliśmy dla Ciebie krótki przewodnik po platformie.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onStart} className="w-full" size="lg">
            <GraduationCap className="mr-2 h-4 w-4" />
            Rozpocznij samouczek
          </Button>
          <Button
            onClick={onSkip}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Pomiń - znam platformę
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
