import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Users, Edit, Trash2, History, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TeamContact, TeamContactHistory, EventGroup } from './types';
import { ContactEventInfoButton } from './ContactEventInfoButton';
import { TeamContactHistoryDialog } from './TeamContactHistoryDialog';
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
  loading: boolean;
  onEdit: (contact: TeamContact) => void;
  onDelete: (id: string) => void;
  getContactHistory: (contactId: string) => Promise<TeamContactHistory[]>;
}

export const EventGroupedContacts: React.FC<EventGroupedContactsProps> = ({
  eventGroups,
  duplicateContactEvents,
  loading,
  onEdit,
  onDelete,
  getContactHistory,
}) => {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [historyContact, setHistoryContact] = useState<TeamContact | null>(null);

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
        <p>Brak kontaktów z zaproszeń na wydarzenia</p>
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
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{group.title}</h3>
                        <p className="text-sm text-muted-foreground">{eventDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {group.contacts.length} {group.contacts.length === 1 ? 'gość' : group.contacts.length < 5 ? 'gości' : 'gości'}
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
                        return (
                          <div key={contact.id} className="flex items-center justify-between py-3 gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-foreground">
                                  {contact.first_name} {contact.last_name}
                                </span>
                                {dupCount && dupCount > 1 && (
                                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400 dark:border-amber-700 gap-1">
                                    <RefreshCw className="w-3 h-3" />
                                    Zapisany na {dupCount} wydarzeń
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                {contact.email && <span>{contact.email}</span>}
                                {contact.phone_number && <span>{contact.phone_number}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <ContactEventInfoButton contact={contact} />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setHistoryContact(contact)}
                                title="Historia"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(contact)}
                                title="Edytuj"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(contact.id)}
                                title="Usuń"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
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
            <AlertDialogTitle>Usunąć kontakt?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Kontakt zostanie trwale usunięty.
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

      {/* History Dialog */}
      {historyContact && (
        <TeamContactHistoryDialog
          contact={historyContact}
          getContactHistory={getContactHistory}
          onClose={() => setHistoryContact(null)}
        />
      )}
    </>
  );
};
