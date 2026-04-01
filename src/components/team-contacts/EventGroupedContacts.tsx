import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Users, Edit, Trash2, History, RefreshCw, UserPlus, CheckCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TeamContact, TeamContactHistory, EventGroup, EventRegistrationInfo } from './types';
import { ContactEventInfoButton } from './ContactEventInfoButton';
import { TeamContactHistoryDialog } from './TeamContactHistoryDialog';
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

interface EventGroupedContactsProps {
  eventGroups: Map<string, EventGroup>;
  duplicateContactEvents: Map<string, number>;
  eventContactDetails: Map<string, EventRegistrationInfo[]>;
  loading: boolean;
  onEdit: (contact: TeamContact) => void;
  onDelete: (id: string) => void;
  getContactHistory: (contactId: string) => Promise<TeamContactHistory[]>;
  onMoveToOwnList?: (id: string, force?: boolean) => Promise<boolean | 'duplicate'>;
}

export const EventGroupedContacts: React.FC<EventGroupedContactsProps> = ({
  eventGroups,
  duplicateContactEvents,
  eventContactDetails,
  loading,
  onEdit,
  onDelete,
  getContactHistory,
  onMoveToOwnList,
}) => {
  const { tf } = useLanguage();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [historyContact, setHistoryContact] = useState<TeamContact | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<string | null>(null);

  const toggleGroup = (eventId: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  // Sort events by date descending
  const sortedGroups = Array.from(eventGroups.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (sortedGroups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{tf('teamContacts.noEventContacts', 'Brak kontaktów z zaproszeń na wydarzenia')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {sortedGroups.map((group) => {
          const isOpen = openGroups.has(group.event_id);
          const eventDate = new Date(group.date).toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <Collapsible
              key={group.event_id}
              open={isOpen}
              onOpenChange={() => toggleGroup(group.event_id)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{group.title}</h3>
                        <p className="text-sm text-muted-foreground">{eventDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-[52px] sm:pl-0">
                      <Badge variant="secondary" className="flex items-center gap-1 whitespace-nowrap">
                        <Users className="w-3 h-3" />
                        {group.contacts.length} {group.contacts.length === 1 ? tf('teamContacts.guest', 'gość') : tf('teamContacts.guests', 'gości')}
                      </Badge>
                      {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 border-t">
                    <div className="divide-y">
                      {group.contacts.map((contact) => {
                        const dupCount = duplicateContactEvents.get(contact.id);
                        // Find registration info for this contact on this event
                        const contactRegs = eventContactDetails.get(contact.id) || [];
                        const thisEventReg = contactRegs.find(r => r.event_id === group.event_id);
                        const regDate = thisEventReg?.registered_at
                          ? new Date(thisEventReg.registered_at).toLocaleDateString('pl-PL', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : null;
                        const attempts = thisEventReg?.registration_attempts;

                        return (
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
                                    {regDate && (
                                      <span className="text-xs whitespace-nowrap">📅 {regDate}</span>
                                    )}
                                  </div>
                                </div>
                                {/* Chevron for mobile tap hint - visible only on sm+ where actions are inline */}
                              </div>
                              {/* Badges row */}
                              {((contact as any).moved_to_own_list || (dupCount && dupCount > 1) || (attempts && attempts > 1)) && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {(contact as any).moved_to_own_list && (
                                    <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-400 dark:border-green-700 gap-1 whitespace-nowrap">
                                      <CheckCheck className="w-3 h-3" />
                                      {tf('teamContacts.inMyList', 'W mojej liście')}
                                    </Badge>
                                  )}
                                  {dupCount && dupCount > 1 && (
                                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400 dark:border-amber-700 gap-1 whitespace-nowrap">
                                      <RefreshCw className="w-3 h-3" />
                                      {dupCount} wydarzeń
                                    </Badge>
                                  )}
                                  {attempts && attempts > 1 && (
                                    <Badge variant="destructive" className="text-xs gap-1 whitespace-nowrap">
                                      🔄 ×{attempts}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {/* Action buttons row */}
                              <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                {onMoveToOwnList && !(contact as any).moved_to_own_list && (
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
                            {/* Expanded details */}
                            {expandedContactId === contact.id && (
                              <ContactExpandedDetails
                                contact={contact}
                                registrationInfo={thisEventReg}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tf('teamContacts.deleteContact', 'Usunąć kontakt?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tf('teamContacts.deleteConfirmation', 'Ta operacja jest nieodwracalna. Kontakt zostanie trwale usunięty.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tf('teamContacts.cancel', 'Anuluj')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  onDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
            >
              {tf('teamContacts.deleted', 'Usuń')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Confirmation Dialog */}
      <AlertDialog open={!!duplicateConfirm} onOpenChange={() => setDuplicateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tf('teamContacts.contactExists', 'Kontakt już istnieje')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tf('teamContacts.contactExistsDesc', 'Kontakt z tym samym adresem email i numerem telefonu już istnieje w Twojej liście. Czy chcesz zapisać go jako nowy kontakt?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tf('teamContacts.cancel', 'Anuluj')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (duplicateConfirm && onMoveToOwnList) {
                  await onMoveToOwnList(duplicateConfirm, true);
                  setDuplicateConfirm(null);
                }
              }}
            >
              {tf('teamContacts.saveAsNew', 'Zapisz jako nowy')}
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
    </>
  );
};
