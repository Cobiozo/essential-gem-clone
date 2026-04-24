import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2, Calendar, MapPin, UserCheck } from 'lucide-react';

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'tel' | 'number' | 'select' | 'checkbox' | 'date';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

const EventFormPublicPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref');
  const { user, profile, isPartner } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [extra, setExtra] = useState<Record<string, any>>({});
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      try {
        const { data: f, error: fe } = await supabase
          .from('event_registration_forms')
          .select('*, paid_events!event_registration_forms_event_id_fkey(id, title, event_date, location, banner_url, is_online)')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();
        if (fe) throw fe;
        if (!f) {
          setError('Formularz nie istnieje lub został wyłączony.');
        } else {
          setForm(f);
          setEvent((f as any).paid_events);
          if (refCode) {
            // Track click
            await supabase.rpc('increment_partner_link_click', { _ref_code: refCode });
          }
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, refCode]);

  // Auto-fill from logged-in user's profile (so partner can register themselves quickly)
  useEffect(() => {
    if (!user || !profile) return;
    setFirstName(prev => prev || (profile as any).first_name || '');
    setLastName(prev => prev || (profile as any).last_name || '');
    setEmail(prev => prev || (profile as any).email || user.email || '');
    setPhone(prev => prev || (profile as any).phone_number || '');
  }, [user, profile]);

  const fields: FieldDef[] = useMemo(() => (form?.fields_config || []) as FieldDef[], [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast({ title: 'Wymagana zgoda', description: 'Zaznacz zgodę na przetwarzanie danych.', variant: 'destructive' });
      return;
    }
    if (!firstName || !lastName || !email) {
      toast({ title: 'Uzupełnij wymagane pola', variant: 'destructive' });
      return;
    }
    for (const f of fields) {
      if (f.required && !extra[f.key]) {
        toast({ title: `Pole „${f.label}" jest wymagane`, variant: 'destructive' });
        return;
      }
    }
    setSubmitting(true);
    try {
      // SECURITY DEFINER RPC handles insert + partner resolution + CRM upsert server-side.
      // Avoids RLS issues on RETURNING and prevents partner_user_id spoofing from client.
      const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_event_form', {
        _form_id: form.id,
        _first_name: firstName.trim(),
        _last_name: lastName.trim(),
        _email: email.trim().toLowerCase(),
        _phone: phone.trim() || null,
        _extra: extra,
        _ref_code: refCode || null,
      });
      if (rpcErr) throw rpcErr;

      const result = rpcData as { success: boolean; submission_id?: string; error?: string };
      if (!result?.success) {
        throw new Error(result?.error === 'form_not_found' ? 'Formularz nie istnieje lub został wyłączony.' : 'Nie udało się zapisać zgłoszenia.');
      }

      // Send confirmation email (fire-and-forget — UI shows success even if email is delayed)
      supabase.functions.invoke('send-event-form-confirmation', { body: { submissionId: result.submission_id } });

      setDone(true);
    } catch (e: any) {
      toast({ title: 'Błąd zapisu', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <p className="text-destructive">{error || 'Formularz niedostępny'}</p>
            <a href="/" className="text-primary underline text-sm">Strona główna</a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold">Dziękujemy za zgłoszenie!</h1>
            <p className="text-muted-foreground">
              Na adres <strong>{email}</strong> wysłaliśmy email z potwierdzeniem oraz danymi do płatności.
            </p>
            <p className="text-sm text-muted-foreground">
              Sprawdź skrzynkę (także folder „Spam") i kliknij <strong>„Potwierdzam otrzymanie wiadomości"</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {form.banner_url && (
          <img src={form.banner_url} alt={form.title} className="w-full rounded-lg mb-6 object-cover max-h-64" />
        )}

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{form.title}</h1>
              {event && (
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {event.event_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.event_date).toLocaleString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                  )}
                </div>
              )}
              {form.description && (
                <p className="mt-4 text-sm whitespace-pre-wrap">{form.description}</p>
              )}
            </div>

            {user && isPartner && refCode && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-primary/10 text-primary text-sm">
                <UserCheck className="w-4 h-4" />
                <span>Rejestrujesz się jako partner — zgłoszenie zostanie przypisane do Twojego konta.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Imię *</Label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <Label>Nazwisko *</Label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+48..." />
                </div>
              </div>

              {fields.map(f => (
                <div key={f.key}>
                  <Label>{f.label}{f.required && ' *'}</Label>
                  {f.type === 'textarea' ? (
                    <Textarea
                      value={extra[f.key] || ''}
                      onChange={e => setExtra(d => ({ ...d, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      required={f.required}
                    />
                  ) : f.type === 'select' ? (
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={extra[f.key] || ''}
                      onChange={e => setExtra(d => ({ ...d, [f.key]: e.target.value }))}
                      required={f.required}
                    >
                      <option value="">— wybierz —</option>
                      {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'checkbox' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        checked={!!extra[f.key]}
                        onCheckedChange={c => setExtra(d => ({ ...d, [f.key]: !!c }))}
                      />
                      <span className="text-sm text-muted-foreground">{f.placeholder || 'Tak'}</span>
                    </div>
                  ) : (
                    <Input
                      type={f.type}
                      value={extra[f.key] || ''}
                      onChange={e => setExtra(d => ({ ...d, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      required={f.required}
                    />
                  )}
                </div>
              ))}

              <div className="flex items-start gap-2 pt-2">
                <Checkbox checked={consent} onCheckedChange={c => setConsent(!!c)} id="consent" />
                <label htmlFor="consent" className="text-xs text-muted-foreground cursor-pointer">
                  Wyrażam zgodę na przetwarzanie moich danych osobowych w celu obsługi zgłoszenia oraz otrzymywania korespondencji
                  e-mail związanej z wydarzeniem.
                </label>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Zapisywanie...</> : (form.cta_label || 'Zapisuję się')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventFormPublicPage;
