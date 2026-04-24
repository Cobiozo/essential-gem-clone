import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ImageUploadInput } from '@/components/partner-page/ImageUploadInput';
import { FieldsBuilder, type EventFormField } from './FieldsBuilder';
import { useAdminActivityLog } from '@/hooks/useAdminActivityLog';

interface EventOption {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
}

interface FormRecord {
  id?: string;
  event_id: string;
  slug: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  cta_label: string;
  payment_details: {
    amount?: string;
    account_number?: string;
    recipient?: string;
    title?: string;
    deadline?: string;
    notes?: string;
  };
  email_subject: string;
  email_body: string | null;
  fields_config: EventFormField[];
  is_active: boolean;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const empty = (eventId: string): FormRecord => ({
  event_id: eventId,
  slug: '',
  title: '',
  description: '',
  banner_url: '',
  cta_label: 'Zapisuję się',
  payment_details: {},
  email_subject: 'Potwierdzenie rejestracji na wydarzenie',
  email_body: '',
  fields_config: [],
  is_active: true,
});

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: any;
}

export const EventFormEditor: React.FC<Props> = ({ open, onClose, initial }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { logAction } = useAdminActivityLog();
  const [data, setData] = useState<FormRecord>(empty(''));

  const { data: events = [] } = useQuery({
    queryKey: ['paid-events-for-forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_events')
        .select('id, title, event_date, location')
        .order('event_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as EventOption[];
    },
  });

  useEffect(() => {
    if (initial) {
      setData({
        ...empty(''),
        ...initial,
        payment_details: initial.payment_details || {},
        fields_config: initial.fields_config || [],
        description: initial.description || '',
        email_body: initial.email_body || '',
        banner_url: initial.banner_url || '',
      });
    } else {
      setData(empty(''));
    }
  }, [initial, open]);

  const setField = (k: keyof FormRecord, v: any) => setData(d => ({ ...d, [k]: v }));
  const setPayment = (k: string, v: string) => setData(d => ({ ...d, payment_details: { ...d.payment_details, [k]: v } }));

  const saveMutation = useMutation({
    mutationFn: async (payload: FormRecord) => {
      if (!payload.event_id) throw new Error('Wybierz wydarzenie');
      if (!payload.title) throw new Error('Tytuł formularza jest wymagany');
      const slug = payload.slug || slugify(payload.title) || `form-${Date.now()}`;
      const row = {
        event_id: payload.event_id,
        slug,
        title: payload.title,
        description: payload.description,
        banner_url: payload.banner_url,
        cta_label: payload.cta_label,
        payment_details: payload.payment_details,
        email_subject: payload.email_subject,
        email_body: payload.email_body,
        fields_config: payload.fields_config as any,
        is_active: payload.is_active,
      };
      if (payload.id) {
        const { error } = await supabase.from('event_registration_forms').update(row).eq('id', payload.id);
        if (error) throw error;
        return { id: payload.id, updated: true };
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ins, error } = await supabase
        .from('event_registration_forms')
        .insert({ ...row, created_by: user?.id })
        .select('id')
        .single();
      if (error) throw error;
      return { id: ins.id, updated: false };
    },
    onSuccess: async (r) => {
      qc.invalidateQueries({ queryKey: ['event-registration-forms'] });
      toast({ title: r.updated ? 'Formularz zaktualizowany' : 'Formularz utworzony' });
      logAction({
        actionType: r.updated ? 'event_form_update' : 'event_form_create',
        actionDescription: `${r.updated ? 'Zaktualizowano' : 'Utworzono'} formularz „${data.title}"`,
        targetTable: 'event_registration_forms',
        targetId: r.id,
      });
      onClose();
    },
    onError: (e: Error) => toast({ title: 'Błąd', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Edytuj formularz rejestracji' : 'Nowy formularz rejestracji'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Podstawowe</TabsTrigger>
            <TabsTrigger value="fields">Pola</TabsTrigger>
            <TabsTrigger value="payment">Płatność</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <div>
              <Label>Wydarzenie *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={data.event_id}
                onChange={e => setField('event_id', e.target.value)}
              >
                <option value="">— wybierz —</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}{ev.location ? ` — ${ev.location}` : ''} ({new Date(ev.event_date).toLocaleDateString('pl-PL')})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Tytuł formularza *</Label>
              <Input value={data.title} onChange={e => setField('title', e.target.value)} placeholder="Np. Rejestracja na warsztat zdrowia" />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input value={data.slug} onChange={e => setField('slug', slugify(e.target.value))} placeholder="auto-generowany z tytułu" />
              {data.slug && <p className="text-xs text-muted-foreground mt-1">Link: /event-form/{data.slug}</p>}
            </div>
            <div>
              <Label>Opis (widoczny pod tytułem)</Label>
              <Textarea value={data.description || ''} onChange={e => setField('description', e.target.value)} rows={4} />
            </div>
            <div>
              <Label>Grafika / banner</Label>
              <ImageUploadInput value={data.banner_url || ''} onChange={v => setField('banner_url', v)} />
            </div>
            <div>
              <Label>Tekst przycisku CTA</Label>
              <Input value={data.cta_label} onChange={e => setField('cta_label', e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch checked={data.is_active} onCheckedChange={c => setField('is_active', c)} />
              <Label>Formularz aktywny (publicznie dostępny)</Label>
            </div>
          </TabsContent>

          <TabsContent value="fields" className="pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Pola: <strong>imię, nazwisko, email, telefon</strong> są dodawane automatycznie. Tutaj zdefiniuj dodatkowe pola.
            </p>
            <FieldsBuilder fields={data.fields_config} onChange={f => setField('fields_config', f)} />
          </TabsContent>

          <TabsContent value="payment" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">Te dane zostaną wstawione do emaila potwierdzającego.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Kwota</Label>
                <Input value={data.payment_details.amount || ''} onChange={e => setPayment('amount', e.target.value)} placeholder="np. 250 PLN" />
              </div>
              <div>
                <Label>Termin płatności</Label>
                <Input value={data.payment_details.deadline || ''} onChange={e => setPayment('deadline', e.target.value)} placeholder="np. 7 dni od rejestracji" />
              </div>
              <div className="md:col-span-2">
                <Label>Numer konta</Label>
                <Input value={data.payment_details.account_number || ''} onChange={e => setPayment('account_number', e.target.value)} />
              </div>
              <div>
                <Label>Odbiorca przelewu</Label>
                <Input value={data.payment_details.recipient || ''} onChange={e => setPayment('recipient', e.target.value)} />
              </div>
              <div>
                <Label>Tytuł przelewu</Label>
                <Input value={data.payment_details.title || ''} onChange={e => setPayment('title', e.target.value)} placeholder="Imię Nazwisko + nazwa wydarzenia" />
              </div>
              <div className="md:col-span-2">
                <Label>Dodatkowe uwagi</Label>
                <Textarea value={data.payment_details.notes || ''} onChange={e => setPayment('notes', e.target.value)} rows={2} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-3 pt-4">
            <div>
              <Label>Temat emaila</Label>
              <Input value={data.email_subject} onChange={e => setField('email_subject', e.target.value)} />
            </div>
            <div>
              <Label>Treść dodatkowa (HTML, opcjonalnie)</Label>
              <Textarea value={data.email_body || ''} onChange={e => setField('email_body', e.target.value)} rows={6} placeholder="Dodatkowy tekst, który pojawi się w emailu między opisem a danymi do płatności" />
            </div>
            <p className="text-xs text-muted-foreground">
              Email automatycznie zawiera: dane zgłoszenia, dane do płatności, link <strong>„Potwierdzam otrzymanie wiadomości"</strong> i link do anulowania.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz formularz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
