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
import type { TeamContact } from './types';
import { User, Calendar, Bell, MessageSquare } from 'lucide-react';

interface PrivateContactFormProps {
  contact?: TeamContact;
  onSubmit: (data: Omit<TeamContact, 'id' | 'user_id' | 'created_at' | 'updated_at'> | Partial<TeamContact>) => void;
  onCancel: () => void;
}

export const PrivateContactForm: React.FC<PrivateContactFormProps> = ({
  contact,
  onSubmit,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Basic info
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    phone_number: contact?.phone_number || '',
    email: contact?.email || '',
    profession: contact?.profession || '',
    address: contact?.address || '',
    added_at: contact?.added_at || new Date().toISOString().split('T')[0],
    
    // Relationship status for private contacts
    relationship_status: contact?.relationship_status || 'observation',
    
    // Notes and reminders
    notes: contact?.notes || '',
    next_contact_date: contact?.next_contact_date || '',
    reminder_date: contact?.reminder_date ? contact.reminder_date.split('T')[0] : '',
    reminder_note: contact?.reminder_note || '',
    
    // Products interest
    products: contact?.products || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const data: any = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone_number: formData.phone_number || null,
      email: formData.email || null,
      profession: formData.profession || null,
      address: formData.address || null,
      relationship_status: formData.relationship_status || 'observation',
      notes: formData.notes || null,
      next_contact_date: formData.next_contact_date || null,
      reminder_date: formData.reminder_date ? new Date(formData.reminder_date).toISOString() : null,
      reminder_note: formData.reminder_note || null,
      products: formData.products || null,
      added_at: formData.added_at,
      is_active: true,
      contact_type: 'private',
      // Private contacts don't have these system fields
      eq_id: null,
      linked_user_id: null,
      role: 'client', // Default role for tracking
      reminder_sent: false,
    };

    await onSubmit(data);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic" className="text-xs">
            <User className="w-3 h-3 mr-1" />
            Dane
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">
            <MessageSquare className="w-3 h-3 mr-1" />
            Notatki
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
              <Label htmlFor="first_name">Imię *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nazwisko *</Label>
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
              <Label htmlFor="phone_number">Telefon</Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
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
              <Label htmlFor="relationship_status">Status relacji</Label>
              <Select
                value={formData.relationship_status || 'observation'}
                onValueChange={(value) => setFormData({ ...formData, relationship_status: value as TeamContact['relationship_status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="observation">Obserwacja</SelectItem>
                  <SelectItem value="active">Klient</SelectItem>
                  <SelectItem value="potential_partner">Potencjalny partner</SelectItem>
                  <SelectItem value="potential_specialist">Potencjalny specjalista</SelectItem>
                  <SelectItem value="closed_success">Zamknięty - sukces</SelectItem>
                  <SelectItem value="closed_not_now">Zamknięty - nie teraz</SelectItem>
                </SelectContent>
              </Select>
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

          <div className="space-y-2">
            <Label htmlFor="products">Zainteresowanie produktami</Label>
            <Input
              id="products"
              value={formData.products}
              onChange={(e) => setFormData({ ...formData, products: e.target.value })}
              placeholder="np. Koneser, Life Pack, Omega-3"
            />
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notatki z rozmów</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Zapisz ważne informacje z rozmów, preferencje, pytania..."
              rows={8}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="added_at">Data pierwszego kontaktu</Label>
            <Input
              id="added_at"
              type="date"
              value={formData.added_at}
              onChange={(e) => setFormData({ ...formData, added_at: e.target.value })}
            />
          </div>
        </TabsContent>

        {/* Reminder Tab */}
        <TabsContent value="reminder" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="next_contact_date">Data kolejnego kontaktu</Label>
            <Input
              id="next_contact_date"
              type="date"
              value={formData.next_contact_date}
              onChange={(e) => setFormData({ ...formData, next_contact_date: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Kiedy planujesz się odezwać do tej osoby
            </p>
          </div>

          <Separator className="my-4" />

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
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Anuluj
        </Button>
        <Button type="submit" disabled={loading}>
          {loading 
            ? 'Zapisywanie...'
            : contact 
              ? 'Zapisz'
              : 'Dodaj kontakt'
          }
        </Button>
      </div>
    </form>
  );
};