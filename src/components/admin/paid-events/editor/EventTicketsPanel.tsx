import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ChevronDown, Save, Loader2, Star, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PaymentMethodOption = 'inherit' | 'payu' | 'transfer' | 'paypal' | 'free';
type AudienceOption = 'all' | 'logged_in' | 'guest_only';

const PAYMENT_METHOD_LABELS: Record<PaymentMethodOption, string> = {
  inherit: 'Dziedzicz z wydarzenia (domyślnie)',
  payu: 'Płatność online (PayU)',
  transfer: 'Płatność przelewem',
  paypal: 'Płatność PayPal',
  free: 'Bezpłatny (rezerwacja + email)',
};

const AUDIENCE_LABELS: Record<AudienceOption, string> = {
  all: 'Wszyscy (zalogowani i goście)',
  logged_in: 'Tylko zalogowani użytkownicy',
  guest_only: 'Tylko goście z linkiem zapraszającego',
};

interface EventTicketsPanelProps {
  eventId: string;
  onDataChange: () => void;
}

interface Ticket {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_pln: number;
  quantity_available: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  position: number;
  benefits: string[] | null;
  seats_per_ticket: number | null;
  paypal_payment_link: string | null;
  payment_method: PaymentMethodOption | null;
  audience: AudienceOption | null;
  allow_multiple_purchase: boolean | null;
  transfer_payment_details: string | null;
}

