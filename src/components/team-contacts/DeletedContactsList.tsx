import React from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TeamContact } from './types';

interface DeletedContactsListProps {
  contacts: TeamContact[];
  loading: boolean;
  onRestore: (id: string) => void;
}

export const DeletedContactsList: React.FC<DeletedContactsListProps> = ({
  contacts,
  loading,
  onRestore,
}) => {
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
        <p>Brak usuniętych kontaktów</p>
        <p className="text-sm mt-1">Usunięte kontakty są przechowywane przez 30 dni</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        Usunięte kontakty są automatycznie usuwane trwale po 30 dniach.
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
            <div key={contact.id} className="flex items-center justify-between p-3 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">
                    {contact.first_name} {contact.last_name}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {daysLeft} {daysLeft === 1 ? 'dzień' : 'dni'} do usunięcia
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                  {contact.email && <span>{contact.email}</span>}
                  {contact.phone_number && <span>{contact.phone_number}</span>}
                  {deletedDateStr && <span className="text-xs">Usunięto: {deletedDateStr}</span>}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRestore(contact.id)}
                className="shrink-0"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Przywróć
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
