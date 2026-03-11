import React, { useState } from 'react';
import { fromZonedTime } from 'date-fns-tz';
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
import { ContactEventHistory } from './ContactEventHistory';
import type { TeamContact } from './types';

interface PrivateContactFormProps {
  contact?: TeamContact;
  onSubmit: (data: Omit<TeamContact, 'id' | 'user_id' | 'created_at' | 'updated_at'> | Partial<TeamContact>) => Promise<boolean> | void;
  onCancel: () => void;
}

export const PrivateContactForm: React.FC<PrivateContactFormProps> = ({
  contact,
  onSubmit,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const createdAtDisplay = contact?.created_at
    ? new Date(contact.created_at).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const [formData, setFormData] = useState({
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    phone_number: contact?.phone_number || '',
    email: contact?.email || '',
    profession: contact?.profession || '',
    address: contact?.address || '',
    added_at: contact?.added_at || new Date().toISOString().split('T')[0],
    second_contact_date: contact?.second_contact_date || '',
    first_contact_annotation: contact?.first_contact_annotation || '',
    first_contact_result: contact?.first_contact_result || '',
    relationship_status: contact?.relationship_status || 'observation',
    notes: contact?.notes || '',
    next_contact_date: contact?.next_contact_date || '',
    reminder_date: contact?.reminder_date ? contact.reminder_date.split('T')[0] : '',
    reminder_hour: contact?.reminder_date
      ? new Date(contact.reminder_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' }).split(':')[0]
      : '10',
    reminder_minute: contact?.reminder_date
      ? (parseInt(new Date(contact.reminder_date).toLocaleTimeString('en-GB', { minute: '2-digit', timeZone: 'Europe/Warsaw' }).split(':')[1] || '0') >= 30 ? '30' : '00')
      : '00',
    reminder_note: contact?.reminder_note || '',
    products: contact?.products || '',
    contact_source: contact?.contact_source || '',
    contact_reason: contact?.contact_reason || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate reminder fields
    if (formData.reminder_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.reminder_date)) {
        setError('Data przypomnienia musi być w formacie RRRR-MM-DD.');
        setLoading(false);
        return;
      }
      // Hour/minute selects always produce valid values, no regex needed
    }

    // Validate chronological order of dates
    const addedAt = formData.added_at;
    if (formData.second_contact_date && addedAt && formData.second_contact_date < addedAt) {
      setError('Data drugiego kontaktu nie może być wcześniejsza niż data pierwszego kontaktu.');
      setLoading(false);
      return;
    }
    if (formData.next_contact_date) {
      const minDate = formData.second_contact_date || addedAt;
      const minLabel = formData.second_contact_date ? 'drugiego' : 'pierwszego';
      if (minDate && formData.next_contact_date < minDate) {
        setError(`Data kolejnego kontaktu nie może być wcześniejsza niż data ${minLabel} kontaktu.`);
        setLoading(false);
        return;
      }
    }

    // Build reminder_date as proper ISO using date-fns-tz
    let reminderDateISO: string | null = null;
    if (formData.reminder_date) {
      try {
        const hours = formData.reminder_hour || '10';
        const minutes = formData.reminder_minute || '00';
        // fromZonedTime interprets the given date+time as Warsaw local time and returns UTC Date
        const utcDate = fromZonedTime(
          `${formData.reminder_date}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`,
          'Europe/Warsaw'
        );
        reminderDateISO = utcDate.toISOString();
      } catch {
        setError('Nieprawidłowa data lub godzina przypomnienia.');
        setLoading(false);
        return;
      }
    }
    
    const editableFields: any = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone_number: formData.phone_number || null,
      email: formData.email || null,
      profession: formData.profession || null,
      address: formData.address || null,
      relationship_status: formData.relationship_status || 'observation',
      notes: formData.notes || null,
      next_contact_date: formData.next_contact_date || null,
      reminder_date: reminderDateISO,
      reminder_note: formData.reminder_note || null,
      products: formData.products || null,
      contact_source: formData.contact_source || null,
      contact_reason: formData.contact_reason || null,
      second_contact_date: formData.second_contact_date || null,
      first_contact_annotation: formData.first_contact_annotation || null,
      first_contact_result: formData.first_contact_result || null,
      added_at: formData.added_at,
    };

    // Only include system fields when creating new contact
    const data = contact ? editableFields : {
      ...editableFields,
      is_active: true,
      contact_type: 'private',
      eq_id: null,
      linked_user_id: null,
      role: 'client',
      reminder_sent: false,
    };

    try {
      const result = await onSubmit(data);
      if (result === false) {
        setError('Nie udało się zapisać kontaktu. Spróbuj ponownie.');
      }
    } catch (err: any) {
      if (err?.message?.includes('timestamp') || err?.message?.includes('time zone')) {
        setError('Nieprawidłowy format daty/godziny przypomnienia. Sprawdź wartości i spróbuj ponownie.');
      } else {
        setError(err?.message || 'Nie udało się zapisać kontaktu. Spróbuj ponownie.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pr-2">
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

      {/* Data utworzenia kontaktu — read-only */}
      <div className="space-y-2">
        <Label>Data utworzenia kontaktu</Label>
        <Input
          value={createdAtDisplay}
          readOnly
          disabled
          className="bg-muted"
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

      <div className="space-y-2">
        <Label htmlFor="first_contact_result">Wynik pierwszego kontaktu</Label>
        <Select
          value={formData.first_contact_result || ''}
          onValueChange={(value) => setFormData({ ...formData, first_contact_result: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Wybierz wynik..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="answered">Odebrał</SelectItem>
            <SelectItem value="no_answer">Nie odebrane</SelectItem>
            <SelectItem value="wrong_number">Błędny numer</SelectItem>
            <SelectItem value="out_of_range">Poza zasięgiem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="second_contact_date">Data drugiego kontaktu</Label>
        <Input
          id="second_contact_date"
          type="date"
          value={formData.second_contact_date}
          onChange={(e) => setFormData({ ...formData, second_contact_date: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="first_contact_annotation">Adnotacja po pierwszym kontakcie</Label>
        <Textarea
          id="first_contact_annotation"
          value={formData.first_contact_annotation}
          onChange={(e) => setFormData({ ...formData, first_contact_annotation: e.target.value })}
          placeholder="Co musisz zapamiętać po ustaleniach pierwszego kontaktu..."
          rows={3}
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
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reminder_date">Data i godzina przypomnienia</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            id="reminder_date"
            type="date"
            value={formData.reminder_date}
            onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
          />
          <div className="flex gap-2">
            <Select
              value={formData.reminder_hour}
              onValueChange={(value) => setFormData({ ...formData, reminder_hour: value })}
              disabled={!formData.reminder_date}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="Godz." />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => {
                  const h = String(i).padStart(2, '0');
                  return <SelectItem key={h} value={String(i)}>{h}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <span className="flex items-center text-muted-foreground font-bold">:</span>
            <Select
              value={formData.reminder_minute}
              onValueChange={(value) => setFormData({ ...formData, reminder_minute: value })}
              disabled={!formData.reminder_date}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="Min." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="00">00</SelectItem>
                <SelectItem value="30">30</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {formData.reminder_date && (
          <p className="text-xs text-muted-foreground">
            Przypomnienie zostanie wysłane ok. godz. {formData.reminder_hour?.padStart(2, '0') || '10'}:{formData.reminder_minute || '00'} (CET)
          </p>
        )}
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

      {/* Event History (read-only) */}
      {contact?.email && (
        <ContactEventHistory email={contact.email} />
      )}

      {/* Error feedback */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
