import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, Download, Filter, Map, List, LayoutGrid, Search, UserPlus, UsersRound, CheckCircle, Clock, XCircle, Mail, TreePine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContacts } from '@/hooks/useTeamContacts';
import { useSpecialistSearch } from '@/hooks/useSpecialistSearch';
import { useGuardianApproval } from '@/hooks/useGuardianApproval';
import { useOrganizationTree } from '@/hooks/useOrganizationTree';
import { TeamContactsTable } from './TeamContactsTable';
import { TeamContactAccordion } from './TeamContactAccordion';
import { TeamContactForm } from './TeamContactForm';
import { PrivateContactForm } from './PrivateContactForm';
import { TeamContactFilters } from './TeamContactFilters';
import { TeamContactExport } from './TeamContactExport';
import { TeamMap } from './TeamMap';
import { SpecialistSearch } from './SpecialistSearch';
import { OrganizationChart, OrganizationList } from './organization';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PendingApproval {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  eq_id: string | null;
  guardian_approved: boolean;
  created_at: string;
  phone_number: string | null;
  role: string;
  specialization: string | null;
  profile_description: string | null;
  city: string | null;
  country: string | null;
  email_activated?: boolean;
}

export const TeamContactsTab: React.FC = () => {
  const { isAdmin, isClient, isPartner, isSpecjalista, profile } = useAuth();
  const { contacts, loading, filters, setFilters, addContact, updateContact, deleteContact, getContactHistory, refetch } = useTeamContacts();
  const { canAccess: canSearchSpecialists } = useSpecialistSearch();
  const { tree, upline, statistics, settings: treeSettings, canAccessTree, loading: treeLoading } = useOrganizationTree();
  const location = useLocation();
  
  // Clients only see the specialist search tab, not private/team contacts
  const clientOnlyView = isClient && !isPartner && !isSpecjalista && !isAdmin;
  const { approveUser, rejectUser, loading: approvalLoading } = useGuardianApproval();
  
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingContact, setEditingContact] = useState<TeamContact | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [viewMode, setViewMode] = useState<'accordion' | 'table' | 'map'>('accordion');
  const [structureViewMode, setStructureViewMode] = useState<'list' | 'graph'>(treeSettings?.default_view || 'list');
  // For clients with specialist search access, default to search tab
  const [activeTab, setActiveTab] = useState<'private' | 'team' | 'search' | 'structure'>(clientOnlyView && canSearchSpecialists ? 'search' : 'private');
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
    } else if (subTab === 'structure') {
      setActiveTab('structure');
    }
  }, [location.search]);

  // Update structure view mode when settings load
  useEffect(() => {
    if (treeSettings?.default_view) {
      setStructureViewMode(treeSettings.default_view);
    }
  }, [treeSettings?.default_view]);

  // Fetch pending approvals for guardian
  const fetchPendingApprovals = async () => {
    if (!profile?.eq_id) return;
    
    setPendingLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id, guardian_approved, created_at, phone_number, role, specialization, profile_description, city, country, email_activated')
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
    fetchPendingApprovals();
  }, [profile?.eq_id]);

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

  const handleUpdateNotes = async (contactId: string, notes: string) => {
    await updateContact(contactId, { notes });
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
  const visibleTabsCount = (clientOnlyView ? 0 : 2) + (canSearchSpecialists ? 1 : 0) + (canAccessTree() ? 1 : 0);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'private' | 'team' | 'search' | 'structure')} className="space-y-4">
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
          {canAccessTree() && (
            <TabsTrigger value="structure" className="flex items-center gap-2">
              <TreePine className="w-4 h-4" />
              <span className="hidden sm:inline">Struktura</span>
              <span className="sm:hidden">Struktura</span>
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
                  <div className="space-y-3">
                    {pendingApprovals.map((pending) => (
                      <div 
                        key={pending.user_id} 
                        className="bg-white dark:bg-background rounded-md p-4 border"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-lg">
                                {pending.first_name} {pending.last_name}
                              </p>
                              <Badge variant={pending.role === 'partner' ? 'outline' : pending.role === 'specjalista' ? 'default' : 'secondary'}>
                                {pending.role === 'partner' ? 'Partner' : pending.role === 'specjalista' ? 'Specjalista' : 'Klient'}
                              </Badge>
                              {/* Email status badge */}
                              {pending.email_activated ? (
                                <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                                  ✓ Email
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                                  ✗ Email niepotwierdzony
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <p><span className="text-muted-foreground">Email:</span> {pending.email}</p>
                              {pending.phone_number && (
                                <p><span className="text-muted-foreground">Telefon:</span> {pending.phone_number}</p>
                              )}
                              {pending.eq_id && (
                                <p><span className="text-muted-foreground">EQ ID:</span> <span className="font-mono">{pending.eq_id}</span></p>
                              )}
                              {pending.city && (
                                <p><span className="text-muted-foreground">Lokalizacja:</span> {pending.city}{pending.country ? `, ${pending.country}` : ''}</p>
                              )}
                              {pending.specialization && (
                                <p><span className="text-muted-foreground">Specjalizacja:</span> {pending.specialization}</p>
                              )}
                              <p><span className="text-muted-foreground">Data rejestracji:</span> {new Date(pending.created_at).toLocaleDateString('pl-PL')}</p>
                            </div>
                            
                            {pending.profile_description && (
                              <div className="mt-2">
                                <p className="text-sm text-muted-foreground">Opis profilu:</p>
                                <p className="text-sm bg-muted/50 p-2 rounded-md mt-1">{pending.profile_description}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmReject(pending)}
                              disabled={approvalLoading}
                              className="text-destructive hover:text-destructive w-full sm:w-auto"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Odrzuć
                            </Button>
                            {/* Approve button - disabled if email not confirmed */}
                            {pending.email_activated ? (
                              <Button 
                                size="sm" 
                                onClick={() => setConfirmApproval(pending)}
                                disabled={approvalLoading}
                                className="w-full sm:w-auto"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Zatwierdź
                              </Button>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="secondary"
                                      disabled
                                      className="opacity-60 cursor-not-allowed w-full sm:w-auto"
                                    >
                                      <Mail className="w-4 h-4 mr-2" />
                                      Czeka na email
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Użytkownik musi najpierw potwierdzić swój adres email</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
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
                  onUpdateNotes={handleUpdateNotes}
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

        {/* Structure Tab */}
        {canAccessTree() && treeSettings && (
          <TabsContent value="structure">
            <div className="space-y-4">
              {/* View Toggle */}
              <div className="flex justify-end">
                <div className="flex border rounded-md overflow-hidden">
                  <Button
                    variant={structureViewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStructureViewMode('list')}
                    className="rounded-none"
                  >
                    <List className="w-4 h-4 mr-2" />
                    Lista
                  </Button>
                  <Button
                    variant={structureViewMode === 'graph' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStructureViewMode('graph')}
                    className="rounded-none"
                  >
                    <TreePine className="w-4 h-4 mr-2" />
                    Graf
                  </Button>
                </div>
              </div>

              {treeLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Ładowanie struktury...</p>
                  </CardContent>
                </Card>
              ) : structureViewMode === 'graph' ? (
                <OrganizationChart
                  tree={tree}
                  upline={upline}
                  settings={treeSettings}
                  statistics={statistics}
                />
              ) : (
                <OrganizationList
                  tree={tree}
                  upline={upline}
                  settings={treeSettings}
                  statistics={statistics}
                />
              )}
            </div>
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