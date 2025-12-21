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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TeamContact } from './types';
import { User, Briefcase, Calendar, Bell } from 'lucide-react';

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
    // Basic info
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    eq_id: contact?.eq_id || '',
    role: contact?.role || 'client',
    address: contact?.address || '',
    phone_number: contact?.phone_number || '',
    email: contact?.email || '',
    profession: contact?.profession || '',
    added_at: contact?.added_at || new Date().toISOString().split('T')[0],
    is_active: contact?.is_active ?? true,
    
    // Contact's upline
    contact_upline_eq_id: contact?.contact_upline_eq_id || '',
    contact_upline_first_name: contact?.contact_upline_first_name || '',
    contact_upline_last_name: contact?.contact_upline_last_name || '',
    
    // Relationship
    relationship_status: contact?.relationship_status || 'active',
    products: contact?.products || '',
    
    // Reminder
    next_contact_date: contact?.next_contact_date || '',
    reminder_date: contact?.reminder_date ? contact.reminder_date.split('T')[0] : '',
    reminder_note: contact?.reminder_note || '',
    
    // Notes
    notes: contact?.notes || '',
    
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
      address: formData.address || null,
      phone_number: formData.phone_number || null,
      email: formData.email || null,
      profession: formData.profession || null,
      contact_upline_eq_id: formData.contact_upline_eq_id || null,
      contact_upline_first_name: formData.contact_upline_first_name || null,
      contact_upline_last_name: formData.contact_upline_last_name || null,
      relationship_status: formData.relationship_status || 'active',
      products: formData.products || null,
      next_contact_date: formData.next_contact_date || null,
      reminder_date: formData.reminder_date ? new Date(formData.reminder_date).toISOString() : null,
      reminder_note: formData.reminder_note || null,
      reminder_sent: false,
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
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="text-xs">
            <User className="w-3 h-3 mr-1" />
            Podstawowe
          </TabsTrigger>
          <TabsTrigger value="structure" className="text-xs">
            <Briefcase className="w-3 h-3 mr-1" />
            Struktura
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            Szczegóły
          </TabsTrigger>
          <TabsTrigger value="reminder" className="text-xs">
            <Bell className="w-3 h-3 mr-1" />
            Przypomnienia
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4 mt-4">
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Telefon</Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Opcjonalny"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profession">Zawód</Label>
              <Input
                id="profession"
                value={formData.profession}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq_id">EQID</Label>
              <Input
                id="eq_id"
                value={formData.eq_id}
                onChange={(e) => setFormData({ ...formData, eq_id: e.target.value })}
                placeholder="Jeśli dotyczy"
              />
            </div>
          </div>
        </TabsContent>

        {/* Structure Tab */}
        <TabsContent value="structure" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="relationship_status">Status relacji</Label>
              <Select
                value={formData.relationship_status || 'active'}
                onValueChange={(value) => setFormData({ ...formData, relationship_status: value as 'active' | 'suspended' | 'closed_success' | 'closed_not_now' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktywny</SelectItem>
                  <SelectItem value="suspended">Wstrzymany</SelectItem>
                  <SelectItem value="closed_success">Zamknięty - sukces</SelectItem>
                  <SelectItem value="closed_not_now">Zamknięty - nie teraz</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />
          
          <h4 className="font-medium text-sm text-muted-foreground">Upline kontaktu</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_upline_first_name">Imię</Label>
              <Input
                id="contact_upline_first_name"
                value={formData.contact_upline_first_name}
                onChange={(e) => setFormData({ ...formData, contact_upline_first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_upline_last_name">Nazwisko</Label>
              <Input
                id="contact_upline_last_name"
                value={formData.contact_upline_last_name}
                onChange={(e) => setFormData({ ...formData, contact_upline_last_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_upline_eq_id">EQID</Label>
              <Input
                id="contact_upline_eq_id"
                value={formData.contact_upline_eq_id}
                onChange={(e) => setFormData({ ...formData, contact_upline_eq_id: e.target.value })}
              />
            </div>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="added_at">Data dołączenia</Label>
            <Input
              id="added_at"
              type="date"
              value={formData.added_at}
              onChange={(e) => setFormData({ ...formData, added_at: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="products">Produkt / Produkty</Label>
            <Input
              id="products"
              value={formData.products}
              onChange={(e) => setFormData({ ...formData, products: e.target.value })}
              placeholder="np. Koneser, Life Pack"
            />
          </div>

          <Separator className="my-4" />

          {/* Role-specific fields */}
          <h4 className="font-medium text-sm text-muted-foreground">
            {isClient ? 'Dane klienta' : 'Dane partnera/specjalisty'}
          </h4>

          {isClient ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchased_product">Zakupiony produkt</Label>
                  <Input
                    id="purchased_product"
                    value={formData.purchased_product}
                    onChange={(e) => setFormData({ ...formData, purchased_product: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Data zakupu</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_status">Status klienta</Label>
                <Select
                  value={formData.client_status || 'active'}
                  onValueChange={(value) => setFormData({ ...formData, client_status: value as 'active' | 'inactive' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktywny</SelectItem>
                    <SelectItem value="inactive">Nieaktywny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="collaboration_level">Poziom współpracy</Label>
                  <Input
                    id="collaboration_level"
                    value={formData.collaboration_level}
                    onChange={(e) => setFormData({ ...formData, collaboration_level: e.target.value })}
                    placeholder="np. Bronze, Silver, Gold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data rozpoczęcia</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner_status">Status partnera</Label>
                <Select
                  value={formData.partner_status || 'active'}
                  onValueChange={(value) => setFormData({ ...formData, partner_status: value as 'active' | 'suspended' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktywny</SelectItem>
                    <SelectItem value="suspended">Wstrzymany</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </TabsContent>

        {/* Reminder Tab */}
        <TabsContent value="reminder" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="next_contact_date">Kiedy się odezwać ponownie</Label>
            <Input
              id="next_contact_date"
              type="date"
              value={formData.next_contact_date}
              onChange={(e) => setFormData({ ...formData, next_contact_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder_date">Data przypomnienia</Label>
            <Input
              id="reminder_date"
              type="date"
              value={formData.reminder_date}
              onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder_note">Treść przypomnienia</Label>
            <Textarea
              id="reminder_note"
              value={formData.reminder_note}
              onChange={(e) => setFormData({ ...formData, reminder_note: e.target.value })}
              placeholder="Co chcesz zapamiętać przy następnym kontakcie..."
              rows={3}
            />
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Label htmlFor="notes">Notatki / Uwagi</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Dodatkowe informacje o kontakcie..."
              rows={3}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
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
