import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, Download, Filter, Map, List, LayoutGrid, Search, UserPlus, UsersRound, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContacts } from '@/hooks/useTeamContacts';
import { useSpecialistSearch } from '@/hooks/useSpecialistSearch';
import { useGuardianApproval } from '@/hooks/useGuardianApproval';
import { TeamContactsTable } from './TeamContactsTable';
import { TeamContactAccordion } from './TeamContactAccordion';
import { TeamContactForm } from './TeamContactForm';
import { PrivateContactForm } from './PrivateContactForm';
import { TeamContactFilters } from './TeamContactFilters';
import { TeamContactExport } from './TeamContactExport';
import { TeamMap } from './TeamMap';
import { SpecialistSearch } from './SpecialistSearch';
import { supabase } from '@/integrations/supabase/client';
import type { TeamContact, ContactType } from './types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface PendingApproval {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  eq_id: string | null;
  guardian_approved: boolean;
  created_at: string;
}

export const TeamContactsTab: React.FC = () => {
  const { isAdmin, isClient, isPartner, isSpecjalista, profile } = useAuth();
  const { contacts, loading, filters, setFilters, addContact, updateContact, deleteContact, getContactHistory, refetch } = useTeamContacts();
  const { canAccess: canSearchSpecialists } = useSpecialistSearch();
  const location = useLocation();
  
  // Clients only see the specialist search tab, not private/team contacts
  const clientOnlyView = isClient && !isPartner && !isSpecjalista && !isAdmin;
  const { approveUser, rejectUser, loading: approvalLoading } = useGuardianApproval();
  
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingContact, setEditingContact] = useState<TeamContact | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [viewMode, setViewMode] = useState<'accordion' | 'table' | 'map'>('accordion');
  // For clients with specialist search access, default to search tab
  const [activeTab, setActiveTab] = useState<'private' | 'team' | 'search'>(clientOnlyView && canSearchSpecialists ? 'search' : 'private');
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [confirmApproval, setConfirmApproval] = useState<PendingApproval | null>(null);
  const [confirmReject, setConfirmReject] = useState<PendingApproval | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Handle URL subTab parameter for deep linking from notifications
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const subTab = urlParams.get('subTab');
    if (subTab === 'team') {
      setActiveTab('team');
    } else if (subTab === 'private') {
      setActiveTab('private');
    } else if (subTab === 'search') {
      setActiveTab('search');
    }
  }, [location.search]);

  // Fetch pending approvals for guardian
  const fetchPendingApprovals = async () => {
    if (!profile?.eq_id) return;
    
    setPendingLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id, guardian_approved, created_at')
        .eq('upline_eq_id', profile.eq_id)
        .eq('guardian_approved', false);
      
      if (error) throw error;
      setPendingApprovals(data || []);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'team') {
      fetchPendingApprovals();
    }
  }, [activeTab, profile?.eq_id]);

  // Update filters when tab changes
  useEffect(() => {
    if (activeTab === 'private') {
      setFilters(prev => ({ ...prev, contactType: 'private' }));
    } else if (activeTab === 'team') {
      setFilters(prev => ({ ...prev, contactType: 'team_member' }));
    }
  }, [activeTab, setFilters]);

  const handleAddContact = async (data: Omit<TeamContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    // Set contact_type based on active tab
    const contactData = {
      ...data,
      contact_type: activeTab === 'team' ? 'team_member' : 'private' as ContactType,
    };
    const result = await addContact(contactData);
    if (result) {
      setShowForm(false);
    }
  };

  const handleEditContact = async (data: Partial<TeamContact>) => {
    if (!editingContact) return;
    const result = await updateContact(editingContact.id, data);
    if (result) {
      setEditingContact(null);
    }
  };

  const handleDeleteContact = async (id: string) => {
    await deleteContact(id);
  };

  const openEditForm = (contact: TeamContact) => {
    setEditingContact(contact);
  };

  const handleApproveUser = async (pending: PendingApproval) => {
    const success = await approveUser(pending.user_id);
    if (success) {
      setPendingApprovals(prev => prev.filter(p => p.user_id !== pending.user_id));
      setConfirmApproval(null);
      refetch();
    }
  };

  const handleRejectUser = async (pending: PendingApproval) => {
    const success = await rejectUser(pending.user_id, rejectionReason || undefined);
    if (success) {
      setPendingApprovals(prev => prev.filter(p => p.user_id !== pending.user_id));
      setConfirmReject(null);
      setRejectionReason('');
      refetch();
    }
  };

  // Filter contacts by type for display
  const filteredContacts = contacts.filter(c => {
    if (activeTab === 'private') return c.contact_type === 'private';
    if (activeTab === 'team') return c.contact_type === 'team_member';
    return true;
  });

  const isTeamMemberTab = activeTab === 'team';
  const isPrivateTab = activeTab === 'private';

  // Calculate visible tabs count for grid
  const visibleTabsCount = (clientOnlyView ? 0 : 2) + (canSearchSpecialists ? 1 : 0);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'private' | 'team' | 'search')} className="space-y-4">
        <TabsList className={`grid w-full lg:w-auto lg:inline-flex`} style={{ gridTemplateColumns: `repeat(${visibleTabsCount}, minmax(0, 1fr))` }}>
          {!clientOnlyView && (
            <TabsTrigger value="private" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Kontakty prywatne</span>
              <span className="sm:hidden">Prywatne</span>
            </TabsTrigger>
          )}
          {!clientOnlyView && (
            <TabsTrigger value="team" className="flex items-center gap-2 relative">
              <UsersRound className="w-4 h-4" />
              <span className="hidden sm:inline">Członkowie zespołu</span>
              <span className="sm:hidden">Zespół</span>
              {pendingApprovals.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingApprovals.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          {canSearchSpecialists && (
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Szukaj specjalisty</span>
              <span className="sm:hidden">Szukaj</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Private Contacts Tab */}
        <TabsContent value="private">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Kontakty prywatne
                  </CardTitle>
                  <CardDescription>
                    Osoby spoza systemu - potencjalni klienci, partnerzy i specjaliści
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Toggle */}
                  <div className="flex border rounded-md overflow-hidden">
                    <Button
                      variant={viewMode === 'accordion' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('accordion')}
                      className="rounded-none"
                      title="Widok zwijany"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="rounded-none"
                      title="Widok tabeli"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filtry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExport(true)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Eksport
                  </Button>
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj kontakt
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showFilters && (
                <TeamContactFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  isAdmin={isAdmin}
                  contactType="private"
                />
              )}
              
              {viewMode === 'accordion' ? (
                <TeamContactAccordion
                  contacts={filteredContacts}
                  loading={loading}
                  onEdit={openEditForm}
                  onDelete={handleDeleteContact}
                  getContactHistory={getContactHistory}
                  isAdmin={isAdmin}
                  contactType="private"
                />
              ) : (
                <TeamContactsTable
                  contacts={filteredContacts}
                  loading={loading}
                  onEdit={openEditForm}
                  onDelete={handleDeleteContact}
                  getContactHistory={getContactHistory}
                  isAdmin={isAdmin}
                  contactType="private"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Members Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UsersRound className="w-5 h-5" />
                    Członkowie zespołu
                  </CardTitle>
                  <CardDescription>
                    Zarejestrowani użytkownicy platformy przypisani do Ciebie jako opiekuna
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Toggle */}
                  <div className="flex border rounded-md overflow-hidden">
                    <Button
                      variant={viewMode === 'accordion' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('accordion')}
                      className="rounded-none"
                      title="Widok zwijany"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="rounded-none"
                      title="Widok tabeli"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'map' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('map')}
                      className="rounded-none"
                      title="Mapa zespołu"
                    >
                      <Map className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filtry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExport(true)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Eksport
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pending Approvals Section */}
              {pendingApprovals.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4" />
                    Oczekujące zatwierdzenia ({pendingApprovals.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingApprovals.map((pending) => (
                      <div 
                        key={pending.user_id} 
                        className="flex items-center justify-between bg-white dark:bg-background rounded-md p-3 border"
                      >
                        <div>
                          <p className="font-medium">
                            {pending.first_name} {pending.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {pending.email} {pending.eq_id && `• ${pending.eq_id}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmReject(pending)}
                            disabled={approvalLoading}
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Odrzuć
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => setConfirmApproval(pending)}
                            disabled={approvalLoading}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Zatwierdź
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {showFilters && (
                <TeamContactFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  isAdmin={isAdmin}
                  contactType="team_member"
                />
              )}
              
              {viewMode === 'accordion' ? (
                <TeamContactAccordion
                  contacts={filteredContacts}
                  loading={loading}
                  onEdit={openEditForm}
                  onDelete={handleDeleteContact}
                  getContactHistory={getContactHistory}
                  isAdmin={isAdmin}
                  contactType="team_member"
                  readOnly={!isAdmin}
                />
              ) : viewMode === 'table' ? (
                <TeamContactsTable
                  contacts={filteredContacts}
                  loading={loading}
                  onEdit={openEditForm}
                  onDelete={handleDeleteContact}
                  getContactHistory={getContactHistory}
                  isAdmin={isAdmin}
                  contactType="team_member"
                  readOnly={!isAdmin}
                />
              ) : (
                <TeamMap contacts={filteredContacts} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canSearchSpecialists && (
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Wyszukiwarka specjalistów
                </CardTitle>
                <CardDescription>
                  Wyszukaj specjalistę według słów kluczowych, specjalizacji lub lokalizacji
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SpecialistSearch />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Confirm Approval Dialog */}
      <AlertDialog open={!!confirmApproval} onOpenChange={() => setConfirmApproval(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź zatwierdzenie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz zatwierdzić użytkownika{' '}
              <strong>{confirmApproval?.first_name} {confirmApproval?.last_name}</strong>?
              <br /><br />
              Po zatwierdzeniu, konto użytkownika zostanie przekazane do Administratora do ostatecznej weryfikacji.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmApproval && handleApproveUser(confirmApproval)}
              disabled={approvalLoading}
            >
              {approvalLoading ? 'Zatwierdzanie...' : 'Zatwierdź'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Reject Dialog */}
      <AlertDialog open={!!confirmReject} onOpenChange={() => { setConfirmReject(null); setRejectionReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź odrzucenie</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Czy na pewno chcesz odrzucić rejestrację użytkownika{' '}
                  <strong>{confirmReject?.first_name} {confirmReject?.last_name}</strong>?
                </p>
                <p className="text-destructive">
                  Ta operacja dezaktywuje konto użytkownika.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Powód odrzucenia (opcjonalnie)</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Podaj powód odrzucenia rejestracji..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>Anuluj</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmReject && handleRejectUser(confirmReject)}
              disabled={approvalLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {approvalLoading ? 'Odrzucanie...' : 'Odrzuć rejestrację'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Contact Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj kontakt prywatny</DialogTitle>
            <DialogDescription>
              Dodaj osobę spoza systemu do swojej bazy kontaktów
            </DialogDescription>
          </DialogHeader>
          <PrivateContactForm
            onSubmit={handleAddContact}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContact?.contact_type === 'team_member' ? 'Podgląd członka zespołu' : 'Edytuj kontakt'}
            </DialogTitle>
            <DialogDescription>
              {editingContact?.contact_type === 'team_member' 
                ? 'Dane członka zespołu są synchronizowane z profilem użytkownika'
                : 'Zaktualizuj dane kontaktu'
              }
            </DialogDescription>
          </DialogHeader>
          {editingContact && (
            editingContact.contact_type === 'team_member' ? (
              <TeamContactForm
                contact={editingContact}
                onSubmit={handleEditContact}
                onCancel={() => setEditingContact(null)}
                readOnly={!isAdmin}
              />
            ) : (
              <PrivateContactForm
                contact={editingContact}
                onSubmit={handleEditContact}
                onCancel={() => setEditingContact(null)}
              />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eksportuj kontakty</DialogTitle>
          </DialogHeader>
          <TeamContactExport
            contacts={filteredContacts}
            onClose={() => setShowExport(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};