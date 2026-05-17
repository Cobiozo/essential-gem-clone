import React, { useState } from 'react';
import { fromZonedTime } from 'date-fns-tz';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { Plus, Trash2, User, Tag, CalendarClock, Bell, StickyNote, Sparkles } from 'lucide-react';
import { ContactEventHistory } from './ContactEventHistory';
import { RatingElement } from '@/components/elements/RatingElement';
import type { TeamContact } from './types';

interface PrivateContactFormProps {
  contact?: TeamContact;
  onSubmit: (data: Omit<TeamContact, 'id' | 'user_id' | 'created_at' | 'updated_at'> | Partial<TeamContact>) => Promise<boolean> | void;
  onCancel: () => void;
}

interface CustomField {
  label: string;
  value: string;
}

const MAX_CUSTOM_FIELDS = 3;

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  icon,
  children,
  className,
}) => (
  <div className={`rounded-xl border border-border bg-card/40 p-4 sm:p-5 space-y-4 min-w-0 overflow-hidden ${className || ''}`}>
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      {title}
    </div>
    {children}
  </div>
);

export const PrivateContactForm: React.FC<PrivateContactFormProps> = ({
  contact,
  onSubmit,
  onCancel,
}) => {
  const { tf } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createdAtDisplay = contact?.created_at
    ? new Date(contact.created_at).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Normalize incoming custom_fields (jsonb may arrive as array or object)
  const initialCustomFields: CustomField[] = Array.isArray(contact?.custom_fields)
    ? (contact!.custom_fields as any[])
        .filter((f) => f && typeof f === 'object')
        .slice(0, MAX_CUSTOM_FIELDS)
        .map((f) => ({ label: String(f.label || ''), value: String(f.value || '') }))
    : [];

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
    priority_level: typeof contact?.priority_level === 'number' ? contact.priority_level : 0,
    priority_traits: {
      success: Number((contact as any)?.priority_traits?.success) || 0,
      outgoing: Number((contact as any)?.priority_traits?.outgoing) || 0,
      positive: Number((contact as any)?.priority_traits?.positive) || 0,
      entrepreneurial: Number((contact as any)?.priority_traits?.entrepreneurial) || 0,
      reputation: Number((contact as any)?.priority_traits?.reputation) || 0,
    },
  });

  const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields);

  const updateCustomField = (idx: number, patch: Partial<CustomField>) => {
    setCustomFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };
  const addCustomField = () => {
    if (customFields.length >= MAX_CUSTOM_FIELDS) return;
    setCustomFields((prev) => [...prev, { label: '', value: '' }]);
  };
  const removeCustomField = (idx: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.reminder_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.reminder_date)) {
      setError('Data przypomnienia musi być w formacie RRRR-MM-DD.');
      setLoading(false);
      return;
    }

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

    // Validate custom fields
    const cleanedCustom = customFields
      .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
      .filter((f) => f.label || f.value);
    for (const f of cleanedCustom) {
      if (!f.label) {
        setError('Każde dodatkowe pole musi mieć nazwę.');
        setLoading(false);
        return;
      }
      if (f.label.length > 60) {
        setError('Nazwa pola własnego może mieć maks. 60 znaków.');
        setLoading(false);
        return;
      }
      if (f.value.length > 1000) {
        setError('Treść pola własnego może mieć maks. 1000 znaków.');
        setLoading(false);
        return;
      }
    }

    let reminderDateISO: string | null = null;
    if (formData.reminder_date) {
      try {
        const hours = formData.reminder_hour || '10';
        const minutes = formData.reminder_minute || '00';
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
      priority_level: Object.values(formData.priority_traits).reduce((a, b) => a + (Number(b) || 0), 0),
      priority_traits: formData.priority_traits,
      custom_fields: cleanedCustom,
    };

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
    <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col min-w-0">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-5 min-w-0">
        <div className="grid gap-5 lg:grid-cols-12 min-w-0">
          {/* Dane kontaktu */}
          <Section
            title={tf('teamContacts.contactData', 'Dane kontaktu')}
            icon={<User className="h-4 w-4" />}
            className="lg:col-span-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">{tf('teamContacts.firstName', 'Imię')} *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{tf('teamContacts.lastName', 'Nazwisko')} *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">{tf('teamContacts.phone', 'Telefon')}</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{tf('teamContacts.email', 'Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {contact?.secondary_email && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="secondary_email">Drugi email</Label>
                  <Input
                    id="secondary_email"
                    type="email"
                    value={contact.secondary_email}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="profession">{tf('teamContacts.profession', 'Zawód')}</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{tf('teamContacts.address', 'Adres')}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Opcjonalny"
                />
              </div>
            </div>
          </Section>

          {/* Notatki z rozmów (zaraz pod Dane kontaktu) */}
          <Section
            title={tf('teamContacts.conversationNotes', 'Notatki z rozmów')}
            icon={<StickyNote className="h-4 w-4" />}
            className="lg:col-span-6"
          >
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Zapisz ważne informacje z rozmów, preferencje, pytania..."
              rows={4}
            />
          </Section>

          {/* Klasyfikacja / Priorytetyzacja */}
          <Section
            title={tf('teamContacts.classification', 'Klasyfikacja / Priorytetyzacja')}
            icon={<Tag className="h-4 w-4" />}
            className="lg:col-span-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3 sm:col-span-2">
                {([
                  { key: 'success', label: 'Sukces' },
                  { key: 'outgoing', label: 'Towarzyski' },
                  { key: 'positive', label: 'Pozytywny' },
                  { key: 'entrepreneurial', label: 'Przedsiębiorczy' },
                  { key: 'reputation', label: 'Reputacja' },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-sm text-foreground min-w-[140px]">{label}</span>
                    <div className="flex items-center gap-2">
                      <RatingElement
                        value={formData.priority_traits[key] || 0}
                        max={5}
                        readonly={false}
                        onChange={(v) =>
                          setFormData({
                            ...formData,
                            priority_traits: { ...formData.priority_traits, [key]: v },
                          })
                        }
                      />
                      {(formData.priority_traits[key] || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              priority_traits: { ...formData.priority_traits, [key]: 0 },
                            })
                          }
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          wyczyść
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">Ogólna ocena kontaktu</span>
                  <span className="text-sm font-semibold text-primary">
                    {Object.values(formData.priority_traits).reduce((a, b) => a + (Number(b) || 0), 0)} / 25
                  </span>
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="relationship_status">{tf('teamContacts.relationshipStatus', 'Status relacji')}</Label>
                <Select
                  value={formData.relationship_status || 'observation'}
                  onValueChange={(value) => setFormData({ ...formData, relationship_status: value as TeamContact['relationship_status'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to_contact">{tf('teamContacts.toContact', 'W kolejce - Do skontaktowania')}</SelectItem>
                    <SelectItem value="observation">{tf('teamContacts.observation', 'Czynny obserwujący')}</SelectItem>
                    <SelectItem value="potential_client">{tf('teamContacts.potentialClient', 'Potencjalny klient')}</SelectItem>
                    <SelectItem value="potential_partner">{tf('teamContacts.potentialPartner', 'Potencjalny partner')}</SelectItem>
                    <SelectItem value="closed_success">{tf('teamContacts.closedSuccess', 'Zamknięty - sukces dołączył')}</SelectItem>
                    <SelectItem value="closed_not_now">{tf('teamContacts.closedNotNow', 'Zamknięty - nie teraz')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_source">{tf('teamContacts.contactSource', 'Skąd jest kontakt')}</Label>
                <Input
                  id="contact_source"
                  value={formData.contact_source}
                  onChange={(e) => setFormData({ ...formData, contact_source: e.target.value })}
                  placeholder="np. Facebook, polecenie"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="products">{tf('teamContacts.products', 'Zainteresowanie produktami')}</Label>
                <Input
                  id="products"
                  value={formData.products}
                  onChange={(e) => setFormData({ ...formData, products: e.target.value })}
                  placeholder="np. Koneser, Life Pack"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="contact_reason">{tf('teamContacts.contactReason', 'Dlaczego chcesz się odezwać')}</Label>
                <Textarea
                  id="contact_reason"
                  value={formData.contact_reason}
                  onChange={(e) => setFormData({ ...formData, contact_reason: e.target.value })}
                  placeholder="Podaj powód, dla którego ten kontakt jest dla Ciebie ważny..."
                  rows={2}
                />
              </div>
            </div>
          </Section>

          {/* Pierwszy / drugi kontakt */}
          <Section
            title={tf('teamContacts.firstSecondContact', 'Pierwszy i drugi kontakt')}
            icon={<CalendarClock className="h-4 w-4" />}
            className="lg:col-span-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tf('teamContacts.dateCreated', 'Data utworzenia kontaktu')}</Label>
                <Input value={createdAtDisplay} readOnly disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="added_at">{tf('teamContacts.firstContactDate', 'Data pierwszego kontaktu')}</Label>
                <Input
                  id="added_at"
                  type="date"
                  value={formData.added_at}
                  onChange={(e) => setFormData({ ...formData, added_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_contact_result">{tf('teamContacts.firstContactResult', 'Wynik pierwszego kontaktu')}</Label>
                <Select
                  value={formData.first_contact_result || ''}
                  onValueChange={(value) => setFormData({ ...formData, first_contact_result: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz wynik..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="answered">{tf('teamContacts.answered', 'Odebrał')}</SelectItem>
                    <SelectItem value="no_answer">{tf('teamContacts.noAnswer', 'Nie odebrane')}</SelectItem>
                    <SelectItem value="wrong_number">{tf('teamContacts.wrongNumber', 'Błędny numer')}</SelectItem>
                    <SelectItem value="out_of_range">{tf('teamContacts.outOfRange', 'Poza zasięgiem')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="second_contact_date">{tf('teamContacts.secondContactDate', 'Data drugiego kontaktu')}</Label>
                <Input
                  id="second_contact_date"
                  type="date"
                  value={formData.second_contact_date}
                  onChange={(e) => setFormData({ ...formData, second_contact_date: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="first_contact_annotation">{tf('teamContacts.firstContactAnnotation', 'Adnotacja po pierwszym kontakcie')}</Label>
                <Textarea
                  id="first_contact_annotation"
                  value={formData.first_contact_annotation}
                  onChange={(e) => setFormData({ ...formData, first_contact_annotation: e.target.value })}
                  placeholder="Co musisz zapamiętać po ustaleniach pierwszego kontaktu..."
                  rows={2}
                />
              </div>
            </div>
          </Section>

          {/* Przypomnienia */}
          <Section
            title={tf('teamContacts.reminders', 'Przypomnienie i kolejny kontakt')}
            icon={<Bell className="h-4 w-4" />}
            className="lg:col-span-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="next_contact_date">{tf('teamContacts.nextContactDate', 'Data kolejnego kontaktu')}</Label>
                <Input
                  id="next_contact_date"
                  type="date"
                  value={formData.next_contact_date}
                  onChange={(e) => setFormData({ ...formData, next_contact_date: e.target.value })}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="reminder_date">{tf('teamContacts.reminderDate', 'Data i godzina przypomnienia')}</Label>
                <div className="flex flex-wrap gap-2 min-w-0">
                  <Input
                    id="reminder_date"
                    type="date"
                    value={formData.reminder_date}
                    onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                    className="flex-1 min-w-[140px]"
                  />
                  <Select
                    value={formData.reminder_hour}
                    onValueChange={(value) => setFormData({ ...formData, reminder_hour: value })}
                    disabled={!formData.reminder_date}
                  >
                    <SelectTrigger className="w-[72px] shrink-0"><SelectValue placeholder="Godz." /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const h = String(i).padStart(2, '0');
                        return <SelectItem key={h} value={String(i)}>{h}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.reminder_minute}
                    onValueChange={(value) => setFormData({ ...formData, reminder_minute: value })}
                    disabled={!formData.reminder_date}
                  >
                    <SelectTrigger className="w-[72px] shrink-0"><SelectValue placeholder="Min." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="00">00</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.reminder_date && (
                  <p className="text-xs text-muted-foreground">
                    Przypomnienie ok. {formData.reminder_hour?.padStart(2, '0') || '10'}:{formData.reminder_minute || '00'} (CET)
                  </p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="reminder_note">{tf('teamContacts.reminderContent', 'Treść przypomnienia')}</Label>
                <Textarea
                  id="reminder_note"
                  value={formData.reminder_note}
                  onChange={(e) => setFormData({ ...formData, reminder_note: e.target.value })}
                  placeholder="Co chcesz zapamiętać przy następnym kontakcie..."
                  rows={2}
                />
              </div>
            </div>
          </Section>

          {/* Pola własne */}
          <Section
            title={`Dodatkowe pola własne (${customFields.length}/${MAX_CUSTOM_FIELDS})`}
            icon={<Sparkles className="h-4 w-4" />}
            className="lg:col-span-12"
          >
            {customFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Możesz dodać do {MAX_CUSTOM_FIELDS} własnych pól z dowolną nazwą i treścią dopasowaną do tego kontaktu.
              </p>
            ) : (
              <div className="space-y-3">
                {customFields.map((field, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start rounded-lg border border-border/60 bg-background/40 p-3 min-w-0">
                    <div className="sm:col-span-4 space-y-1.5 min-w-0">
                      <Label className="text-xs">Nazwa pola</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                        placeholder="np. Hobby, Dzieci, Ulubiona kawa"
                        maxLength={60}
                        className="w-full"
                      />
                    </div>
                    <div className="sm:col-span-7 space-y-1.5 min-w-0">
                      <Label className="text-xs">Treść</Label>
                      <Textarea
                        value={field.value}
                        onChange={(e) => updateCustomField(idx, { value: e.target.value })}
                        placeholder="Dowolna treść..."
                        rows={2}
                        maxLength={1000}
                        className="w-full resize-y"
                      />
                    </div>
                    <div className="sm:col-span-1 flex sm:justify-end pt-0 sm:pt-6 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomField(idx)}
                        aria-label="Usuń pole"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {customFields.length < MAX_CUSTOM_FIELDS && (
              <Button type="button" variant="outline" size="sm" onClick={addCustomField} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Dodaj pole
              </Button>
            )}
          </Section>

          {/* Event history */}
          {contact?.email && (
            <div className="lg:col-span-12">
              <ContactEventHistory email={contact.email} />
            </div>
          )}

          {error && (
            <div className="lg:col-span-12 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-border bg-background/95 backdrop-blur px-4 sm:px-6 py-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {tf('teamContacts.cancel', 'Anuluj')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? tf('teamContacts.saving', 'Zapisywanie...')
            : contact
              ? tf('teamContacts.save', 'Zapisz')
              : tf('teamContacts.addContact', 'Dodaj kontakt')}
        </Button>
      </div>
    </form>
  );
};
