import React, { useState } from 'react';
import { UserPlus, Edit, Trash2, History, Send, ChevronDown, ChevronUp, Globe, CheckCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TeamContact, TeamContactHistory } from './types';
import { ContactEventInfoButton } from './ContactEventInfoButton';
import { TeamContactHistoryDialog } from './TeamContactHistoryDialog';
import { InviteToEventDialog } from './InviteToEventDialog';
import { ContactExpandedDetails } from './ContactExpandedDetails';
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

interface PartnerPageContactsListProps {
  contacts: TeamContact[];
  loading: boolean;
  onEdit: (contact: TeamContact) => void;
  onDelete: (id: string) => void;
  getContactHistory: (contactId: string) => Promise<TeamContactHistory[]>;
  onMoveToOwnList?: (id: string, force?: boolean) => Promise<boolean | 'duplicate'>;
}

export const PartnerPageContactsList: React.FC<PartnerPageContactsListProps> = ({
  contacts,
  loading,
  onEdit,
  onDelete,
  getContactHistory,
  onMoveToOwnList,
}) => {
  const { tf } = useLanguage();
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [historyContact, setHistoryContact] = useState<TeamContact | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<string | null>(null);
  const [inviteContact, setInviteContact] = useState<TeamContact | null>(null);

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
        <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Brak kontaktów ze Strony partnerskiej</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y">
        {contacts.map((contact) => (
          <div key={contact.id}>
            <div
              className="flex flex-col py-3 gap-2 cursor-pointer hover:bg-muted/30 transition-colors px-1 rounded"
              onClick={() => setExpandedContactId(prev => prev === contact.id ? null : contact.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-none">
                      {contact.first_name} {contact.last_name}
                    </span>
                    {expandedContactId === contact.id ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-muted-foreground mt-0.5">
                    {contact.email && <span className="truncate">{contact.email}</span>}
                    {contact.phone_number && <span className="whitespace-nowrap">{contact.phone_number}</span>}
                    <span className="text-xs whitespace-nowrap">
                      📅 {new Date(contact.added_at).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                </div>
              </div>
              {/* Action buttons row */}
              <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {onMoveToOwnList && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={async () => {
                      const result = await onMoveToOwnList(contact.id);
                      if (result === 'duplicate') {
                        setDuplicateConfirm(contact.id);
                      }
                    }}
                    title="Przenieś do Mojej listy"
                  >
                    <UserPlus className="w-4 h-4 text-primary" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setInviteContact(contact)}
                  title="Zaproś na wydarzenie"
                >
                  <Send className="w-4 h-4 text-primary" />
                </Button>
                <ContactEventInfoButton contact={contact} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setHistoryContact(contact)}
                  title="Historia"
                >
                  <History className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(contact)}
                  title="Edytuj"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDeleteConfirm(contact.id)}
                  title="Usuń"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            {expandedContactId === contact.id && (
              <ContactExpandedDetails contact={contact} />
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć kontakt?</AlertDialogTitle>
            <AlertDialogDescription>
              Kontakt zostanie przeniesiony do kosza na 30 dni.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  onDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Confirmation */}
      <AlertDialog open={!!duplicateConfirm} onOpenChange={() => setDuplicateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kontakt już istnieje</AlertDialogTitle>
            <AlertDialogDescription>
              Kontakt z tym samym adresem email i numerem telefonu już istnieje w Twojej liście. Czy chcesz zapisać go jako nowy kontakt?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (duplicateConfirm && onMoveToOwnList) {
                  await onMoveToOwnList(duplicateConfirm, true);
                  setDuplicateConfirm(null);
                }
              }}
            >
              Zapisz jako nowy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History Dialog */}
      {historyContact && (
        <TeamContactHistoryDialog
          contact={historyContact}
          getHistory={getContactHistory}
          onClose={() => setHistoryContact(null)}
        />
      )}

      {/* Invite Dialog */}
      {inviteContact && (
        <InviteToEventDialog
          contact={inviteContact}
          open={!!inviteContact}
          onOpenChange={(open) => !open && setInviteContact(null)}
        />
      )}
    </>
  );
};
