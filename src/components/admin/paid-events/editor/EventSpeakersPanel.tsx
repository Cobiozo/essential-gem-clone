import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ChevronDown, Save, Loader2, User } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface EventSpeakersPanelProps {
  eventId: string;
  onDataChange: () => void;
}

interface Speaker {
  id: string;
  event_id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  position: number | null;
}

export const EventSpeakersPanel: React.FC<EventSpeakersPanelProps> = ({
  eventId,
  onDataChange,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSpeakers, setExpandedSpeakers] = useState<Set<string>>(new Set());
  const [editingData, setEditingData] = useState<Record<string, Partial<Speaker>>>({});

  // Fetch speakers
  const { data: speakers = [], isLoading } = useQuery({
    queryKey: ['paid-event-speakers-edit', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_speakers')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as Speaker[];
    },
  });

  // Create speaker mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const maxPosition = Math.max(0, ...speakers.map(s => s.position));
      const { error } = await supabase
        .from('paid_event_speakers')
        .insert({
          event_id: eventId,
          name: 'Nowy prelegent',
          position: maxPosition + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-speakers-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-speakers-preview', eventId] });
      toast({ title: 'Prelegent dodany' });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Update speaker mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Speaker> }) => {
      const { error } = await supabase
        .from('paid_event_speakers')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-speakers-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-speakers-preview', eventId] });
      toast({ title: 'Prelegent zaktualizowany' });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Delete speaker mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('paid_event_speakers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-speakers-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-speakers-preview', eventId] });
      toast({ title: 'Prelegent usunięty' });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  const toggleSpeaker = (id: string) => {
    const newExpanded = new Set(expandedSpeakers);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSpeakers(newExpanded);
  };

  const getEditingValue = (speakerId: string, field: keyof Speaker, originalValue: any) => {
    return editingData[speakerId]?.[field] ?? originalValue;
  };

  const setEditingValue = (speakerId: string, field: keyof Speaker, value: any) => {
    setEditingData(prev => ({
      ...prev,
      [speakerId]: {
        ...prev[speakerId],
        [field]: value,
      },
    }));
  };

  const handleSaveSpeaker = (speakerId: string) => {
    const data = editingData[speakerId];
    if (data) {
      updateMutation.mutate({ id: speakerId, data });
      setEditingData(prev => {
        const newData = { ...prev };
        delete newData[speakerId];
        return newData;
      });
    }
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
      {speakers.map((speaker) => (
        <Collapsible 
          key={speaker.id} 
          open={expandedSpeakers.has(speaker.id)} 
          onOpenChange={() => toggleSpeaker(speaker.id)}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {speaker.photo_url ? (
                      <img
                        src={speaker.photo_url}
                        alt={speaker.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <span className="truncate">{speaker.name}</span>
                  </div>
                  <ChevronDown 
                    className={cn(
                      'w-4 h-4 transition-transform',
                      expandedSpeakers.has(speaker.id) && 'rotate-180'
                    )} 
                  />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <Label htmlFor={`name-${speaker.id}`}>Imię i nazwisko</Label>
                  <Input
                    id={`name-${speaker.id}`}
                    value={getEditingValue(speaker.id, 'name', speaker.name)}
                    onChange={(e) => setEditingValue(speaker.id, 'name', e.target.value)}
                    placeholder="Imię i nazwisko"
                  />
                </div>

                <div>
                  <Label htmlFor={`title-${speaker.id}`}>Stanowisko / Firma</Label>
                  <Input
                    id={`title-${speaker.id}`}
                    value={getEditingValue(speaker.id, 'title', speaker.title || '')}
                    onChange={(e) => setEditingValue(speaker.id, 'title', e.target.value)}
                    placeholder="np. CEO w Empemedia"
                  />
                </div>

                <div>
                  <Label htmlFor={`bio-${speaker.id}`}>Bio</Label>
                  <Textarea
                    id={`bio-${speaker.id}`}
                    value={getEditingValue(speaker.id, 'bio', speaker.bio || '')}
                    onChange={(e) => setEditingValue(speaker.id, 'bio', e.target.value)}
                    placeholder="Krótki opis prelegenta..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor={`photo-${speaker.id}`}>URL zdjęcia</Label>
                  <Input
                    id={`photo-${speaker.id}`}
                    value={getEditingValue(speaker.id, 'photo_url', speaker.photo_url || '')}
                    onChange={(e) => setEditingValue(speaker.id, 'photo_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveSpeaker(speaker.id)}
                    disabled={updateMutation.isPending || !editingData[speaker.id]}
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
                      if (confirm('Czy na pewno usunąć tego prelegenta?')) {
                        deleteMutation.mutate(speaker.id);
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

      {speakers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            Brak prelegentów. Dodaj pierwszego prelegenta poniżej.
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
        Dodaj prelegenta
      </Button>
    </div>
  );
};
