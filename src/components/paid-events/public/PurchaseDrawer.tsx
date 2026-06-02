import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CreditCard, ArrowRight, Shield, Banknote, CheckCircle2, Mail, Minus, Plus, Users, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TicketInfo {
  id: string;
  name: string;
  price: number;
  seats_per_ticket?: number;
  available_quantity?: number | null;
  max_per_order?: number | null;
}

interface PurchaseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  ticket: TicketInfo | null;
  currency?: string;
  isFree?: boolean;
  paymentMethodPayu?: boolean;
  paymentMethodTransfer?: boolean;
  paymentMethodPaypal?: boolean;
  transferPaymentDetails?: string | null;
  refCode?: string | null;
}

type SubmitMode = 'checkout';

interface Attendee {
  firstName: string;
  lastName: string;
  email: string;
}

const MAX_TICKETS = 10;

function mapFreeError(code: string): string {
  switch (code) {
    case 'consent_required': return 'Zaakceptuj regulamin i politykę prywatności, aby kontynuować.';
    case 'missing_fields': return 'Uzupełnij wymagane pola (imię, nazwisko, email).';
    case 'ticket_not_found': return 'Ten bilet nie jest już dostępny.';
    case 'event_not_free': return 'To wydarzenie nie jest bezpłatne.';
    case 'already_registered': return 'Ten adres email ma już rezerwację na to wydarzenie. Sprawdź skrzynkę (także folder Spam).';
    default: return code || 'Nie udało się utworzyć rezerwacji.';
  }
}

