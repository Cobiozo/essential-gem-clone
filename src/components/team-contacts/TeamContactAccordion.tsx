import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Trash2, History, Phone, Mail, MapPin, Calendar, Package, Bell, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import type { TeamContact, TeamContactHistory } from './types';
import { UplineHelpButton } from './UplineHelpButton';
import { TeamContactHistoryDialog } from './TeamContactHistoryDialog';

interface TeamContactAccordionProps {
  contacts: TeamContact[];
  loading: boolean;
  onEdit: (contact: TeamContact) => void;
  onDelete: (id: string) => void;
  getContactHistory: (contactId: string) => Promise<TeamContactHistory[]>;
  isAdmin: boolean;
  readOnly?: boolean;
}

export const TeamContactAccordion: React.FC<TeamContactAccordionProps> = ({
  contacts,
  loading,
  onEdit,
  onDelete,
  getContactHistory,
  isAdmin,
  readOnly = false,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [historyContact, setHistoryContact] = useState<TeamContact | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      client: { label: 'Klient', variant: 'secondary' },
      partner: { label: 'Partner', variant: 'outline' },
      specjalista: { label: 'Specjalista', variant: 'default' },
    };
    const config = roleConfig[role] || { label: role, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (contact: TeamContact) => {
    const statusLabels: Record<string, { label: string; className: string }> = {
      active: { label: 'Aktywny', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      suspended: { label: 'Wstrzymany', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      closed_success: { label: 'Sukces', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      closed_not_now: { label: 'Nie teraz', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
    };
    
    if (contact.relationship_status) {
      const status = statusLabels[contact.relationship_status];
      if (status) {
        return <Badge className={status.className}>{status.label}</Badge>;
      }
    }
    return null;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pl-PL');
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Brak kontaktów. Dodaj pierwszy kontakt.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {contacts.map((contact) => {
          const isExpanded = expandedId === contact.id;
          
          return (
            <Card 
              key={contact.id} 
              className={`transition-all duration-200 ${isExpanded ? 'ring-2 ring-primary/20' : 'hover:shadow-md'}`}
            >
              {/* Collapsed View - Always Visible */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => toggleExpand(contact.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">
                        {contact.first_name} {contact.last_name}
                      </h3>
                      {getRoleBadge(contact.role)}
                      {getStatusBadge(contact)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      EQID: <span className="font-mono">{contact.eq_id || '-'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <>
                      <UplineHelpButton contact={contact} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryContact(contact);
                        }}
                        title="Historia"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(contact);
                        }}
                        title="Edytuj"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(contact.id);
                        }}
                        title="Usuń"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded View - Details */}
              {isExpanded && (
                <CardContent className="pt-0 pb-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                    {/* Kontakt */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Kontakt
                      </h4>
                      <div className="space-y-1 text-sm">
                        {contact.phone_number && (
                          <p><span className="text-muted-foreground">Tel:</span> {contact.phone_number}</p>
                        )}
                        {contact.email && (
                          <p><span className="text-muted-foreground">Email:</span> {contact.email}</p>
                        )}
                        {contact.address && (
                          <p className="flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                            <span>{contact.address}</span>
                          </p>
                        )}
                        {contact.profession && (
                          <p><span className="text-muted-foreground">Zawód:</span> {contact.profession}</p>
                        )}
                      </div>
                    </div>

                    {/* Struktura */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" /> Struktura
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Data dołączenia:</span> {formatDate(contact.added_at)}</p>
                        {contact.contact_upline_first_name && (
                          <p>
                            <span className="text-muted-foreground">Upline:</span>{' '}
                            {contact.contact_upline_first_name} {contact.contact_upline_last_name}
                            {contact.contact_upline_eq_id && (
                              <span className="font-mono text-xs ml-1">({contact.contact_upline_eq_id})</span>
                            )}
                          </p>
                        )}
                        {contact.start_date && (
                          <p><span className="text-muted-foreground">Start współpracy:</span> {formatDate(contact.start_date)}</p>
                        )}
                        {contact.collaboration_level && (
                          <p><span className="text-muted-foreground">Poziom:</span> {contact.collaboration_level}</p>
                        )}
                      </div>
                    </div>

                    {/* Produkty */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Package className="w-4 h-4" /> Produkty
                      </h4>
                      <div className="space-y-1 text-sm">
                        {contact.products && (
                          <p><span className="text-muted-foreground">Produkty:</span> {contact.products}</p>
                        )}
                        {contact.purchased_product && (
                          <p><span className="text-muted-foreground">Zakupiony:</span> {contact.purchased_product}</p>
                        )}
                        {contact.purchase_date && (
                          <p><span className="text-muted-foreground">Data zakupu:</span> {formatDate(contact.purchase_date)}</p>
                        )}
                      </div>
                    </div>

                    {/* Przypomnienia */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Bell className="w-4 h-4" /> Przypomnienia
                      </h4>
                      <div className="space-y-1 text-sm">
                        {contact.next_contact_date && (
                          <p><span className="text-muted-foreground">Następny kontakt:</span> {formatDate(contact.next_contact_date)}</p>
                        )}
                        {contact.reminder_date && (
                          <p><span className="text-muted-foreground">Przypomnienie:</span> {formatDate(contact.reminder_date)}</p>
                        )}
                        {contact.reminder_note && (
                          <p className="text-muted-foreground italic">{contact.reminder_note}</p>
                        )}
                      </div>
                    </div>

                    {/* Notatki */}
                    {contact.notes && (
                      <div className="space-y-2 md:col-span-2">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" /> Notatki
                        </h4>
                        <p className="text-sm bg-muted/50 p-3 rounded-md">{contact.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
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
