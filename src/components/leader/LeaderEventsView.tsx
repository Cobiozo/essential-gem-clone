import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarPlus, Plus, Pencil, Trash2, Loader2, Calendar, Video, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { WebinarForm } from '@/components/admin/WebinarForm';
import { TeamTrainingForm } from '@/components/admin/TeamTrainingForm';
import type { DbEvent } from '@/types/events';

type FormMode = 'list' | 'type-select' | 'webinar' | 'team_training';

const LeaderEventsView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<FormMode>('list');
  const [editingEvent, setEditingEvent] = useState<DbEvent | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['leader-events', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('host_user_id', user!.id)
        .in('event_type', ['webinar', 'team_training'])
        .eq('is_active', true)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return (data || []) as DbEvent[];
    },
    enabled: !!user,
  });

  const handleDelete = async (event: DbEvent) => {
    const { error } = await supabase.from('events').update({ is_active: false }).eq('id', event.id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('platform_team_actions').insert({
      leader_user_id: user!.id,
      action_type: 'delete_event',
      old_value: event.title,
      new_value: null,
    });
    toast({ title: 'Usunięto wydarzenie' });
    queryClient.invalidateQueries({ queryKey: ['leader-events'] });
  };

  const handleSave = async () => {
    // Log create/edit action
    await supabase.from('platform_team_actions').insert({
      leader_user_id: user!.id,
      action_type: editingEvent ? 'edit_event' : 'create_event',
      old_value: null,
      new_value: editingEvent?.title || 'Nowe wydarzenie',
    });
    queryClient.invalidateQueries({ queryKey: ['leader-events'] });
    setMode('list');
    setEditingEvent(null);
  };

  const handleCancel = () => {
    setMode('list');
    setEditingEvent(null);
  };

  const openEdit = (event: DbEvent) => {
    setEditingEvent(event);
    setMode(event.event_type === 'webinar' ? 'webinar' : 'team_training');
  };

  const openNew = (type: 'webinar' | 'team_training') => {
    setEditingEvent(null);
    setMode(type);
  };

  // Show form view
  if (mode === 'webinar') {
    return (
      <WebinarForm
        editingWebinar={editingEvent}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  if (mode === 'team_training') {
    return (
      <TeamTrainingForm
        editingTraining={editingEvent}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <>
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
            <Button size="sm" onClick={() => setMode('type-select')}>
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
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(event)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Type selection dialog */}
      <Dialog open={mode === 'type-select'} onOpenChange={(open) => !open && setMode('list')}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wybierz typ wydarzenia</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => openNew('webinar')}
            >
              <Video className="h-6 w-6 text-primary" />
              <span>Webinar</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => openNew('team_training')}
            >
              <Users className="h-6 w-6 text-primary" />
              <span>Szkolenie zespołowe</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeaderEventsView;
