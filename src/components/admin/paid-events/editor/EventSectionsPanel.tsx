import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Save, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface EventSectionsPanelProps {
  eventId: string;
  onDataChange: () => void;
  onSectionHover?: (sectionId: string | null) => void;
}

interface ContentSection {
  id: string;
  event_id: string;
  title: string;
  content: string | null;
  icon_name: string | null;
  position: number;
  is_active: boolean;
  items: any;
  background_color: string | null;
  text_color: string | null;
}

export const EventSectionsPanel: React.FC<EventSectionsPanelProps> = ({
  eventId,
  onDataChange,
  onSectionHover,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingData, setEditingData] = useState<Record<string, Partial<ContentSection>>>({});

  // Fetch sections
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['paid-event-sections-edit', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_content_sections')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as ContentSection[];
    },
  });

  // Create section mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const maxPosition = Math.max(0, ...sections.map(s => s.position));
      const { error } = await supabase
        .from('paid_event_content_sections')
        .insert({
          event_id: eventId,
          title: 'Nowa sekcja',
          content: '',
          position: maxPosition + 1,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections-preview', eventId] });
      toast({ title: 'Sekcja dodana' });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Update section mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContentSection> }) => {
      const { error } = await supabase
        .from('paid_event_content_sections')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections-preview', eventId] });
      toast({ title: 'Sekcja zaktualizowana' });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Delete section mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('paid_event_content_sections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections-preview', eventId] });
      toast({ title: 'Sekcja usunięta' });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Move section mutation
  const moveMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const currentIndex = sections.findIndex(s => s.id === id);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex < 0 || targetIndex >= sections.length) return;

      const currentSection = sections[currentIndex];
      const targetSection = sections[targetIndex];

      await supabase
        .from('paid_event_content_sections')
        .update({ position: targetSection.position })
        .eq('id', currentSection.id);

      await supabase
        .from('paid_event_content_sections')
        .update({ position: currentSection.position })
        .eq('id', targetSection.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections-preview', eventId] });
      onDataChange();
    },
  });

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const getEditingValue = (sectionId: string, field: keyof ContentSection, originalValue: any) => {
    return editingData[sectionId]?.[field] ?? originalValue;
  };

  const setEditingValue = (sectionId: string, field: keyof ContentSection, value: any) => {
    setEditingData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [field]: value,
      },
    }));
  };

  const handleSaveSection = (sectionId: string) => {
    const data = editingData[sectionId];
    if (data) {
      updateMutation.mutate({ id: sectionId, data });
      // Clear editing data after save
      setEditingData(prev => {
        const newData = { ...prev };
        delete newData[sectionId];
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
      {sections.map((section, index) => (
        <Collapsible 
          key={section.id} 
          open={expandedSections.has(section.id)} 
          onOpenChange={() => toggleSection(section.id)}
        >
          <Card 
            className={cn(!section.is_active && 'opacity-50')}
            onMouseEnter={() => onSectionHover?.(section.id)}
            onMouseLeave={() => onSectionHover?.(null)}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{section.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveMutation.mutate({ id: section.id, direction: 'up' });
                      }}
                      disabled={index === 0}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveMutation.mutate({ id: section.id, direction: 'down' });
                      }}
                      disabled={index === sections.length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <ChevronDown 
                      className={cn(
                        'w-4 h-4 transition-transform ml-2',
                        expandedSections.has(section.id) && 'rotate-180'
                      )} 
                    />
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <Label htmlFor={`title-${section.id}`}>Tytuł sekcji</Label>
                  <Input
                    id={`title-${section.id}`}
                    value={getEditingValue(section.id, 'title', section.title)}
                    onChange={(e) => setEditingValue(section.id, 'title', e.target.value)}
                    placeholder="Tytuł sekcji"
                  />
                </div>

                <div>
                  <Label htmlFor={`content-${section.id}`}>Treść (HTML)</Label>
                  <Textarea
                    id={`content-${section.id}`}
                    value={getEditingValue(section.id, 'content', section.content || '')}
                    onChange={(e) => setEditingValue(section.id, 'content', e.target.value)}
                    placeholder="Treść sekcji..."
                    rows={5}
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor={`icon-${section.id}`}>Ikona (Lucide)</Label>
                  <Input
                    id={`icon-${section.id}`}
                    value={getEditingValue(section.id, 'icon_name', section.icon_name || '')}
                    onChange={(e) => setEditingValue(section.id, 'icon_name', e.target.value)}
                    placeholder="np. BookOpen, Target, Users"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Lista ikon: lucide.dev/icons
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={getEditingValue(section.id, 'is_active', section.is_active)}
                    onCheckedChange={(checked) => setEditingValue(section.id, 'is_active', checked)}
                  />
                  <Label>Aktywna</Label>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveSection(section.id)}
                    disabled={updateMutation.isPending || !editingData[section.id]}
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
                      if (confirm('Czy na pewno usunąć tę sekcję?')) {
                        deleteMutation.mutate(section.id);
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

      {sections.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            Brak sekcji treści. Dodaj pierwszą sekcję poniżej.
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
        Dodaj sekcję
      </Button>
    </div>
  );
};
