import React, { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CreditCard, ArrowRight, Shield, Banknote, CheckCircle2, Mail, Minus, Plus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TicketInfo {
  id: string;
  name: string;
  price: number;
  seats_per_ticket?: number;
  available_quantity?: number | null;
}

interface PurchaseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  ticket: TicketInfo | null;
  currency?: string;
  paymentMethodPayu?: boolean;
  paymentMethodTransfer?: boolean;
  transferPaymentDetails?: string | null;
  refCode?: string | null;
}

type SubmitMode = 'payu' | 'transfer';

interface Attendee {
  firstName: string;
  lastName: string;
  email: string;
}

const MAX_TICKETS = 10;

export const PurchaseDrawer: React.FC<PurchaseDrawerProps> = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  ticket,
  currency = 'PLN',
  paymentMethodPayu = true,
  paymentMethodTransfer = false,
  transferPaymentDetails = null,
  refCode = null,
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loadingMode, setLoadingMode] = useState<SubmitMode | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);
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

  const seatsPerTicket = Math.max(1, ticket?.seats_per_ticket ?? 1);
  const totalSeats = quantity * seatsPerTicket;
  const totalPrice = (ticket?.price ?? 0) * quantity;

  const maxQty = useMemo(() => {
    const qa = ticket?.available_quantity;
    return Math.max(1, Math.min(MAX_TICKETS, qa && qa > 0 ? qa : MAX_TICKETS));
  }, [ticket?.available_quantity]);

  // Auto-fill from logged-in user's profile when the drawer opens (don't overwrite user input)
  useEffect(() => {
    if (!open || !user || !profile) return;
    setFormData(prev => ({
      ...prev,
      firstName: prev.firstName || (profile as any).first_name || '',
      lastName: prev.lastName || (profile as any).last_name || '',
      email: prev.email || (profile as any).email || user.email || '',
      phone: prev.phone || (profile as any).phone_number || '',
    }));
  }, [open, user, profile]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setTransferSuccess(false);
      setLoadingMode(null);
      setQuantity(1);
      setAttendees([]);
    }
  }, [open]);

  // Extra attendees beyond the buyer (buyer counts as seat #1)
  const extraSeats = Math.max(0, totalSeats - 1);

  // Resize attendees array when extraSeats changes (preserve existing entries)
  useEffect(() => {
    setAttendees(prev => {
      const next = prev.slice(0, extraSeats);
      while (next.length < extraSeats) {
        next.push({ firstName: '', lastName: '', email: '' });
      }
      return next;
    });
  }, [extraSeats]);

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
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({ title: 'Uzupełnij dane', description: 'Imię, nazwisko i email kupującego są wymagane', variant: 'destructive' });
      return false;
    }
    if (!formData.acceptTerms) {
      toast({ title: 'Akceptacja regulaminu', description: 'Musisz zaakceptować regulamin aby kontynuować', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const buildPayload = () => {
    const buyerAttendee = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim() || null,
    };
    const extras = attendees.map(a => ({
      firstName: a.firstName.trim(),
      lastName: a.lastName.trim(),
      email: a.email?.trim() || null,
    }));
    return {
      eventId,
      ticketId: ticket!.id,
      quantity,
      buyer: {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || '',
      },
      attendees: [buyerAttendee, ...extras],
      acceptMarketing: formData.acceptMarketing,
      refCode: refCode || null,
    };
  };

  const handlePayU = async () => {
    if (!validate() || !ticket) return;
    setLoadingMode('payu');
    try {
      const { data, error } = await supabase.functions.invoke('payu-create-order', { body: buildPayload() });
      if (error) throw error;
      if (data?.redirectUri) {
        window.location.href = data.redirectUri;
      } else {
        throw new Error('Brak URL przekierowania');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({ title: 'Błąd płatności', description: error.message || 'Wystąpił błąd podczas tworzenia zamówienia', variant: 'destructive' });
    } finally {
      setLoadingMode(null);
    }
  };

  const handleTransfer = async () => {
    if (!validate() || !ticket) return;
    setLoadingMode('transfer');
    try {
      const payload = buildPayload();
      console.log('[purchase] transfer payload', { quantity: payload.quantity, attendees: payload.attendees.length, totalSeats });
      const { data, error } = await supabase.functions.invoke('register-event-transfer-order', { body: payload });
      if (error) throw error;
      if (data?.success) {
        // Verify what actually got persisted (helps detect quantity/attendees mismatches)
        if (data?.orderId) {
          const { data: saved } = await supabase
            .from('paid_event_orders')
            .select('quantity, total_amount')
            .eq('id', data.orderId)
            .maybeSingle();
          console.log('[purchase] saved order', saved, 'expected qty=', payload.quantity);
          if (saved && saved.quantity !== payload.quantity) {
            toast({
              title: 'Uwaga: rozbieżność',
              description: `Wybrano ${payload.quantity} biletów, ale w bazie zapisano ${saved.quantity}. Skontaktuj się z administratorem.`,
              variant: 'destructive',
            });
          }
        }
        setTransferSuccess(true);
      } else {
        throw new Error(data?.error || 'Nie udało się zarejestrować rezerwacji');
      }
    } catch (error: any) {
      console.error('Transfer registration error:', error);
      toast({ title: 'Błąd rejestracji', description: error.message || 'Wystąpił błąd podczas rejestracji', variant: 'destructive' });
    } finally {
      setLoadingMode(null);
    }
  };

  if (!ticket) return null;

  const noMethods = !paymentMethodPayu && !paymentMethodTransfer;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle>{transferSuccess ? 'Rezerwacja przyjęta' : 'Kup bilet'}</DrawerTitle>
            <DrawerDescription>
              {eventTitle} - {ticket.name}
            </DrawerDescription>
          </DrawerHeader>

          {transferSuccess ? (
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
              {/* Order Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Bilet:</span>
                  <span className="font-medium text-right">{ticket.name}</span>
                </div>

                {/* Quantity selector */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm">Liczba biletów</Label>
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
                    <span>1 bilet = {seatsPerTicket} osób · razem <strong className="text-foreground">{totalSeats} uczestników</strong></span>
                  </div>
                )}

                {quantity > 1 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Cena za bilet:</span>
                    <span>{quantity} × {formatPrice(ticket?.price ?? 0)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-border/50">
                  <span className="font-medium">Do zapłaty {quantity > 1 ? `(${quantity} bilety)` : ''}:</span>
                  <span className="text-xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              {/* Buyer Data */}
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

              {/* Attendees Section - extra attendees beyond the buyer */}
              {extraSeats > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-medium">Dodatkowi uczestnicy ({extraSeats})</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Kupujący jest zapisany jako Uczestnik 1. Dane pozostałych osób możesz uzupełnić teraz lub później —
                    z poziomu strony zamówienia. Każdy uczestnik dostanie własny kod QR.
                  </p>

                  <div className="space-y-3">
                    {attendees.map((a, idx) => (
                      <div key={idx} className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Uczestnik {idx + 2}
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
            {transferSuccess ? (
              <Button size="lg" className="w-full" onClick={() => onOpenChange(false)}>Zamknij</Button>
            ) : noMethods ? (
              <div className="text-sm text-center text-muted-foreground py-2">
                Sprzedaż biletów jest aktualnie wyłączona dla tego wydarzenia.
              </div>
            ) : (
              <>
                {paymentMethodPayu && (
                  <Button size="lg" className="w-full gap-2" onClick={handlePayU} disabled={loadingMode !== null}>
                    {loadingMode === 'payu' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Przetwarzanie...</>
                    ) : (
                      <><CreditCard className="w-4 h-4" />Przejdź do płatności<ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                )}

                {paymentMethodTransfer && (
                  <Button size="lg" variant={paymentMethodPayu ? 'outline' : 'default'} className="w-full gap-2" onClick={handleTransfer} disabled={loadingMode !== null}>
                    {loadingMode === 'transfer' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Rejestrowanie...</>
                    ) : (
                      <><Banknote className="w-4 h-4" />Zarejestruj mnie i wyślij dane do przelewu</>
                    )}
                  </Button>
                )}

                <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loadingMode !== null}>Anuluj</Button>
              </>
            )}
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
