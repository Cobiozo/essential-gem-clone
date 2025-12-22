import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Download, Filter, Map, List, LayoutGrid, Search, UserPlus, UsersRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContacts } from '@/hooks/useTeamContacts';
import { useSpecialistSearch } from '@/hooks/useSpecialistSearch';
import { TeamContactsTable } from './TeamContactsTable';
import { TeamContactAccordion } from './TeamContactAccordion';
import { TeamContactForm } from './TeamContactForm';
import { PrivateContactForm } from './PrivateContactForm';
import { TeamContactFilters } from './TeamContactFilters';
import { TeamContactExport } from './TeamContactExport';
import { TeamMap } from './TeamMap';
import { SpecialistSearch } from './SpecialistSearch';
import type { TeamContact, ContactType } from './types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const TeamContactsTab: React.FC = () => {
  const { isAdmin } = useAuth();
  const { contacts, loading, filters, setFilters, addContact, updateContact, deleteContact, getContactHistory, refetch } = useTeamContacts();
  const { canAccess: canSearchSpecialists } = useSpecialistSearch();
  
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingContact, setEditingContact] = useState<TeamContact | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [viewMode, setViewMode] = useState<'accordion' | 'table' | 'map'>('accordion');
  const [activeTab, setActiveTab] = useState<'private' | 'team' | 'search'>('private');

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

  // Filter contacts by type for display
  const filteredContacts = contacts.filter(c => {
    if (activeTab === 'private') return c.contact_type === 'private';
    if (activeTab === 'team') return c.contact_type === 'team_member';
    return true;
  });

  const isTeamMemberTab = activeTab === 'team';
  const isPrivateTab = activeTab === 'private';

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'private' | 'team' | 'search')} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="private" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Kontakty prywatne</span>
            <span className="sm:hidden">Prywatne</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <UsersRound className="w-4 h-4" />
            <span className="hidden sm:inline">Członkowie zespołu</span>
            <span className="sm:hidden">Zespół</span>
          </TabsTrigger>
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
            <CardContent>
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