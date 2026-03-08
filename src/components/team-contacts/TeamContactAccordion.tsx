import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Trash2, History, Phone, Mail, MapPin, Calendar, Package, Bell, User, Users, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import type { TeamContact, TeamContactHistory, EventRegistrationInfo } from './types';
import { ContactEventInfoButton } from './ContactEventInfoButton';
import { TeamContactHistoryDialog } from './TeamContactHistoryDialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface TeamContactAccordionProps {
  contacts: TeamContact[];
  loading: boolean;
  onEdit: (contact: TeamContact) => void;
  onDelete: (id: string) => void;
  getContactHistory: (contactId: string) => Promise<TeamContactHistory[]>;
  isAdmin: boolean;
  readOnly?: boolean;
  contactType?: 'private' | 'team_member';
  hideEventInfo?: boolean;
  onUpdateNotes?: (contactId: string, notes: string) => Promise<void>;
  eventContactDetails?: Map<string, EventRegistrationInfo[]>;
}

export const TeamContactAccordion: React.FC<TeamContactAccordionProps> = ({
  contacts,
  loading,
  onEdit,
  onDelete,
  getContactHistory,
  isAdmin,
  readOnly = false,
  contactType,
  hideEventInfo = false,
  onUpdateNotes,
  eventContactDetails,
}) => {
  const { t } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [historyContact, setHistoryContact] = useState<TeamContact | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);

  const handleSaveNotes = async (contactId: string) => {
    if (!onUpdateNotes) return;
    setSavingNotes(true);
    try {
      await onUpdateNotes(contactId, notesValue);
      setEditingNotesId(null);
    } finally {
      setSavingNotes(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { labelKey: string; variant: 'default' | 'secondary' | 'outline' }> = {
      client: { labelKey: 'teamContacts.roles.client', variant: 'secondary' },
      partner: { labelKey: 'teamContacts.roles.partner', variant: 'outline' },
      specjalista: { labelKey: 'teamContacts.roles.specjalista', variant: 'default' },
    };
    const config = roleConfig[role] || { labelKey: role, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{t(config.labelKey)}</Badge>;
  };

  const getStatusBadge = (contact: TeamContact, isTeamMember: boolean) => {
    // Dla team_member nie pokazuj statusu - tylko rolę
    if (isTeamMember) {
      return null;
    }
    
    const statusLabels: Record<string, { label: string; className: string }> = {
      observation: { label: 'Czynny obserwujący', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      potential_client: { label: 'Potencjalny klient', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      potential_partner: { label: 'Potencjalny partner', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      closed_success: { label: 'Zamknięty - sukces dołączył', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
      closed_not_now: { label: 'Zamknięty - nie teraz', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
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

  const getApprovalStatusBadge = (contact: TeamContact) => {
    // Pełne zatwierdzenie - aktywny
    if (contact.linked_guardian_approved === true && contact.linked_admin_approved === true) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          {t('teamContacts.approvalStatus.active')}
        </Badge>
      );
    }
    
    // Opiekun zatwierdził, czeka na admina
    if (contact.linked_guardian_approved === true && contact.linked_admin_approved !== true) {
      return (
        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
          {t('teamContacts.approvalStatus.awaitingAdmin')}
        </Badge>
      );
    }
    
    // Czeka na opiekuna
    if (contact.linked_guardian_approved !== true) {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          {t('teamContacts.approvalStatus.awaitingGuardian')}
        </Badge>
      );
    }
    
    // Fallback
    return (
      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
        {t('teamContacts.approvalStatus.inactive')}
      </Badge>
    );
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
        <p>{t('teamContacts.noContacts')}</p>
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
                      {contactType !== 'private' && getRoleBadge(contact.role)}
                       {getStatusBadge(contact, contactType === 'team_member')}
                    </div>
                    {/* Event badges inline */}
                    {eventContactDetails && eventContactDetails.get(contact.id) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {eventContactDetails.get(contact.id)!.map((ev) => (
                          <Badge key={ev.event_id} variant="outline" className="text-xs font-normal">
                            📅 {ev.event_title} • {new Date(ev.event_start_time).toLocaleDateString('pl-PL')}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {contactType !== 'private' && (
                      <p className="text-sm text-muted-foreground">
                        EQID: <span className="font-mono">{contact.eq_id || '-'}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <>
                      {!hideEventInfo && <ContactEventInfoButton contact={contact} />}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryContact(contact);
                        }}
                        title={t('common.history')}
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
                        title={t('common.edit')}
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
                        title={t('common.delete')}
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
                    
                    {/* Oś czasu - dla kontaktów prywatnych */}
                    {contactType === 'private' && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" /> Oś czasu
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Utworzono:</span> {contact.created_at ? new Date(contact.created_at).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                          <p><span className="text-muted-foreground">Pierwszy kontakt:</span> {formatDate(contact.added_at)}</p>
                          {contact.first_contact_result && (
                            <p><span className="text-muted-foreground">Wynik:</span> {
                              { answered: 'Odebrał', no_answer: 'Nie odebrane', wrong_number: 'Błędny numer', out_of_range: 'Poza zasięgiem' }[contact.first_contact_result] || contact.first_contact_result
                            }</p>
                          )}
                          {contact.second_contact_date && (
                            <p><span className="text-muted-foreground">Drugi kontakt:</span> {formatDate(contact.second_contact_date)}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Źródło kontaktu - dla kontaktów prywatnych */}
                    {contactType === 'private' && (contact.contact_source || contact.contact_reason) && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <User className="w-4 h-4" /> Źródło kontaktu
                        </h4>
                        <div className="space-y-1 text-sm">
                          {contact.contact_source && (
                            <p><span className="text-muted-foreground">Skąd:</span> {contact.contact_source}</p>
                          )}
                          {contact.contact_reason && (
                            <p><span className="text-muted-foreground">Powód:</span> {contact.contact_reason}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Kontakt */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Phone className="w-4 h-4" /> {t('teamContacts.contactInfo')}
                      </h4>
                      <div className="space-y-1 text-sm">
                        {contact.phone_number && (
                          <p><span className="text-muted-foreground">{t('teamContacts.phone')}:</span> {contact.phone_number}</p>
                        )}
                        {contact.email && (
                          <p><span className="text-muted-foreground">{t('teamContacts.email')}:</span> {contact.email}</p>
                        )}
                        {contact.address && (
                          <p className="flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                            <span>{contact.address}</span>
                          </p>
                        )}
                        {contact.profession && (
                          <p><span className="text-muted-foreground">{t('teamContacts.profession')}:</span> {contact.profession}</p>
                        )}
                      </div>
                    </div>

                    {/* Struktura - tylko dla team_member */}
                    {contactType !== 'private' && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" /> {t('teamContacts.structure')}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">{t('teamContacts.addedOn')}:</span> {formatDate(contact.added_at)}</p>
                        {contact.contact_upline_first_name && (
                          <p>
                            <span className="text-muted-foreground">{t('teamContacts.upline')}:</span>{' '}
                            {contact.contact_upline_first_name} {contact.contact_upline_last_name}
                            {contact.contact_upline_eq_id && (
                              <span className="font-mono text-xs ml-1">({contact.contact_upline_eq_id})</span>
                            )}
                          </p>
                        )}
                        {contact.start_date && (
                          <p><span className="text-muted-foreground">{t('teamContacts.startDate')}:</span> {formatDate(contact.start_date)}</p>
                        )}
                        {contact.collaboration_level && (
                          <p><span className="text-muted-foreground">{t('teamContacts.level')}:</span> {contact.collaboration_level}</p>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Produkty - tylko dla prywatnych kontaktów */}
                    {contactType !== 'team_member' && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Package className="w-4 h-4" /> {t('teamContacts.products')}
                        </h4>
                        <div className="space-y-1 text-sm">
                          {contact.products && (
                            <p><span className="text-muted-foreground">{t('teamContacts.products')}:</span> {contact.products}</p>
                          )}
                          {contact.purchased_product && (
                            <p><span className="text-muted-foreground">{t('teamContacts.purchased')}:</span> {contact.purchased_product}</p>
                          )}
                          {contact.purchase_date && (
                            <p><span className="text-muted-foreground">{t('teamContacts.purchaseDate')}:</span> {formatDate(contact.purchase_date)}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Adnotacja po pierwszym kontakcie - dla prywatnych */}
                    {contactType === 'private' && contact.first_contact_annotation && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" /> Adnotacja po pierwszym kontakcie
                        </h4>
                        <p className="text-sm bg-muted/50 p-3 rounded-md">{contact.first_contact_annotation}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Bell className="w-4 h-4" /> {t('teamContacts.reminders')}
                      </h4>
                      <div className="space-y-1 text-sm">
                        {contact.next_contact_date && (
                          <p><span className="text-muted-foreground">{t('teamContacts.nextContact')}:</span> {formatDate(contact.next_contact_date)}</p>
                        )}
                        {contact.reminder_date && (
                          <p><span className="text-muted-foreground">{t('teamContacts.reminder')}:</span> {contact.reminder_date ? new Date(contact.reminder_date).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                        )}
                        {contact.reminder_note && (
                          <p className="text-muted-foreground italic">{contact.reminder_note}</p>
                        )}
                      </div>
                    </div>

                    {/* Notatki - edytowalne dla team_member */}
                    <div className="space-y-2 md:col-span-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> {t('teamContacts.notes')}
                      </h4>
                      
                      {/* Status konta - tylko dla team_member */}
                      {contactType === 'team_member' && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">{t('teamContacts.accountStatus')}:</span>
                          {getApprovalStatusBadge(contact)}
                        </div>
                      )}
                      
                      {contactType === 'team_member' && !readOnly ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingNotesId === contact.id ? notesValue : (contact.notes || '')}
                            onChange={(e) => setNotesValue(e.target.value)}
                            onFocus={() => {
                              if (editingNotesId !== contact.id) {
                                setEditingNotesId(contact.id);
                                setNotesValue(contact.notes || '');
                              }
                            }}
                            placeholder={t('teamContacts.addNotesPlaceholder')}
                            className="min-h-[80px]"
                          />
                          {editingNotesId === contact.id && (
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveNotes(contact.id)}
                              disabled={savingNotes}
                            >
                              <Save className="w-4 h-4 mr-1" />
                              {savingNotes ? t('common.saving') : t('teamContacts.saveNotes')}
                            </Button>
                          )}
                        </div>
                      ) : (
                        contact.notes ? (
                          <p className="text-sm bg-muted/50 p-3 rounded-md">{contact.notes}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{t('teamContacts.noNotes')}</p>
                        )
                      )}
                    </div>
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
            <AlertDialogTitle>{t('teamContacts.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('teamContacts.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  onDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
            >
              {t('common.delete')}
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