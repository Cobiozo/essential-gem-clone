import { useState } from 'react';
import { MoreVertical, Trash2, Archive, Ban, ArchiveRestore, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConversationActionsProps {
  otherUserId: string;
  otherUserName: string;
  isArchived?: boolean;
  isBlocked?: boolean;
  onDelete: (userId: string) => void;
  onArchive: (userId: string) => void;
  onBlock: (userId: string) => void;
  onUnblock: (userId: string) => void;
  triggerVariant?: 'icon' | 'ghost';
  className?: string;
}

export const ConversationActions = ({
  otherUserId,
  otherUserName,
  isArchived = false,
  isBlocked = false,
  onDelete,
  onArchive,
  onBlock,
  onUnblock,
  triggerVariant = 'icon',
  className,
}: ConversationActionsProps) => {
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={triggerVariant === 'icon' ? 'icon' : 'sm'}
            className={className || 'h-8 w-8 p-0'}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[200]" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Usuń rozmowę
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onArchive(otherUserId)}>
            {isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Przywróć z archiwum
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Archiwizuj
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isBlocked ? (
            <DropdownMenuItem onClick={() => onUnblock(otherUserId)}>
              <UserCheck className="h-4 w-4 mr-2" />
              Odblokuj użytkownika
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setBlockDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="h-4 w-4 mr-2" />
              Zablokuj użytkownika
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block confirmation dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent className="z-[200]" onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Zablokować {otherUserName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Nie będziesz otrzymywać wiadomości od tej osoby. Konwersacja zostanie ukryta.
              Możesz odblokować tę osobę w dowolnym momencie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onBlock(otherUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Zablokuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć rozmowę?</AlertDialogTitle>
            <AlertDialogDescription>
              Rozmowa zostanie ukryta z Twojej listy. Jeśli {otherUserName} wyśle nową wiadomość,
              konwersacja pojawi się ponownie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(otherUserId)}>
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
