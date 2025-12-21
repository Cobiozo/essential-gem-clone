import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TeamContact } from './types';

interface TeamContactFormProps {
  contact?: TeamContact;
  onSubmit: (data: Omit<TeamContact, 'id' | 'user_id' | 'created_at' | 'updated_at'> | Partial<TeamContact>) => void;
  onCancel: () => void;
}

export const TeamContactForm: React.FC<TeamContactFormProps> = ({
  contact,
  onSubmit,
  onCancel,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    eq_id: contact?.eq_id || '',
    role: contact?.role || 'client',
    notes: contact?.notes || '',
    added_at: contact?.added_at || new Date().toISOString().split('T')[0],
    is_active: contact?.is_active ?? true,
    
    // Client fields
    purchased_product: contact?.purchased_product || '',
    purchase_date: contact?.purchase_date || '',
    client_status: contact?.client_status || 'active',
    
    // Partner/Specialist fields
    collaboration_level: contact?.collaboration_level || '',
    start_date: contact?.start_date || '',
    partner_status: contact?.partner_status || 'active',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const data: any = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      eq_id: formData.eq_id || null,
      role: formData.role as 'client' | 'partner' | 'specjalista',
      notes: formData.notes || null,
      added_at: formData.added_at,
      is_active: formData.is_active,
    };

    // Add role-specific fields
    if (formData.role === 'client') {
      data.purchased_product = formData.purchased_product || null;
      data.purchase_date = formData.purchase_date || null;
      data.client_status = formData.client_status || null;
      data.collaboration_level = null;
      data.start_date = null;
      data.partner_status = null;
    } else {
      data.collaboration_level = formData.collaboration_level || null;
      data.start_date = formData.start_date || null;
      data.partner_status = formData.partner_status || null;
      data.purchased_product = null;
      data.purchase_date = null;
      data.client_status = null;
    }

    await onSubmit(data);
    setLoading(false);
  };

  const isClient = formData.role === 'client';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h4 className="font-medium">{t('teamContacts.basicInfo') || 'Dane podstawowe'}</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">{t('teamContacts.firstName') || 'Imię'} *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">{t('teamContacts.lastName') || 'Nazwisko'} *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="eq_id">EQID</Label>
            <Input
              id="eq_id"
              value={formData.eq_id}
              onChange={(e) => setFormData({ ...formData, eq_id: e.target.value })}
              placeholder="Opcjonalne"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">{t('teamContacts.role') || 'Rola'} *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as 'client' | 'partner' | 'specjalista' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">{t('role.client') || 'Klient'}</SelectItem>
                <SelectItem value="partner">{t('role.partner') || 'Partner'}</SelectItem>
                <SelectItem value="specjalista">{t('role.specialist') || 'Specjalista'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="added_at">{t('teamContacts.addedAt') || 'Data dodania'}</Label>
          <Input
            id="added_at"
            type="date"
            value={formData.added_at}
            onChange={(e) => setFormData({ ...formData, added_at: e.target.value })}
          />
        </div>
      </div>

      <Separator />

      {/* Role-specific fields */}
      <div className="space-y-4">
        <h4 className="font-medium">
          {isClient 
            ? (t('teamContacts.clientDetails') || 'Dane klienta')
            : (t('teamContacts.partnerDetails') || 'Dane partnera/specjalisty')
          }
        </h4>

        {isClient ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchased_product">{t('teamContacts.purchasedProduct') || 'Zakupiony produkt'}</Label>
                <Input
                  id="purchased_product"
                  value={formData.purchased_product}
                  onChange={(e) => setFormData({ ...formData, purchased_product: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_date">{t('teamContacts.purchaseDate') || 'Data zakupu'}</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_status">{t('teamContacts.status') || 'Status'}</Label>
              <Select
                value={formData.client_status || 'active'}
                onValueChange={(value) => setFormData({ ...formData, client_status: value as 'active' | 'inactive' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('admin.active') || 'Aktywny'}</SelectItem>
                  <SelectItem value="inactive">{t('admin.inactive') || 'Nieaktywny'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collaboration_level">{t('teamContacts.collaborationLevel') || 'Poziom współpracy'}</Label>
                <Input
                  id="collaboration_level"
                  value={formData.collaboration_level}
                  onChange={(e) => setFormData({ ...formData, collaboration_level: e.target.value })}
                  placeholder="np. Bronze, Silver, Gold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">{t('teamContacts.startDate') || 'Data rozpoczęcia'}</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner_status">{t('teamContacts.status') || 'Status'}</Label>
              <Select
                value={formData.partner_status || 'active'}
                onValueChange={(value) => setFormData({ ...formData, partner_status: value as 'active' | 'suspended' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('admin.active') || 'Aktywny'}</SelectItem>
                  <SelectItem value="suspended">{t('teamContacts.suspended') || 'Wstrzymany'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('teamContacts.notes') || 'Notatki'}</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder={t('teamContacts.notesPlaceholder') || 'Dodatkowe informacje o kontakcie...'}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {t('admin.cancel') || 'Anuluj'}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading 
            ? (t('common.loading') || 'Zapisywanie...')
            : contact 
              ? (t('admin.save') || 'Zapisz')
              : (t('teamContacts.addContact') || 'Dodaj kontakt')
          }
        </Button>
      </div>
    </form>
  );
};
