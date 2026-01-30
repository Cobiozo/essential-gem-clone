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

  // Fetch tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['paid-event-tickets-edit', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_tickets')
        .select('*')
        .eq('event_id', eventId)
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
          name: 'Nowy bilet',
          price_pln: 10000, // 100 PLN in grosze
          position: maxPosition + 1,
          is_active: true,
          benefits: [],
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-preview', eventId] });
      toast({ title: 'Bilet dodany' });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Update ticket mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Ticket> }) => {
      const { error } = await supabase
        .from('paid_event_tickets')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-preview', eventId] });
      toast({ title: 'Bilet zaktualizowany' });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Delete ticket mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('paid_event_tickets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets-preview', eventId] });
      toast({ title: 'Bilet usunięty' });
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
    if (data) {
      updateMutation.mutate({ id: ticketId, data });
      setEditingData(prev => {
        const newData = { ...prev };
        delete newData[ticketId];
        return newData;
      });
    }
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
                    <Badge variant="secondary">
                      {formatPrice(ticket.price_pln)} PLN
                    </Badge>
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
                  <Label htmlFor={`name-${ticket.id}`}>Nazwa pakietu</Label>
                  <Input
                    id={`name-${ticket.id}`}
                    value={getEditingValue(ticket.id, 'name', ticket.name)}
                    onChange={(e) => setEditingValue(ticket.id, 'name', e.target.value)}
                    placeholder="Nazwa pakietu"
                  />
                </div>

                <div>
                  <Label htmlFor={`price-${ticket.id}`}>Cena (PLN)</Label>
                  <Input
                    id={`price-${ticket.id}`}
                    type="text"
                    value={formatPrice(getEditingValue(ticket.id, 'price_pln', ticket.price_pln))}
                    onChange={(e) => setEditingValue(ticket.id, 'price_pln', parsePrice(e.target.value))}
                    placeholder="100.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cena w PLN (np. 648.00)
                  </p>
                </div>

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
                      if (confirm('Czy na pewno usunąć ten bilet?')) {
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
            Brak biletów. Dodaj pierwszy bilet poniżej.
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
        Dodaj bilet
      </Button>
    </div>
  );
};
