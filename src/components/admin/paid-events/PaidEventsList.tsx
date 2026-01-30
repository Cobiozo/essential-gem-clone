import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Calendar, MapPin, Users, Copy, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PaidEventContentEditor } from './PaidEventContentEditor';

interface PaidEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  event_date: string;
  event_end_date: string | null;
  location: string | null;
  is_online: boolean | null;
  stream_url: string | null;
  banner_url: string | null;
  max_tickets: number | null;
  tickets_sold: number | null;
  is_active: boolean | null;
  is_published: boolean | null;
  visible_to_partners: boolean | null;
  visible_to_clients: boolean | null;
  visible_to_specjalista: boolean | null;
  visible_to_everyone: boolean | null;
  created_at: string;
  created_by: string | null;
}

const defaultEvent: Partial<PaidEvent> = {
  title: '',
  slug: '',
  description: '',
  short_description: '',
  event_date: '',
  event_end_date: null,
  location: '',
  is_online: false,
  stream_url: '',
  banner_url: '',
  max_tickets: null,
  is_active: true,
  is_published: false,
  visible_to_partners: true,
  visible_to_clients: true,
  visible_to_specjalista: true,
  visible_to_everyone: true,
};

// Generate slug from title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
};

export const PaidEventsList: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingEvent, setEditingEvent] = useState<PaidEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<PaidEvent>>(defaultEvent);
  const [contentEditorEvent, setContentEditorEvent] = useState<PaidEvent | null>(null);

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['paid-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_events')
        .select('*')
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data as PaidEvent[];
    },
  });

  // Create event mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<PaidEvent>) => {
      if (!data.title || !data.event_date) throw new Error('Tytuł i data są wymagane');
      const slug = data.slug || generateSlug(data.title);
      const { error } = await supabase.from('paid_events').insert([{ 
        ...data, 
        slug,
        title: data.title,
        event_date: data.event_date 
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-events'] });
      toast({ title: 'Wydarzenie utworzone' });
      setIsCreating(false);
      setFormData(defaultEvent);
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Update event mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PaidEvent> }) => {
      const { error } = await supabase.from('paid_events').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-events'] });
      toast({ title: 'Wydarzenie zaktualizowane' });
      setEditingEvent(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Delete event mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('paid_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-events'] });
      toast({ title: 'Wydarzenie usunięte' });
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (event: PaidEvent) => {
    setEditingEvent(event);
    setFormData(event);
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setFormData(defaultEvent);
  };

  const closeDialog = () => {
    setEditingEvent(null);
    setIsCreating(false);
    setFormData(defaultEvent);
  };

  const copyEventLink = (slug: string) => {
    const url = `${window.location.origin}/events/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link skopiowany do schowka' });
  };

  const getAvailability = (event: PaidEvent) => {
    if (!event.max_tickets) return null;
    const sold = event.tickets_sold || 0;
    const available = event.max_tickets - sold;
    return { available, total: event.max_tickets, sold };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Lista wydarzeń ({events.length})</h3>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nowe wydarzenie
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Brak wydarzeń. Kliknij "Nowe wydarzenie" aby dodać pierwsze.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wydarzenie</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Bilety</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const availability = getAvailability(event);
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{event.title}</div>
                        {event.location && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </div>
                        )}
                        {event.is_online && (
                          <Badge variant="outline" className="text-xs">Online</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(event.event_date), 'dd MMM yyyy, HH:mm', { locale: pl })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {availability ? (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className={availability.available === 0 ? 'text-destructive' : ''}>
                            {availability.sold}/{availability.total}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">bez limitu</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {event.is_published ? (
                          <Badge variant="default">Opublikowany</Badge>
                        ) : (
                          <Badge variant="secondary">Szkic</Badge>
                        )}
                        {!event.is_active && (
                          <Badge variant="destructive">Nieaktywny</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyEventLink(event.slug)}
                          title="Kopiuj link do zakupu"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setContentEditorEvent(event)}
                          title="Edytuj treści i bilety"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(event)}
                          title="Edytuj wydarzenie"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Czy na pewno usunąć to wydarzenie?')) {
                              deleteMutation.mutate(event.id);
                            }
                          }}
                          title="Usuń wydarzenie"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || !!editingEvent} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'}
            </DialogTitle>
            <DialogDescription>
              Wypełnij dane wydarzenia płatnego
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Tytuł *</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData({ 
                    ...formData, 
                    title,
                    slug: !editingEvent ? generateSlug(title) : formData.slug 
                  });
                }}
                placeholder="Nazwa wydarzenia"
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="wydarzenie-url"
              />
            </div>

            <div>
              <Label htmlFor="short_description">Krótki opis</Label>
              <Input
                id="short_description"
                value={formData.short_description || ''}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                placeholder="Krótki opis do listy"
              />
            </div>

            <div>
              <Label htmlFor="description">Pełny opis</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Szczegółowy opis wydarzenia"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event_date">Data rozpoczęcia *</Label>
                <Input
                  id="event_date"
                  type="datetime-local"
                  value={formData.event_date?.slice(0, 16) || ''}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="event_end_date">Data zakończenia</Label>
                <Input
                  id="event_end_date"
                  type="datetime-local"
                  value={formData.event_end_date?.slice(0, 16) || ''}
                  onChange={(e) => setFormData({ ...formData, event_end_date: e.target.value || null })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Lokalizacja</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Np. Warszawa, ul. Przykładowa 1"
                />
              </div>
              <div>
                <Label htmlFor="max_tickets">Limit biletów</Label>
                <Input
                  id="max_tickets"
                  type="number"
                  min="1"
                  value={formData.max_tickets || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    max_tickets: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="Brak limitu"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_online || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_online: checked })}
                />
                <Label>Wydarzenie online</Label>
              </div>
            </div>

            {formData.is_online && (
              <div>
                <Label htmlFor="stream_url">Link do transmisji</Label>
                <Input
                  id="stream_url"
                  value={formData.stream_url || ''}
                  onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}

            <div>
              <Label htmlFor="banner_url">URL banera</Label>
              <Input
                id="banner_url"
                value={formData.banner_url || ''}
                onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-3">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <span className="text-sm">Aktywne</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_published ?? false}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                  />
                  <span className="text-sm">Opublikowane</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Widoczność dla ról</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.visible_to_partners ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, visible_to_partners: checked })}
                  />
                  <span className="text-sm">Partnerzy</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.visible_to_clients ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, visible_to_clients: checked })}
                  />
                  <span className="text-sm">Klienci</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.visible_to_specjalista ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, visible_to_specjalista: checked })}
                  />
                  <span className="text-sm">Specjaliści</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.visible_to_everyone ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, visible_to_everyone: checked })}
                  />
                  <span className="text-sm">Wszyscy</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Anuluj
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.title || !formData.event_date || createMutation.isPending || updateMutation.isPending}
            >
              {editingEvent ? 'Zapisz zmiany' : 'Utwórz wydarzenie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Editor Dialog */}
      {contentEditorEvent && (
        <PaidEventContentEditor
          event={contentEditorEvent}
          onClose={() => setContentEditorEvent(null)}
        />
      )}
    </div>
  );
};