export const PurchaseDrawer: React.FC<PurchaseDrawerProps> = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  ticket,
  currency = 'PLN',
  isFree = false,
  paymentMethodPayu = true,
  paymentMethodTransfer = false,
  paymentMethodPaypal = false,
  transferPaymentDetails = null,
  refCode = null,
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profileEmail = (profile as any)?.email?.toLowerCase?.() ?? null;
  const [loadingMode, setLoadingMode] = useState<SubmitMode | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [freeSuccess, setFreeSuccess] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    acceptTerms: false,
    acceptMarketing: false,
  });
  const [attendees, setAttendees] = useState<Attendee[]>([]);

  // Detect if the logged-in partner already has a (non-cancelled) ticket for this event.
  // Checks BOTH paid_event_orders AND event_form_submissions (mirrored registrations),
  // mirroring MyEventTicketsInline so the drawer reliably switches to "guest-only" mode.
  const { data: hasOwnTicket = false } = useQuery({
    queryKey: ['my-event-ticket-exists', user?.id, profileEmail, eventId],
    enabled: !!user?.id && !!eventId && open,
    queryFn: async () => {
      const emails = Array.from(new Set([
        (user!.email || '').toLowerCase(),
        profileEmail || '',
      ].filter(Boolean)));
      const orParts = [`user_id.eq.${user!.id}`, ...emails.map((e) => `email.eq.${e}`)];
      const { data: orders, error: ordersErr } = await supabase
        .from('paid_event_orders')
        .select('id')
        .eq('event_id', eventId)
        .or(orParts.join(','))
        .not('status', 'in', '("cancelled","refunded","failed","expired")')
        .limit(1);
      if (!ordersErr && (orders?.length ?? 0) > 0) return true;

      if (emails.length > 0) {
        const { data: subs, error: subsErr } = await supabase
          .from('event_form_submissions')
          .select('id')
          .eq('event_id', eventId)
          .in('email', emails)
          .eq('status', 'active')
          .limit(1);
        if (!subsErr && (subs?.length ?? 0) > 0) return true;
      }
      return false;
    },
  });

  const seatsPerTicket = Math.max(1, ticket?.seats_per_ticket ?? 1);
  const totalSeats = quantity * seatsPerTicket;
  const totalPrice = (ticket?.price ?? 0) * quantity;

  const maxQty = useMemo(() => {
    const qa = ticket?.available_quantity;
    const mpo = ticket?.max_per_order;
    const availCap = qa && qa > 0 ? qa : MAX_TICKETS;
    const orderCap = mpo && mpo > 0 ? mpo : MAX_TICKETS;
    return Math.max(1, Math.min(MAX_TICKETS, availCap, orderCap));
  }, [ticket?.available_quantity, ticket?.max_per_order]);
  const allowMultiple = maxQty > 1;

  // Auto-fill from logged-in user's profile when the drawer opens (don't overwrite user input).
  // Skip auto-fill entirely if the user is already registered for this event — buyer fields
  // must stay empty so the buyer cannot accidentally re-register themselves.
  useEffect(() => {
    if (!open || !user || !profile) return;
    if (hasOwnTicket) return;
    setFormData(prev => ({
      ...prev,
      firstName: prev.firstName || (profile as any).first_name || '',
      lastName: prev.lastName || (profile as any).last_name || '',
      email: prev.email || (profile as any).email || user.email || '',
      phone: prev.phone || (profile as any).phone_number || '',
    }));
  }, [open, user, profile, hasOwnTicket]);

  // Reactive clear: re-assert empty buyer fields whenever the user is detected as already
  // registered. Re-runs on every relevant state change so any stray autofill (browser,
  // future code paths) is wiped before submit.
  useEffect(() => {
    if (!hasOwnTicket) return;
    setFormData(prev => {
      if (!prev.firstName && !prev.lastName && !prev.email && !prev.phone) return prev;
      return { ...prev, firstName: '', lastName: '', email: '', phone: '' };
    });
  }, [hasOwnTicket, open, quantity]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setTransferSuccess(false);
      setFreeSuccess(false);
      setLoadingMode(null);
      setQuantity(1);
      setAttendees([]);
    }
  }, [open]);

  // When the buyer already has their own ticket for this event, EVERY seat is for a guest.
  // Otherwise, seat #1 is the buyer themselves and only the remaining seats are extras.
  // For FREE events we never want the "guest-only" mode — re-registration is fully blocked.
  const buyerIsAttendee = isFree ? true : !hasOwnTicket;
  const guestSeatsCount = buyerIsAttendee ? Math.max(0, totalSeats - 1) : totalSeats;

  // Resize attendees array when guest count changes (preserve existing entries)
  useEffect(() => {
    setAttendees(prev => {
      const next = prev.slice(0, guestSeatsCount);
      while (next.length < guestSeatsCount) {
        next.push({ firstName: '', lastName: '', email: '' });
      }
      return next;
    });
  }, [guestSeatsCount]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);

  const updateAttendee = (idx: number, patch: Partial<Attendee>) => {
    setAttendees(prev => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const validate = (): boolean => {
    if (!ticket) return false;
    const emailRe = /^\S+@\S+\.\S+$/;
    if (!hasOwnTicket) {
      if (!formData.firstName || !formData.lastName || !formData.email) {
        toast({ title: 'Uzupełnij dane', description: 'Imię, nazwisko i email kupującego są wymagane', variant: 'destructive' });
        return false;
      }
    } else {
      if (guestSeatsCount === 0) {
        toast({ title: 'Brak gości', description: 'Zwiększ liczbę biletów, aby zarejestrować gości', variant: 'destructive' });
        return false;
      }
    }
    // Every additional attendee (guest seat) must have full identifying data:
    // imię, nazwisko oraz prawidłowy email — bilety są imienne.
    for (let i = 0; i < attendees.length; i++) {
      const a = attendees[i];
      const label = buyerIsAttendee ? `uczestnika ${i + 2}` : `uczestnika ${i + 1}`;
      if (!a.firstName.trim() || !a.lastName.trim() || !a.email.trim()) {
        toast({ title: 'Uzupełnij dane uczestnika', description: `Imię, nazwisko i email dla ${label} są wymagane`, variant: 'destructive' });
        return false;
      }
      if (!emailRe.test(a.email.trim())) {
        toast({ title: 'Nieprawidłowy email', description: `Sprawdź adres email dla ${label}`, variant: 'destructive' });
        return false;
      }
    }
    if (!formData.acceptTerms) {
      toast({ title: 'Akceptacja regulaminu', description: 'Musisz zaakceptować regulamin aby kontynuować', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const buildPayload = () => {
    const guests = attendees.map(a => ({
      firstName: a.firstName.trim(),
      lastName: a.lastName.trim(),
      email: a.email?.trim() || null,
    }));
    const attendeesPayload = buyerIsAttendee
      ? [
          {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim() || null,
          },
          ...guests,
        ]
      : guests;
    // In guest-only mode, buyer contact comes silently from the logged-in user's profile
    // (NEVER from the now-empty formData) so the order is linked to their account
    // and the confirmation email reaches them.
    const buyer = hasOwnTicket
      ? {
          email: ((profile as any)?.email || user?.email || '').toString(),
          firstName: ((profile as any)?.first_name || '').toString(),
          lastName: ((profile as any)?.last_name || '').toString(),
          phone: ((profile as any)?.phone_number || '').toString(),
        }
      : {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || '',
        };
    return {
      eventId,
      ticketId: ticket!.id,
      quantity,
      buyer,
      attendees: attendeesPayload,
      buyerIsAttendee,
      consent: formData.acceptTerms,
      acceptMarketing: formData.acceptMarketing,
      refCode: refCode || null,
    };
  };
  const handleSubmit = async () => {
    // Hard guard: a logged-in user who already holds a reservation cannot
    // re-register for the SAME free event. Show an informative toast and stop.
    if (isFree && hasOwnTicket) {
      toast({
        title: 'Masz już zarezerwowane miejsce',
        description: 'Twoje miejsce na to wydarzenie jest już zarezerwowane. Sprawdź skrzynkę e-mail, aby potwierdzić rejestrację lub odebrać bilet z kodem QR.',
      });
      return;
    }
    if (!validate() || !ticket) return;
    setLoadingMode('checkout');
    try {
      const payload = buildPayload();
      console.log('[purchase] create order payload', { quantity: payload.quantity, attendees: payload.attendees.length, totalSeats, isFree });

      if (isFree) {
        const { data, error } = await supabase.functions.invoke('register-free-event-order', { body: payload });
        if (error) {
          let detail = error.message || 'Nie udało się utworzyć rezerwacji';
          try {
            const ctxRes = (error as any).context?.response;
            if (ctxRes && typeof ctxRes.clone === 'function') {
              const j = await ctxRes.clone().json();
              if (j?.message) detail = j.message;
              else if (j?.error) detail = j.error;
            }
          } catch { /* ignore */ }
          throw new Error(mapFreeError(detail));
        }
        // Server now returns 200 with { error, message } on duplicates so this branch fires
        if (data?.error) {
          const friendly = data.message || mapFreeError(data.error);
          throw new Error(friendly);
        }

        qc.invalidateQueries({ queryKey: ['my-event-tickets-inline'] });
        qc.invalidateQueries({ queryKey: ['my-event-ticket-exists'] });

        toast({
          title: data?.auto_confirmed ? 'Bilet wysłany' : 'Rezerwacja przyjęta',
          description: data?.auto_confirmed
            ? `Twój bilet z kodem QR został wysłany na ${formData.email}. Sprawdź skrzynkę (także folder Spam).`
            : `Wysłaliśmy email potwierdzający na ${formData.email}.`,
        });
        setFreeSuccess(true);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-event-order', { body: payload });
      if (error) {
        let detail = error.message || 'Nie udało się utworzyć zamówienia';
        try {
          const ctxRes = (error as any).context?.response;
          if (ctxRes && typeof ctxRes.json === 'function') {
            const j = await ctxRes.json();
            if (j?.error) detail = j.error;
          }
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.orderId) throw new Error('Brak identyfikatora zamówienia');

      qc.invalidateQueries({ queryKey: ['my-ticket-orders'] });
      qc.invalidateQueries({ queryKey: ['my-event-tickets-inline'] });
      qc.invalidateQueries({ queryKey: ['my-event-ticket-exists'] });
      qc.invalidateQueries({ queryKey: ['my-event-registration-fallback'] });

      onOpenChange(false);
      navigate(`/checkout/${data.orderId}`);
    } catch (err: any) {
      console.error('Purchase error:', err);
      toast({ title: 'Błąd', description: err.message || 'Wystąpił błąd podczas tworzenia rezerwacji', variant: 'destructive' });
    } finally {
      setLoadingMode(null);
    }
  };

  if (!ticket) return null;

  const noMethods = !isFree && !paymentMethodPayu && !paymentMethodTransfer && !paymentMethodPaypal;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle>{transferSuccess || freeSuccess ? 'Rezerwacja przyjęta' : (isFree ? 'Zarezerwuj miejsce' : 'Kup bilet')}</DrawerTitle>
            <DrawerDescription>
              {eventTitle} - {ticket.name}
            </DrawerDescription>
          </DrawerHeader>

          {freeSuccess ? (
            <div className="px-4 pb-4 space-y-4">
              <div className="flex flex-col items-center text-center py-6 gap-3">
                <CheckCircle2 className="w-16 h-16 text-primary" />
                <h3 className="text-lg font-semibold">Dziękujemy za rezerwację!</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Wysłaliśmy email potwierdzający na adres <strong>{formData.email}</strong>.
                  Otwórz wiadomość i kliknij przycisk <strong>„Potwierdzam mój adres email”</strong>, aby otrzymać bilet z kodem QR.
                </p>
                <div className="bg-muted/50 rounded-lg p-3 text-sm w-full max-w-sm space-y-1 text-left">
                  <div className="flex justify-between"><span className="text-muted-foreground">Wydarzenie:</span><span className="font-medium text-right">{eventTitle}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Rezerwacja:</span><span className="font-medium">{ticket.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Liczba miejsc:</span><span className="font-medium">{totalSeats}</span></div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>Sprawdź folder Spam, jeśli email nie dotarł w ciągu kilku minut.</span>
              </div>
            </div>
          ) : transferSuccess ? (
            <div className="px-4 pb-4 space-y-4">
              <div className="flex flex-col items-center text-center py-6 gap-3">
                <CheckCircle2 className="w-16 h-16 text-primary" />
                <h3 className="text-lg font-semibold">Dziękujemy za rejestrację!</h3>
                <div className="bg-muted/50 rounded-lg p-3 text-sm w-full max-w-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Bilet:</span><span className="font-medium">{ticket.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Liczba biletów:</span><span className="font-medium">{quantity}</span></div>
                  {totalSeats > quantity && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Liczba uczestników:</span><span className="font-medium">{totalSeats}</span></div>
                  )}
                  <div className="flex justify-between border-t border-border/50 pt-1 mt-1"><span className="text-muted-foreground">Do zapłaty:</span><span className="font-bold text-primary">{formatPrice(totalPrice)}</span></div>
                </div>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Twoja rezerwacja została zapisana. Wysłaliśmy email z danymi do przelewu na adres{' '}
                  <strong>{formData.email}</strong>. Po zaksięgowaniu wpłaty otrzymasz {totalSeats > 1 ? `${totalSeats} biletów QR — po jednym dla każdego uczestnika.` : 'bilet z kodem QR.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>Sprawdź folder Spam, jeśli wiadomość nie dotarła w ciągu kilku minut.</span>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className="px-4 space-y-4">
              {hasOwnTicket && (
                <div className="rounded-md border-2 border-primary/40 bg-primary/10 p-4 text-sm flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-primary mb-1">
                      {isFree
                        ? 'Masz już zarezerwowane miejsce na to wydarzenie'
                        : 'Jesteś już zarejestrowany na to wydarzenie'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isFree
                        ? 'Twoje miejsce jest już zarezerwowane. Sprawdź skrzynkę e-mail, aby potwierdzić rejestrację lub odebrać bilet z kodem QR. Nie musisz rezerwować ponownie.'
                        : 'Kolejne bilety zostaną przypisane gościom (uczestnikom), których chcesz zaprosić. Uzupełnij ich dane poniżej lub zrób to później w sekcji „Moje bilety".'}
                    </div>
                  </div>
                </div>
              )}
              {/* Order Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{isFree ? 'Rezerwacja:' : 'Bilet:'}</span>
                  <span className="font-medium text-right">{ticket.name}</span>
                </div>

                {/* Quantity selector */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm">{isFree ? 'Liczba miejsc' : 'Liczba biletów'}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                      disabled={quantity >= maxQty}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {seatsPerTicket > 1 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>1 {isFree ? 'rezerwacja' : 'bilet'} = {seatsPerTicket} osób · razem <strong className="text-foreground">{totalSeats} uczestników</strong></span>
                  </div>
                )}

                {!isFree && (
                  <>
                    {/* Detailed cost breakdown — always visible */}
                    <div className="space-y-1 text-xs text-muted-foreground border-t border-border/40 pt-2">
                      <div className="flex justify-between">
                        <span>Cena za bilet:</span>
                        <span>{formatPrice(ticket?.price ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{hasOwnTicket ? `Bilety dla gości (${quantity}):` : `Bilety (${quantity}):`}</span>
                        <span className="text-foreground">{quantity} × {formatPrice(ticket?.price ?? 0)} = <strong>{formatPrice(totalPrice)}</strong></span>
                      </div>
                      {hasOwnTicket && (
                        <div className="text-[11px] italic pt-1">
                          Im więcej gości zaprosisz, tym wyższa kwota — kalkulacja aktualizuje się automatycznie.
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between pt-2 border-t border-border/50">
                      <span className="font-medium">Do zapłaty {quantity > 1 ? `(${quantity} bilety)` : ''}:</span>
                      <span className="text-xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Buyer Data — locked & empty when user already has a ticket */}
              {hasOwnTicket ? (
                <div className="rounded-md bg-muted/30 border border-border/50 p-3 flex gap-3 items-start">
                  <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-medium text-foreground mb-0.5">Twoje dane są już zapisane</div>
                    <div className="text-muted-foreground">
                      Powiązaliśmy zamówienie z Twoim kontem
                      {((profile as any)?.email || user?.email) && (
                        <> (<span className="font-mono text-foreground/80">{(profile as any)?.email || user?.email}</span>)</>
                      )}
                      . Pola kupującego są zablokowane — wypełnij tylko dane gości poniżej.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-medium">Dane kupującego</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName">Imię *</Label>
                      <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Jan" required />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nazwisko *</Label>
                      <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Kowalski" required />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="jan@example.com" required />
                  </div>

                  <div>
                    <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+48 123 456 789" />
                  </div>
                </div>
              )}

              {/* Attendees Section - guests (everyone except the buyer when buyer takes seat 1) */}
              {guestSeatsCount > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-medium">
                      {buyerIsAttendee ? `Dodatkowi uczestnicy (${guestSeatsCount})` : `Uczestnicy / goście (${guestSeatsCount})`}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {buyerIsAttendee
                      ? 'Kupujący jest zapisany jako Uczestnik 1. Dane pozostałych osób możesz uzupełnić teraz lub później — z poziomu strony zamówienia. Każdy uczestnik dostanie własny kod QR.'
                      : 'Masz już własny bilet na to wydarzenie — te bilety będą wyłącznie dla gości. Dane gości możesz uzupełnić teraz lub później w sekcji „Moje bilety". Każdy gość dostanie własny kod QR.'}
                  </p>

                  <div className="space-y-3">
                    {attendees.map((a, idx) => (
                      <div key={idx} className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {buyerIsAttendee ? `Uczestnik ${idx + 2}` : `Gość ${idx + 1}`}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                            opcjonalnie
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={a.firstName}
                            onChange={(e) => updateAttendee(idx, { firstName: e.target.value })}
                            placeholder="Imię"
                          />
                          <Input
                            value={a.lastName}
                            onChange={(e) => updateAttendee(idx, { lastName: e.target.value })}
                            placeholder="Nazwisko"
                          />
                        </div>
                        <Input
                          type="email"
                          value={a.email}
                          onChange={(e) => updateAttendee(idx, { email: e.target.value })}
                          placeholder="Email (opcjonalnie)"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consents */}
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox id="terms" checked={formData.acceptTerms} onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: checked === true })} />
                  <Label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                    Akceptuję{' '}
                    <a href="/page/regulamin" className="text-primary underline" target="_blank">regulamin</a>{' '}i{' '}
                    <a href="/page/polityka-prywatnosci" className="text-primary underline" target="_blank">politykę prywatności</a> *
                  </Label>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox id="marketing" checked={formData.acceptMarketing} onCheckedChange={(checked) => setFormData({ ...formData, acceptMarketing: checked === true })} />
                  <Label htmlFor="marketing" className="text-sm leading-tight cursor-pointer">
                    Wyrażam zgodę na otrzymywanie informacji marketingowych
                  </Label>
                </div>
              </div>

              {paymentMethodTransfer && (
                <div className="text-xs text-muted-foreground bg-muted/30 border border-dashed rounded-md p-3">
                  <strong className="text-foreground">Płatność przelewem:</strong> po rejestracji wyślemy Ci email z danymi do przelewu. {totalSeats > 1 ? 'Bilety QR zostaną wysłane' : 'Bilet QR zostanie wysłany'} po zaksięgowaniu wpłaty.
                </div>
              )}

              {paymentMethodPayu && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Płatność zabezpieczona przez PayU</span>
                </div>
              )}
            </form>
          )}

          <DrawerFooter className="pt-4">
            {transferSuccess || freeSuccess ? (
              <Button size="lg" className="w-full" onClick={() => onOpenChange(false)}>Zamknij</Button>
            ) : noMethods ? (
              <div className="text-sm text-center text-muted-foreground py-2">
                Sprzedaż biletów jest aktualnie wyłączona dla tego wydarzenia.
              </div>
            ) : isFree && hasOwnTicket ? (
              <>
                <Button size="lg" className="w-full" onClick={() => onOpenChange(false)}>
                  Rozumiem, zamknij
                </Button>
                <p className="text-xs text-center text-muted-foreground px-2">
                  Masz już zarezerwowane miejsce na to wydarzenie – nie możesz zarezerwować go ponownie.
                </p>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleSubmit}
                  disabled={loadingMode !== null}
                >
                  {loadingMode === 'checkout' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Przetwarzanie...</>
                  ) : isFree ? (
                    <><CheckCircle2 className="w-4 h-4" />Zarezerwuj miejsce<ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <><CreditCard className="w-4 h-4" />Przejdź do płatności<ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loadingMode !== null}>Anuluj</Button>
              </>
            )}
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
