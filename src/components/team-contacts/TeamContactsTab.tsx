import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Download, Filter, Map, List, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContacts } from '@/hooks/useTeamContacts';
import { TeamContactsTable } from './TeamContactsTable';
import { TeamContactAccordion } from './TeamContactAccordion';
import { TeamContactForm } from './TeamContactForm';
import { TeamContactFilters } from './TeamContactFilters';
import { TeamContactExport } from './TeamContactExport';
import { TeamMap } from './TeamMap';
import type { TeamContact } from './types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const TeamContactsTab: React.FC = () => {
  const { isAdmin } = useAuth();
  const { contacts, loading, filters, setFilters, addContact, updateContact, deleteContact, getContactHistory } = useTeamContacts();
  
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingContact, setEditingContact] = useState<TeamContact | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [viewMode, setViewMode] = useState<'accordion' | 'table' | 'map'>('accordion');

  const handleAddContact = async (data: Omit<TeamContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const result = await addContact(data);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Pure – Moja Lista Kontaktów
              </CardTitle>
              <CardDescription>
                Zarządzaj kontaktami i strukturą swojego zespołu
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
            />
          )}
          
          {viewMode === 'accordion' ? (
            <TeamContactAccordion
              contacts={contacts}
              loading={loading}
              onEdit={openEditForm}
              onDelete={handleDeleteContact}
              getContactHistory={getContactHistory}
              isAdmin={isAdmin}
            />
          ) : viewMode === 'table' ? (
            <TeamContactsTable
              contacts={contacts}
              loading={loading}
              onEdit={openEditForm}
              onDelete={handleDeleteContact}
              getContactHistory={getContactHistory}
              isAdmin={isAdmin}
            />
          ) : (
            <TeamMap contacts={contacts} />
          )}
        </CardContent>
      </Card>

      {/* Add Contact Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj kontakt</DialogTitle>
            <DialogDescription>
              Wprowadź dane nowego kontaktu
            </DialogDescription>
          </DialogHeader>
          <TeamContactForm
            onSubmit={handleAddContact}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edytuj kontakt</DialogTitle>
            <DialogDescription>
              Zaktualizuj dane kontaktu
            </DialogDescription>
          </DialogHeader>
          {editingContact && (
            <TeamContactForm
              contact={editingContact}
              onSubmit={handleEditContact}
              onCancel={() => setEditingContact(null)}
            />
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
            contacts={contacts}
            onClose={() => setShowExport(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
