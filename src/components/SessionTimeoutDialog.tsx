import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Timer, LogOut } from 'lucide-react';

interface SessionTimeoutDialogProps {
  open: boolean;
  countdown: number;
  onContinue: () => void;
  onLogout: () => void;
}

const SessionTimeoutDialog = ({ open, countdown, onContinue, onLogout }: SessionTimeoutDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Czy kontynuujesz pracę?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm">
            Nie wykryliśmy aktywności. Za{' '}
            <span className="font-bold text-destructive">{countdown}</span>{' '}
            sekund nastąpi automatyczne wylogowanie.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Wyloguj
          </Button>
          <Button onClick={onContinue} variant="action" className="gap-2">
            Kontynuuję
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SessionTimeoutDialog;
