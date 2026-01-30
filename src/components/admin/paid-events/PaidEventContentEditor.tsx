import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Ticket as TicketIcon, FileText, X } from 'lucide-react';
import { ContentSectionEditor } from './ContentSectionEditor';
import { TicketsEditor } from './TicketBenefitsEditor';

interface PaidEvent {
  id: string;
  title: string;
  slug: string;
}

interface Ticket {
  id: string;
  event_id: string;
  name: string;
  price: number;
  description: string | null;
  benefits: string[] | null;
  highlight_text: string | null;
  is_featured: boolean | null;
  available_quantity: number | null;
  max_per_order: number | null;
  sale_start: string | null;
  sale_end: string | null;
  is_active: boolean | null;
}

interface PaidEventContentEditorProps {
  event: PaidEvent;
  onClose: () => void;
}

const defaultTicket: Partial<Ticket> = {
  name: '',
  price: 0,
  description: '',
  available_quantity: null,
  max_per_order: 1,
  is_active: true,
  benefits: [],
  highlight_text: null,
  is_featured: false,
};

export const PaidEventContentEditor: React.FC<PaidEventContentEditorProps> = ({
  event,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sections');
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketFormData, setTicketFormData] = useState<Partial<Ticket>>(defaultTicket);

  // Fetch tickets for this event
  const { data: tickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ['paid-event-tickets', event.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_tickets')
        .select('*')
        .eq('event_id', event.id)
        .order('price', { ascending: true });
      
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        benefits: Array.isArray(t.benefits) ? t.benefits : [],
      })) as Ticket[];
    },
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: Partial<Ticket>) => {
      if (!data.name || data.price === undefined) {
        throw new Error('Nazwa i cena są wymagane');
      }
      const { error } = await supabase.from('paid_event_tickets').insert([{
        name: data.name,
        price: data.price,
        description: data.description || null,
        available_quantity: data.available_quantity || null,
        max_per_order: data.max_per_order || null,
        is_active: data.is_active ?? true,
        benefits: data.benefits || [],
        highlight_text: data.highlight_text || null,
        is_featured: data.is_featured || false,
        event_id: event.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets', event.id] });
      toast({ title: 'Bilet dodany' });
      setIsCreatingTicket(false);
      setTicketFormData(defaultTicket);
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Ticket> }) => {
      const { error } = await supabase
        .from('paid_event_tickets')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets', event.id] });
      toast({ title: 'Bilet zaktualizowany' });
      setEditingTicket(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Delete ticket mutation
  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('paid_event_tickets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets', event.id] });
      toast({ title: 'Bilet usunięty' });
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  const handleTicketSubmit = () => {
    if (editingTicket) {
      updateTicketMutation.mutate({ id: editingTicket.id, data: ticketFormData });
    } else {
      createTicketMutation.mutate(ticketFormData);
    }
  };

  const openTicketEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setTicketFormData(ticket);
  };

  const closeTicketDialog = () => {
    setEditingTicket(null);
    setIsCreatingTicket(false);
    setTicketFormData(defaultTicket);
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edycja treści: {event.title}</DialogTitle>
          <DialogDescription>
            Zarządzaj sekcjami CMS i biletami wydarzenia
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="sections" className="gap-2">
                <FileText className="w-4 h-4" />
                Sekcje treści
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-2">
                <TicketIcon className="w-4 h-4" />
                Bilety ({tickets.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sections" className="mt-0">
              <ContentSectionEditor eventId={event.id} />
            </TabsContent>

            <TabsContent value="tickets" className="mt-0 space-y-4">
              {/* Tickets List */}
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Lista biletów
                </h4>
                <Button size="sm" onClick={() => setIsCreatingTicket(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Dodaj bilet
                </Button>
              </div>

              {tickets.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-muted-foreground text-sm">
                    Brak biletów. Kliknij "Dodaj bilet" aby utworzyć pierwszy pakiet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => (
                    <Card key={ticket.id} className={!ticket.is_active ? 'opacity-50' : ''}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{ticket.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {ticket.price} PLN
                              {ticket.available_quantity && ` • Limit: ${ticket.available_quantity}`}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openTicketEdit(ticket)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                if (confirm('Usunąć ten bilet?')) {
                                  deleteTicketMutation.mutate(ticket.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Benefits Editor */}
              {tickets.length > 0 && (
                <div className="pt-4 border-t">
                  <TicketsEditor
                    eventId={event.id}
                    tickets={tickets}
                    onRefresh={() => refetchTickets()}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zamknij
          </Button>
        </DialogFooter>

        {/* Ticket Create/Edit Dialog */}
        <Dialog open={isCreatingTicket || !!editingTicket} onOpenChange={closeTicketDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTicket ? 'Edytuj bilet' : 'Nowy bilet'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Nazwa biletu *</Label>
                <Input
                  value={ticketFormData.name || ''}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, name: e.target.value })}
                  placeholder="Np. Bilet standardowy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cena (PLN) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticketFormData.price || ''}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Limit biletów</Label>
                  <Input
                    type="number"
                    min="1"
                    value={ticketFormData.available_quantity || ''}
                    onChange={(e) => setTicketFormData({ 
                      ...ticketFormData, 
                      available_quantity: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="Bez limitu"
                  />
                </div>
              </div>

              <div>
                <Label>Max na zamówienie</Label>
                <Input
                  type="number"
                  min="1"
                  value={ticketFormData.max_per_order || ''}
                  onChange={(e) => setTicketFormData({ 
                    ...ticketFormData, 
                    max_per_order: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="1"
                />
              </div>

              <div>
                <Label>Opis</Label>
                <Textarea
                  value={ticketFormData.description || ''}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                  placeholder="Opcjonalny opis biletu"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={ticketFormData.is_active ?? true}
                  onCheckedChange={(checked) => setTicketFormData({ ...ticketFormData, is_active: checked })}
                />
                <Label>Bilet aktywny (dostępny do kupienia)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeTicketDialog}>
                Anuluj
              </Button>
              <Button 
                onClick={handleTicketSubmit}
                disabled={createTicketMutation.isPending || updateTicketMutation.isPending}
              >
                {editingTicket ? 'Zapisz' : 'Dodaj bilet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
