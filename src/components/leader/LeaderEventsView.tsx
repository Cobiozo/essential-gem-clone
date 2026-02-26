import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarPlus, Plus, Pencil, Trash2, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface EventFormData {
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  end_time: string;
  zoom_link: string;
  location: string;
}

const emptyForm: EventFormData = {
  title: '', description: '', event_type: 'webinar',
  start_time: '', end_time: '', zoom_link: '', location: '',
};

const LeaderEventsView: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormData>(emptyForm);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['leader-events', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_type, start_time, end_time, is_active, zoom_link, location, description')
        .eq('host_user_id', user!.id)
        .in('event_type', ['webinar', 'team_training'])
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const hostName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
      const payload = {
        title: form.title,
        description: form.description || null,
        event_type: form.event_type,
        start_time: form.start_time,
        end_time: form.end_time,
        zoom_link: form.zoom_link || null,
        location: form.location || null,
        host_user_id: user!.id,
        host_name: hostName,
        is_active: true,
        is_published: true,
        created_by: user!.id,
      };

      if (editingId) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
      }

      // Log action
      await supabase.from('platform_team_actions').insert({
        leader_user_id: user!.id,
        action_type: editingId ? 'edit_event' : 'create_event',
        old_value: null,
        new_value: form.title,
      });
    },
    onSuccess: () => {
      toast({ title: 'Zapisano', description: editingId ? 'Wydarzenie zaktualizowane' : 'Wydarzenie utworzone' });
      queryClient.invalidateQueries({ queryKey: ['leader-events'] });
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err: any) => {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      await supabase.from('platform_team_actions').insert({
        leader_user_id: user!.id,
        action_type: 'delete_event',
        old_value: events.find(e => e.id === id)?.title || '',
        new_value: null,
      });
    },
    onSuccess: () => {
      toast({ title: 'Usunięto wydarzenie' });
      queryClient.invalidateQueries({ queryKey: ['leader-events'] });
    },
  });

  const openEdit = (event: any) => {
    setEditingId(event.id);
    setForm({
      title: event.title, description: event.description || '',
      event_type: event.event_type, start_time: event.start_time?.slice(0, 16) || '',
      end_time: event.end_time?.slice(0, 16) || '', zoom_link: event.zoom_link || '',
      location: event.location || '',
    });
    setFormOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Wydarzenia zespołu
            </CardTitle>
            <CardDescription>Twórz webinary i szkolenia dla swojego zespołu.</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nowe wydarzenie
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Nie masz jeszcze żadnych wydarzeń</p>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm truncate">{event.title}</span>
                    <Badge variant={event.is_active ? 'default' : 'secondary'} className="text-xs">
                      {event.event_type === 'webinar' ? 'Webinar' : 'Szkolenie'}
                    </Badge>
                    {!event.is_active && <Badge variant="outline" className="text-xs">Nieaktywne</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.start_time ? format(new Date(event.start_time), 'dd MMM yyyy, HH:mm', { locale: pl }) : '—'}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(event)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(event.id)}
                    disabled={deleteMutation.isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Typ</Label>
              <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="team_training">Szkolenie zespołowe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tytuł</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>Koniec</Label>
                <Input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Link Zoom (opcjonalnie)</Label>
              <Input value={form.zoom_link} onChange={e => setForm(f => ({ ...f, zoom_link: e.target.value }))} />
            </div>
            <div>
              <Label>Lokalizacja (opcjonalnie)</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Anuluj</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.title || !form.start_time || !form.end_time || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editingId ? 'Zapisz zmiany' : 'Utwórz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LeaderEventsView;
