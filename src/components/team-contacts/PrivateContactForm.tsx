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
import type { TeamContact } from './types';

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
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    phone_number: contact?.phone_number || '',
    email: contact?.email || '',
    profession: contact?.profession || '',
    address: contact?.address || '',
    added_at: contact?.added_at || new Date().toISOString().split('T')[0],
    relationship_status: contact?.relationship_status || 'observation',
    notes: contact?.notes || '',
    next_contact_date: contact?.next_contact_date || '',
    reminder_date: contact?.reminder_date ? contact.reminder_date.split('T')[0] : '',
    reminder_note: contact?.reminder_note || '',
    products: contact?.products || '',
    contact_source: contact?.contact_source || '',
    contact_reason: contact?.contact_reason || '',
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
      contact_source: formData.contact_source || null,
      contact_reason: formData.contact_reason || null,
      added_at: formData.added_at,
      is_active: true,
      contact_type: 'private',
      eq_id: null,
      linked_user_id: null,
      role: 'client',
      reminder_sent: false,
    };

    await onSubmit(data);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Dane podstawowe */}
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
              <SelectItem value="observation">Czynny obserwujący</SelectItem>
              <SelectItem value="potential_client">Potencjalny klient</SelectItem>
              <SelectItem value="potential_partner">Potencjalny partner</SelectItem>
              <SelectItem value="closed_success">Zamknięty - sukces dołączył</SelectItem>
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

      <Separator className="my-2" />

      {/* Źródło i cel kontaktu */}
      <div className="space-y-2">
        <Label htmlFor="contact_source">Skąd jest kontakt</Label>
        <Input
          id="contact_source"
          value={formData.contact_source}
          onChange={(e) => setFormData({ ...formData, contact_source: e.target.value })}
          placeholder="np. Facebook, Instagram, basen, zawody, polecenie"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_reason">Dlaczego chcesz się odezwać</Label>
        <Textarea
          id="contact_reason"
          value={formData.contact_reason}
          onChange={(e) => setFormData({ ...formData, contact_reason: e.target.value })}
          placeholder="Podaj powód, dla którego ten kontakt jest dla Ciebie ważny..."
          rows={3}
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

      <Separator className="my-2" />

      {/* Notatki */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notatki z rozmów</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Zapisz ważne informacje z rozmów, preferencje, pytania..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="added_at">Data pierwszego kontaktu</Label>
        <Input
          id="added_at"
          type="date"
          value={formData.added_at}
          onChange={(e) => setFormData({ ...formData, added_at: e.target.value })}
          className="[&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:sepia [&::-webkit-calendar-picker-indicator]:saturate-[10] [&::-webkit-calendar-picker-indicator]:hue-rotate-[15deg]"
        />
      </div>

      <Separator className="my-2" />

      {/* Przypomnienia */}
      <div className="space-y-2">
        <Label htmlFor="next_contact_date">Data kolejnego kontaktu</Label>
        <Input
          id="next_contact_date"
          type="date"
          value={formData.next_contact_date}
          onChange={(e) => setFormData({ ...formData, next_contact_date: e.target.value })}
          className="[&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:sepia [&::-webkit-calendar-picker-indicator]:saturate-[10] [&::-webkit-calendar-picker-indicator]:hue-rotate-[15deg]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reminder_date">Data przypomnienia</Label>
        <Input
          id="reminder_date"
          type="date"
          value={formData.reminder_date}
          onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
          className="[&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:sepia [&::-webkit-calendar-picker-indicator]:saturate-[10] [&::-webkit-calendar-picker-indicator]:hue-rotate-[15deg]"
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