export const EventTicketsPanel: React.FC<EventTicketsPanelProps> = ({
  eventId,
  onDataChange,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [editingData, setEditingData] = useState<Record<string, Partial<Ticket>>>({});
  const [newBenefit, setNewBenefit] = useState<Record<string, string>>({});

  // Fetch event meta (is_free flag + event-level transfer details for fallback validation)
  const { data: eventMeta } = useQuery({
    queryKey: ['paid-event-meta-tickets-panel', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_events')
        .select('is_free, transfer_payment_details')
        .eq('id', eventId)
        .maybeSingle();
      if (error) throw error;
      return data as { is_free: boolean | null; transfer_payment_details: string | null } | null;
    },
  });
  const isFree = !!eventMeta?.is_free;
  const eventTransferDetails = (eventMeta?.transfer_payment_details || '').trim();
  const unitLabel = isFree ? 'Rezerwacja' : 'Bilet';
  const unitLabelLower = isFree ? 'rezerwacja' : 'bilet';

  // Fetch tickets (only non-archived)
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['paid-event-tickets-edit', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_tickets')
        .select('*')
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as Ticket[];
    },
  });

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const maxPosition = Math.max(0, ...tickets.map(t => t.position));
      const { error } = await supabase
        .from('paid_event_tickets')
        .insert({
          event_id: eventId,
          name: isFree ? 'Nowa rezerwacja' : 'Nowy bilet',
          price_pln: isFree ? 0 : 10000, // 100 PLN in grosze
          position: maxPosition + 1,
          is_active: true,
          benefits: [],
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-preview', eventId] });
      toast({ title: `${unitLabel} dodana` });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Update ticket mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Ticket> }) => {
      const payload = { ...data };
      const { error } = await supabase
        .from('paid_event_tickets')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-preview', eventId] });
      toast({ title: `${unitLabel} zaktualizowana` });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Soft-delete ticket mutation (archive — preserves order history via FK)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('paid_event_tickets')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-preview', eventId] });
      toast({
        title: `${unitLabel} zarchiwizowana`,
        description: 'Istniejące zamówienia pozostają nienaruszone.',
      });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  const toggleTicket = (id: string) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTickets(newExpanded);
  };

  const getEditingValue = (ticketId: string, field: keyof Ticket, originalValue: any) => {
    return editingData[ticketId]?.[field] ?? originalValue;
  };

  const setEditingValue = (ticketId: string, field: keyof Ticket, value: any) => {
    setEditingData(prev => ({
      ...prev,
      [ticketId]: {
        ...prev[ticketId],
        [field]: value,
      },
    }));
  };

  const handleSaveTicket = (ticketId: string) => {
    const data = editingData[ticketId];
    if (!data) return;
    const original = tickets.find(t => t.id === ticketId);
    const pm = (data.payment_method ?? original?.payment_method ?? 'inherit') as PaymentMethodOption;
    const ticketTransfer = ((data.transfer_payment_details ?? original?.transfer_payment_details) || '').trim();
    if (pm === 'transfer' && !ticketTransfer && !eventTransferDetails) {
      toast({
        title: 'Brak danych do przelewu',
        description: 'Bilet wymusza płatność przelewem — uzupełnij „Dane do przelewu" w biletcie lub na poziomie wydarzenia w sekcji „Metody płatności".',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate({ id: ticketId, data });
    setEditingData(prev => {
      const newData = { ...prev };
      delete newData[ticketId];
      return newData;
    });
  };

  const addBenefit = (ticketId: string, ticket: Ticket) => {
    const benefit = newBenefit[ticketId]?.trim();
    if (!benefit) return;

    const currentBenefits = getEditingValue(ticketId, 'benefits', ticket.benefits || []) as string[];
    setEditingValue(ticketId, 'benefits', [...currentBenefits, benefit]);
    setNewBenefit(prev => ({ ...prev, [ticketId]: '' }));
  };

  const removeBenefit = (ticketId: string, ticket: Ticket, index: number) => {
    const currentBenefits = getEditingValue(ticketId, 'benefits', ticket.benefits || []) as string[];
    const newBenefits = currentBenefits.filter((_, i) => i !== index);
    setEditingValue(ticketId, 'benefits', newBenefits);
  };

  const formatPrice = (priceInGrosze: number) => {
    return (priceInGrosze / 100).toFixed(2);
  };

  const parsePrice = (priceStr: string): number => {
    const price = parseFloat(priceStr.replace(',', '.'));
    return isNaN(price) ? 0 : Math.round(price * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <Collapsible 
          key={ticket.id} 
          open={expandedTickets.has(ticket.id)} 
          onOpenChange={() => toggleTicket(ticket.id)}
        >
          <Card className={cn(!ticket.is_active && 'opacity-50')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{ticket.name}</span>
                    {ticket.is_featured && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const pm = (getEditingValue(ticket.id, 'payment_method', ticket.payment_method ?? 'inherit') as PaymentMethodOption);
                      const ticketIsFree = pm === 'free' || isFree;
                      const aud = (getEditingValue(ticket.id, 'audience', ticket.audience ?? 'all') as AudienceOption);
                      return (
                        <>
                          {ticketIsFree ? (
                            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                              Bezpłatny
                            </Badge>
                          ) : (
                            <Badge variant="secondary">{formatPrice(ticket.price_pln)} PLN</Badge>
                          )}
                          {pm !== 'inherit' && pm !== 'free' && (
                            <Badge variant="outline" className="text-[10px] uppercase">{pm}</Badge>
                          )}
                          {aud !== 'all' && (
                            <Badge variant="outline" className="text-[10px]">
                              {aud === 'logged_in' ? 'Zalogowani' : 'Goście'}
                            </Badge>
                          )}
                        </>
                      );
                    })()}
                    <ChevronDown 
                      className={cn(
                        'w-4 h-4 transition-transform',
                        expandedTickets.has(ticket.id) && 'rotate-180'
                      )} 
                    />
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <Label htmlFor={`name-${ticket.id}`}>Nazwa {isFree ? 'rezerwacji' : 'pakietu'}</Label>
                  <Input
                    id={`name-${ticket.id}`}
                    value={getEditingValue(ticket.id, 'name', ticket.name)}
                    onChange={(e) => setEditingValue(ticket.id, 'name', e.target.value)}
                    placeholder={isFree ? 'Nazwa rezerwacji' : 'Nazwa pakietu'}
                  />
                </div>

                {/* Per-ticket payment method */}
                <div>
                  <Label>Metoda płatności biletu</Label>
                  <Select
                    value={(getEditingValue(ticket.id, 'payment_method', ticket.payment_method ?? 'inherit') as PaymentMethodOption)}
                    onValueChange={(val) => {
                      setEditingValue(ticket.id, 'payment_method', val as PaymentMethodOption);
                      if (val === 'free') {
                        setEditingValue(ticket.id, 'paypal_payment_link', null);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethodOption[]).map((k) => (
                        <SelectItem key={k} value={k}>{PAYMENT_METHOD_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(() => {
                      const pm = (getEditingValue(ticket.id, 'payment_method', ticket.payment_method ?? 'inherit') as PaymentMethodOption);
                      if (pm === 'free') return 'Bilet bezpłatny — kupujący wypełnia formularz, otrzymuje email potwierdzający, a po kliknięciu CTA — bilet QR. Cena i PayPal ignorowane.';
                      if (pm === 'inherit') return 'Bilet używa metod ustawionych na wydarzeniu (sekcja „Metody płatności" powyżej).';
                      return 'Bilet wymusza tę jedną metodę — przy checkoucie kupujący nie zobaczy innych opcji.';
                    })()}
                  </p>
                </div>

                {/* Per-ticket transfer payment details — shown only when ticket forces 'transfer' */}
                {(getEditingValue(ticket.id, 'payment_method', ticket.payment_method ?? 'inherit') as PaymentMethodOption) === 'transfer' && (
                  <div>
                    <Label htmlFor={`ticket-transfer-${ticket.id}`}>
                      Dane do przelewu (dla tego biletu) {eventTransferDetails ? '' : '*'}
                    </Label>
                    <Textarea
                      id={`ticket-transfer-${ticket.id}`}
                      value={(getEditingValue(ticket.id, 'transfer_payment_details', ticket.transfer_payment_details ?? '') as string) || ''}
                      onChange={(e) => setEditingValue(ticket.id, 'transfer_payment_details', e.target.value.trim() === '' ? null : e.target.value)}
                      placeholder={
                        'Odbiorca: Pure Life Sp. z o.o.\n' +
                        'Numer konta: PL00 0000 0000 0000 0000 0000 0000\n' +
                        'BIC/SWIFT: XXXXXXXX\n' +
                        'Tytuł przelewu: Bilet [Imię Nazwisko] – ' + (ticket.name || 'TEST') + '\n' +
                        'Termin: 7 dni od rejestracji'
                      }
                      rows={6}
                      className="mt-1 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {eventTransferDetails
                        ? 'Opcjonalnie. Jeśli puste, użyte zostaną dane do przelewu z poziomu wydarzenia (sekcja „Metody płatności").'
                        : 'Wymagane — wydarzenie nie ma ustawionych globalnych danych do przelewu. Ta treść trafi do emaila kupującego po rezerwacji tego biletu.'}
                    </p>
                  </div>
                )}



                {/* Per-ticket audience */}
                <div>
                  <Label>Widoczność biletu</Label>
                  <Select
                    value={(getEditingValue(ticket.id, 'audience', ticket.audience ?? 'all') as AudienceOption)}
                    onValueChange={(val) => setEditingValue(ticket.id, 'audience', val as AudienceOption)}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AUDIENCE_LABELS) as AudienceOption[]).map((k) => (
                        <SelectItem key={k} value={k}>{AUDIENCE_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(() => {
                      const aud = (getEditingValue(ticket.id, 'audience', ticket.audience ?? 'all') as AudienceOption);
                      if (aud === 'logged_in') return 'Bilet widoczny tylko dla zalogowanych użytkowników.';
                      if (aud === 'guest_only') return 'Bilet widoczny tylko dla niezalogowanych odwiedzających, którzy weszli przez link partnerski (URL z ?ref=...).';
                      return 'Bilet widoczny dla wszystkich.';
                    })()}
                  </p>
                </div>

                <div>
                  <Label htmlFor={`price-${ticket.id}`}>Cena (PLN)</Label>
                  <Input
                    id={`price-${ticket.id}`}
                    type="text"
                    value={formatPrice(getEditingValue(ticket.id, 'price_pln', ticket.price_pln) || 0)}
                    onChange={(e) => setEditingValue(ticket.id, 'price_pln', parsePrice(e.target.value))}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cena w PLN (np. 648,00). Jeśli puste — wyświetli się 0,00 zł.
                  </p>
                </div>

                {(() => {
                  const pm = (getEditingValue(ticket.id, 'payment_method', ticket.payment_method ?? 'inherit') as PaymentMethodOption);
                  const ticketIsFree = pm === 'free' || isFree;
                  return !ticketIsFree;
                })() && (
                  <div>
                    <Label htmlFor={`paypal-${ticket.id}`}>Łącze do płatności PayPal (opcjonalne)</Label>
                    <Input
                      id={`paypal-${ticket.id}`}
                      type="url"
                      value={getEditingValue(ticket.id, 'paypal_payment_link', ticket.paypal_payment_link ?? '') as string}
                      onChange={(e) => setEditingValue(ticket.id, 'paypal_payment_link', e.target.value.trim() || null)}
                      placeholder="https://www.paypal.com/ncp/payment/XXXXX"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Jeśli wypełnione, klient zobaczy dodatkową opcję płatności „PayPal" i zostanie przekierowany na to łącze. Status płatności potwierdzasz ręcznie w zamówieniach.
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor={`description-${ticket.id}`}>Opis</Label>
                  <Textarea
                    id={`description-${ticket.id}`}
                    value={getEditingValue(ticket.id, 'description', ticket.description || '')}
                    onChange={(e) => setEditingValue(ticket.id, 'description', e.target.value)}
                    placeholder="Opis pakietu..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`quantity-${ticket.id}`}>Dostępna ilość</Label>
                    <Input
                      id={`quantity-${ticket.id}`}
                      type="number"
                      min="0"
                      value={getEditingValue(ticket.id, 'quantity_available', ticket.quantity_available) || ''}
                      onChange={(e) => setEditingValue(ticket.id, 'quantity_available', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Bez limitu"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`seats-${ticket.id}`}>Osób na 1 {unitLabelLower}</Label>
                    <Input
                      id={`seats-${ticket.id}`}
                      type="number"
                      min="1"
                      max="50"
                      value={getEditingValue(ticket.id, 'seats_per_ticket', ticket.seats_per_ticket ?? 1) || 1}
                      onChange={(e) => setEditingValue(ticket.id, 'seats_per_ticket', Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                      placeholder="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {isFree ? 'Rezerwacja grupowa: ile osób wchodzi na 1 sztukę' : 'Bilet zbiorowy: ile osób wchodzi na 1 sztukę'}
                    </p>
                  </div>
                </div>

                {/* Allow multi-purchase toggle */}
                <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                  <div className="space-y-1">
                    <Label htmlFor={`multi-${ticket.id}`} className="text-sm font-medium">
                      Zezwól na zakup więcej niż 1 sztuki
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Gdy włączone, kupujący może w jednym zamówieniu zarezerwować kilka {unitLabelLower === 'bilet' ? 'biletów' : 'rezerwacji'} (każda z obowiązkowymi danymi uczestnika: imię, nazwisko, email).
                    </p>
                  </div>
                  <Switch
                    id={`multi-${ticket.id}`}
                    checked={!!getEditingValue(ticket.id, 'allow_multiple_purchase', ticket.allow_multiple_purchase ?? false)}
                    onCheckedChange={(checked) => setEditingValue(ticket.id, 'allow_multiple_purchase', checked)}
                  />
                </div>

                {/* Benefits */}
                <div>
                  <Label>Benefity</Label>
                  <div className="space-y-2 mt-2">
                    {(getEditingValue(ticket.id, 'benefits', ticket.benefits || []) as string[]).map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={benefit}
                          readOnly
                          className="flex-1 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeBenefit(ticket.id, ticket, index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        value={newBenefit[ticket.id] || ''}
                        onChange={(e) => setNewBenefit(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        placeholder="Dodaj benefit..."
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addBenefit(ticket.id, ticket);
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addBenefit(ticket.id, ticket)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={getEditingValue(ticket.id, 'is_active', ticket.is_active)}
                      onCheckedChange={(checked) => setEditingValue(ticket.id, 'is_active', checked)}
                    />
                    <Label className="text-sm">Aktywny</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={getEditingValue(ticket.id, 'is_featured', ticket.is_featured || false)}
                      onCheckedChange={(checked) => setEditingValue(ticket.id, 'is_featured', checked)}
                    />
                    <Label className="text-sm">Wyróżniony</Label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveTicket(ticket.id)}
                    disabled={updateMutation.isPending || !editingData[ticket.id]}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Zapisz
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(isFree ? 'Czy na pewno zarchiwizować tę rezerwację?' : 'Czy na pewno zarchiwizować ten bilet?')) {
                        deleteMutation.mutate(ticket.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Usuń
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}

      {tickets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            {isFree ? 'Brak rezerwacji. Dodaj pierwszą rezerwację poniżej.' : 'Brak biletów. Dodaj pierwszy bilet poniżej.'}
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => createMutation.mutate()}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 mr-2" />
        )}
        {isFree ? 'Dodaj rezerwację' : 'Dodaj bilet'}
      </Button>
    </div>
  );
};
