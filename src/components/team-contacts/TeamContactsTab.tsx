import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Download, Filter } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContacts } from '@/hooks/useTeamContacts';
import { TeamContactsTable } from './TeamContactsTable';
import { TeamContactForm } from './TeamContactForm';
import { TeamContactFilters } from './TeamContactFilters';
import { TeamContactExport } from './TeamContactExport';
import type { TeamContact } from './types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const TeamContactsTab: React.FC = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const { contacts, loading, filters, setFilters, addContact, updateContact, deleteContact, getContactHistory } = useTeamContacts();
  
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingContact, setEditingContact] = useState<TeamContact | null>(null);
  const [showExport, setShowExport] = useState(false);

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('teamContacts.title') || 'Baza kontaktów zespołu'}
              </CardTitle>
              <CardDescription>
                {t('teamContacts.description') || 'Zarządzaj kontaktami swojego zespołu'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {t('teamContacts.filters') || 'Filtry'}
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExport(true)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('teamContacts.export') || 'Eksport'}
                </Button>
              )}
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('teamContacts.addContact') || 'Dodaj kontakt'}
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
          
          <TeamContactsTable
            contacts={contacts}
            loading={loading}
            onEdit={openEditForm}
            onDelete={handleDeleteContact}
            getContactHistory={getContactHistory}
            isAdmin={isAdmin}
          />
        </CardContent>
      </Card>

      {/* Add Contact Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('teamContacts.addContact') || 'Dodaj kontakt'}</DialogTitle>
            <DialogDescription>
              {t('teamContacts.addContactDescription') || 'Wprowadź dane nowego kontaktu'}
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
            <DialogTitle>{t('teamContacts.editContact') || 'Edytuj kontakt'}</DialogTitle>
            <DialogDescription>
              {t('teamContacts.editContactDescription') || 'Zaktualizuj dane kontaktu'}
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
            <DialogTitle>{t('teamContacts.exportTitle') || 'Eksportuj kontakty'}</DialogTitle>
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
