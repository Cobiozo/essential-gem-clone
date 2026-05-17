import React, { useState } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useLanguage } from '@/contexts/LanguageContext';
import type { TeamContact } from './types';

interface DeletedContactsListProps {
  contacts: TeamContact[];
  loading: boolean;
  onRestore: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
}

export const DeletedContactsList: React.FC<DeletedContactsListProps> = ({
  contacts,
  loading,
  onRestore,
  onPermanentDelete,
}) => {
  const { tf } = useLanguage();
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{tf('teamContacts.noDeletedContacts', 'Brak usuniętych kontaktów')}</p>
        <p className="text-sm mt-1">{tf('teamContacts.deletedAutoRemove', 'Usunięte kontakty są przechowywane przez 30 dni')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        {tf('teamContacts.deletedAutoRemove', 'Usunięte kontakty są automatycznie usuwane trwale po 30 dniach.')}
      </p>
      <div className="divide-y rounded-md border">
        {contacts.map((contact) => {
          const deletedAt = (contact as any).deleted_at ? new Date((contact as any).deleted_at) : null;
          const daysLeft = deletedAt
            ? Math.max(0, 30 - Math.floor((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          const deletedDateStr = deletedAt
            ? deletedAt.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';

          return (
            <div key={contact.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground break-words">
                    {contact.first_name} {contact.last_name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                    {daysLeft} {daysLeft === 1 ? tf('teamContacts.day', 'dzień') : tf('teamContacts.days', 'dni')} {tf('teamContacts.daysToDelete', 'do usunięcia')}
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground mt-1">
                  {contact.email && <span className="truncate">{contact.email}</span>}
                  {contact.phone_number && <span className="truncate">{contact.phone_number}</span>}
                  {deletedDateStr && <span className="text-xs">{tf('teamContacts.deletedAt', 'Usunięto')}: {deletedDateStr}</span>}
                </div>
              </div>
              <div className="flex w-full sm:w-auto items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestore(contact.id)}
                  className="flex-1 sm:flex-none"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {tf('teamContacts.restore', 'Przywróć')}
                </Button>
                {onPermanentDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setPermanentDeleteId(contact.id)}
                    className="flex-1 sm:flex-none"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {tf('teamContacts.deletePermanently', 'Usuń trwale')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!permanentDeleteId} onOpenChange={(open) => !open && setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tf('teamContacts.deletePermanentlyTitle', 'Usunąć kontakt trwale?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tf(
                'teamContacts.deletePermanentlyConfirmation',
                'Tej operacji nie można cofnąć. Kontakt zostanie nieodwracalnie usunięty z bazy.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tf('teamContacts.cancel', 'Anuluj')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (permanentDeleteId && onPermanentDelete) {
                  onPermanentDelete(permanentDeleteId);
                  setPermanentDeleteId(null);
                }
              }}
            >
              {tf('teamContacts.deletePermanently', 'Usuń trwale')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
