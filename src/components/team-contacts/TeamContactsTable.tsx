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
  contactType?: 'private' | 'team_member';
  readOnly?: boolean;
}

export const TeamContactsTable: React.FC<TeamContactsTableProps> = ({
  contacts,
  loading,
  onEdit,
  onDelete,
  getContactHistory,
  isAdmin,
  contactType,
  readOnly = false,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [historyContact, setHistoryContact] = useState<TeamContact | null>(null);
  const isTeamMember = contactType === 'team_member';

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'client':
        return <Badge variant="secondary">Klient</Badge>;
      case 'partner':
        return <Badge variant="outline">Partner</Badge>;
      case 'specjalista':
        return <Badge>Specjalista</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStatusBadge = (contact: TeamContact) => {
    // Dla team_member nie pokazuj statusu - tylko rolę
    if (isTeamMember) {
      return null;
    }
    
    // First check relationship_status
    if (contact.relationship_status) {
      const statusLabels: Record<string, { label: string; className: string }> = {
        active: { label: 'Aktywny', className: 'bg-green-100 text-green-800' },
        suspended: { label: 'Wstrzymany', className: 'bg-yellow-100 text-yellow-800' },
        closed_success: { label: 'Sukces', className: 'bg-blue-100 text-blue-800' },
        closed_not_now: { label: 'Nie teraz', className: 'bg-gray-100 text-gray-800' },
      };
      const status = statusLabels[contact.relationship_status];
      if (status) {
        return <Badge className={status.className}>{status.label}</Badge>;
      }
    }
    
    // Fallback to role-specific status
    if (contact.role === 'client') {
      return contact.client_status === 'active' ? (
        <Badge className="bg-green-100 text-green-800">Aktywny</Badge>
      ) : contact.client_status === 'inactive' ? (
        <Badge variant="destructive">Nieaktywny</Badge>
      ) : null;
    } else {
      return contact.partner_status === 'active' ? (
        <Badge className="bg-green-100 text-green-800">Aktywny</Badge>
      ) : contact.partner_status === 'suspended' ? (
        <Badge variant="destructive">Wstrzymany</Badge>
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
        <p>Brak kontaktów. Dodaj pierwszy kontakt.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imię</TableHead>
              <TableHead>Nazwisko</TableHead>
              <TableHead>EQID</TableHead>
              <TableHead>Rola</TableHead>
              {!isTeamMember && <TableHead>Status</TableHead>}
              <TableHead>Data dodania</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.first_name}</TableCell>
                <TableCell>{contact.last_name}</TableCell>
                <TableCell className="font-mono text-sm">{contact.eq_id || '-'}</TableCell>
                <TableCell>{getRoleBadge(contact.role)}</TableCell>
                {!isTeamMember && <TableCell>{getStatusBadge(contact)}</TableCell>}
                <TableCell>
                  {new Date(contact.added_at).toLocaleDateString('pl-PL')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {!readOnly && <UplineHelpButton contact={contact} />}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setHistoryContact(contact)}
                      title="Historia"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    {!readOnly && (
                      <>
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
                      </>
                    )}
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
            <AlertDialogTitle>Usuń kontakt</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć ten kontakt? Ta akcja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
          getHistory={getContactHistory}
          onClose={() => setHistoryContact(null)}
        />
      )}
    </>
  );
};
