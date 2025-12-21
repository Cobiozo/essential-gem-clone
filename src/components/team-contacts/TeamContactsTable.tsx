import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, History, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TeamContact, TeamContactHistory } from './types';
import { UplineHelpButton } from './UplineHelpButton';
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

interface TeamContactsTableProps {
  contacts: TeamContact[];
  loading: boolean;
  onEdit: (contact: TeamContact) => void;
  onDelete: (id: string) => void;
  getContactHistory: (contactId: string) => Promise<TeamContactHistory[]>;
  isAdmin: boolean;
}

export const TeamContactsTable: React.FC<TeamContactsTableProps> = ({
  contacts,
  loading,
  onEdit,
  onDelete,
  getContactHistory,
  isAdmin,
}) => {
  const { t } = useLanguage();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [historyContact, setHistoryContact] = useState<TeamContact | null>(null);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'client':
        return <Badge variant="secondary">{t('role.client') || 'Klient'}</Badge>;
      case 'partner':
        return <Badge variant="outline">{t('role.partner') || 'Partner'}</Badge>;
      case 'specjalista':
        return <Badge>{t('role.specialist') || 'Specjalista'}</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStatusBadge = (contact: TeamContact) => {
    if (contact.role === 'client') {
      return contact.client_status === 'active' ? (
        <Badge className="bg-green-100 text-green-800">{t('admin.active') || 'Aktywny'}</Badge>
      ) : contact.client_status === 'inactive' ? (
        <Badge variant="destructive">{t('admin.inactive') || 'Nieaktywny'}</Badge>
      ) : null;
    } else {
      return contact.partner_status === 'active' ? (
        <Badge className="bg-green-100 text-green-800">{t('admin.active') || 'Aktywny'}</Badge>
      ) : contact.partner_status === 'suspended' ? (
        <Badge variant="destructive">{t('teamContacts.suspended') || 'Wstrzymany'}</Badge>
      ) : null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('teamContacts.noContacts') || 'Brak kontaktów. Dodaj pierwszy kontakt.'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('teamContacts.firstName') || 'Imię'}</TableHead>
              <TableHead>{t('teamContacts.lastName') || 'Nazwisko'}</TableHead>
              <TableHead>EQID</TableHead>
              <TableHead>{t('teamContacts.role') || 'Rola'}</TableHead>
              <TableHead>{t('teamContacts.status') || 'Status'}</TableHead>
              <TableHead>{t('teamContacts.addedAt') || 'Data dodania'}</TableHead>
              <TableHead className="text-right">{t('teamContacts.actions') || 'Akcje'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.first_name}</TableCell>
                <TableCell>{contact.last_name}</TableCell>
                <TableCell className="font-mono text-sm">{contact.eq_id || '-'}</TableCell>
                <TableCell>{getRoleBadge(contact.role)}</TableCell>
                <TableCell>{getStatusBadge(contact)}</TableCell>
                <TableCell>
                  {new Date(contact.added_at).toLocaleDateString('pl-PL')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <UplineHelpButton contact={contact} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setHistoryContact(contact)}
                      title={t('teamContacts.history') || 'Historia'}
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(contact)}
                      title={t('admin.edit') || 'Edytuj'}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(contact.id)}
                      title={t('admin.delete') || 'Usuń'}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('teamContacts.deleteConfirmTitle') || 'Usuń kontakt'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('teamContacts.deleteConfirmMessage') || 'Czy na pewno chcesz usunąć ten kontakt? Ta akcja jest nieodwracalna.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.cancel') || 'Anuluj'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  onDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
            >
              {t('admin.delete') || 'Usuń'}
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
