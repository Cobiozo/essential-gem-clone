import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Clock, BookOpen, Key, Calendar, UserPlus, Send, History, Edit, Trash2, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { InviteToEventDialog } from './InviteToEventDialog';
import { TeamContactHistoryDialog } from './TeamContactHistoryDialog';
import type { TeamContact, TeamContactHistory } from './types';
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

export interface HKSessionContact {
  session_id: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone: string;
  email_consent: boolean;
  otp_code: string;
  knowledge_title: string;
  knowledge_slug: string;
  session_created_at: string;
  last_activity_at: string | null;
  // After moving to own list, this will be set
  moved_contact_id?: string | null;
}

interface HKMaterialContactsListProps {
  sessions: HKSessionContact[];
  loading: boolean;
  onMoveToOwnList?: (session: HKSessionContact) => Promise<boolean | 'duplicate'>;
  onEdit?: (contact: TeamContact) => void;
  onDelete?: (id: string) => void;
  getContactHistory?: (contactId: string) => Promise<TeamContactHistory[]>;
  movedContactIds?: Set<string>; // session_ids that have been moved
  movedContacts?: Map<string, TeamContact>; // session_id -> TeamContact for moved sessions
}

function formatDuration(startStr: string, endStr: string | null): string {
  if (!endStr) return '—';
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const diffMs = end - start;
  if (diffMs < 0) return '—';
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hours > 0) return `${hours}h ${remainMins}min`;
  if (mins > 0) return `${mins}min`;
  return '<1min';
}

/** Convert HKSessionContact to a minimal TeamContact for dialogs */
function sessionToTeamContact(s: HKSessionContact): TeamContact {
  return {
    id: s.moved_contact_id || s.session_id,
    user_id: '',
    first_name: s.guest_first_name,
    last_name: s.guest_last_name,
    email: s.guest_email,
    phone_number: s.guest_phone,
    eq_id: null,
    role: 'client',
    created_at: s.session_created_at,
    updated_at: s.session_created_at,
    added_at: s.session_created_at,
    notes: null,
    contact_type: 'private',
    linked_user_id: null,
    address: null,
    secondary_email: null,
    profession: null,
    contact_upline_eq_id: null,
    contact_upline_first_name: null,
    contact_upline_last_name: null,
    relationship_status: null,
    products: null,
    contact_source: 'Materiał ZW',
    contact_reason: null,
    next_contact_date: null,
    reminder_date: null,
    reminder_note: null,
    reminder_sent: false,
    purchased_product: null,
    purchase_date: null,
    client_status: null,
    collaboration_level: null,
    start_date: null,
    partner_status: null,
    second_contact_date: null,
    first_contact_annotation: null,
    first_contact_result: null,
    is_active: true,
    linked_user_deleted_at: null,
  } as TeamContact;
}

export const HKMaterialContactsList: React.FC<HKMaterialContactsListProps> = ({
  sessions,
  loading,
  onMoveToOwnList,
  onEdit,
  onDelete,
  getContactHistory,
  movedContactIds,
  movedContacts,
}) => {
  const { tf } = useLanguage();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [historyContact, setHistoryContact] = useState<TeamContact | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<HKSessionContact | null>(null);
  const [inviteContact, setInviteContact] = useState<TeamContact | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">Brak danych</p>
        <p className="text-sm mt-1">Gdy ktoś obejrzy materiał udostępniony przez Twój kod OTP, dane pojawią się tutaj.</p>
      </div>
    );
  }

  const isMoved = (s: HKSessionContact) =>
    !!(s.moved_contact_id || movedContactIds?.has(s.session_id));

  const getMovedContact = (s: HKSessionContact): TeamContact | null => {
    if (movedContacts?.has(s.session_id)) return movedContacts.get(s.session_id)!;
    return null;
  };

  return (
    <>
      <div className="space-y-3">
        {sessions.map((s) => {
          const moved = isMoved(s);
          const movedContact = getMovedContact(s);

          return (
            <div
              key={s.session_id}
              className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
            >
              {/* Row 1: Name + badges */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-semibold text-foreground">
                  {s.guest_first_name} {s.guest_last_name}
                </h4>
                <div className="flex items-center gap-1.5">
                  {moved && (
                    <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-400 dark:border-green-700 gap-1 whitespace-nowrap shrink-0">
                      <CheckCheck className="w-3 h-3" />
                      {tf('teamContacts.inMyList', 'W mojej liście')}
                    </Badge>
                  )}
                  {s.email_consent && (
                    <Badge variant="outline" className="text-xs shrink-0">Zgoda email</Badge>
                  )}
                </div>
              </div>

              {/* Row 2: Contact info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mb-3">
                <a href={`mailto:${s.guest_email}`} className="flex items-center gap-1.5 text-primary hover:underline">
                  <Mail className="w-3.5 h-3.5" />
                  {s.guest_email}
                </a>
                {s.guest_phone && (
                  <a href={`tel:${s.guest_phone}`} className="flex items-center gap-1.5 text-foreground hover:underline">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {s.guest_phone}
                  </a>
                )}
              </div>

              {/* Row 3: Material title */}
              <div className="flex items-start gap-1.5 text-sm text-muted-foreground mb-3">
                <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{s.knowledge_title}</span>
              </div>

              {/* Row 4: Metadata */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1 font-mono">
                  <Key className="w-3 h-3" />
                  {s.otp_code}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(s.session_created_at), 'dd.MM.yyyy, HH:mm', { locale: pl })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(s.session_created_at, s.last_activity_at)}
                </span>
              </div>

              {/* Row 5: Action buttons */}
              <div className="flex items-center gap-1 flex-wrap border-t border-border pt-2">
                {onMoveToOwnList && !moved && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={async () => {
                      const result = await onMoveToOwnList(s);
                      if (result === 'duplicate') {
                        setDuplicateConfirm(s);
                      }
                    }}
                    title={tf('teamContacts.moveToOwnList', 'Przenieś do Mojej listy')}
                  >
                    <UserPlus className="w-4 h-4 text-primary" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setInviteContact(sessionToTeamContact(s))}
                  title={tf('teamContacts.inviteToEvent', 'Zaproś na wydarzenie')}
                >
                  <Send className="w-4 h-4 text-primary" />
                </Button>
                {moved && getContactHistory && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setHistoryContact(movedContact || sessionToTeamContact(s))}
                    title={tf('teamContacts.historyTitle', 'Historia zmian')}
                  >
                    <History className="w-4 h-4" />
                  </Button>
                )}
                {moved && onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(movedContact || sessionToTeamContact(s))}
                    title={tf('teamContacts.edit', 'Edytuj')}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                {moved && onDelete && movedContact && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteConfirm(movedContact.id)}
                    title={tf('teamContacts.deleteContact', 'Usuń')}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
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
                if (deleteConfirm && onDelete) {
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
                  // Force create (skip duplicate check)
                  await onMoveToOwnList(duplicateConfirm);
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
      {historyContact && getContactHistory && (
        <TeamContactHistoryDialog
          contact={historyContact}
          getHistory={getContactHistory}
          onClose={() => setHistoryContact(null)}
        />
      )}

      {/* Invite to Event Dialog */}
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
