import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface ContentSection {
  id: string;
  event_id: string;
  section_type: string;
  title: string;
  content: string | null;
  position: number;
  is_active: boolean;
  background_color: string | null;
  text_color: string | null;
  icon_name: string | null;
  items: any[] | null;
}

interface ContentSectionEditorProps {
  eventId: string;
}

const SECTION_TYPES = [
  { value: 'about', label: 'O szkoleniu' },
  { value: 'why_join', label: 'Dlaczego warto' },
  { value: 'for_whom', label: 'Dla kogo' },
  { value: 'duration', label: 'Czas trwania' },
  { value: 'schedule', label: 'Program' },
  { value: 'custom', label: 'Własna sekcja' },
];

const ICON_OPTIONS = [
  { value: 'none', label: 'Brak ikony' },
  { value: 'BookOpen', label: 'Książka' },
  { value: 'Target', label: 'Cel' },
  { value: 'Users', label: 'Ludzie' },
  { value: 'Clock', label: 'Zegar' },
  { value: 'Calendar', label: 'Kalendarz' },
  { value: 'Star', label: 'Gwiazdka' },
  { value: 'Award', label: 'Nagroda' },
  { value: 'CheckCircle', label: 'Zatwierdzenie' },
  { value: 'Lightbulb', label: 'Żarówka' },
  { value: 'Heart', label: 'Serce' },
  { value: 'Zap', label: 'Błyskawica' },
];

const defaultSection: Partial<ContentSection> = {
  section_type: 'custom',
  title: '',
  content: '',
  is_active: true,
  background_color: null,
  text_color: null,
  icon_name: null,
  items: [],
};

export const ContentSectionEditor: React.FC<ContentSectionEditorProps> = ({ eventId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState<ContentSection | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<ContentSection>>(defaultSection);

  // Fetch sections
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['paid-event-sections', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_content_sections')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as ContentSection[];
    },
    enabled: !!eventId,
  });

  // Create section mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<ContentSection>) => {
      if (!data.title) throw new Error('Tytuł jest wymagany');
      
      const nextPosition = sections.length > 0 
        ? Math.max(...sections.map(s => s.position)) + 1 
        : 0;
      
      const { error } = await supabase.from('paid_event_content_sections').insert([{
        title: data.title,
        section_type: data.section_type || 'custom',
        content: data.content || null,
        is_active: data.is_active ?? true,
        background_color: data.background_color || null,
        text_color: data.text_color || null,
        icon_name: data.icon_name === 'none' ? null : (data.icon_name || null),
        items: data.items || [],
        event_id: eventId,
        position: nextPosition,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections', eventId] });
      toast({ title: 'Sekcja dodana' });
      setIsCreating(false);
      setFormData(defaultSection);
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
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections', eventId] });
      toast({ title: 'Sekcja zaktualizowana' });
      setEditingSection(null);
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
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections', eventId] });
      toast({ title: 'Sekcja usunięta' });
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Move section
  const moveMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const currentIndex = sections.findIndex(s => s.id === id);
      if (currentIndex === -1) return;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= sections.length) return;

      const current = sections[currentIndex];
      const target = sections[targetIndex];

      // Swap positions
      await supabase
        .from('paid_event_content_sections')
        .update({ position: target.position })
        .eq('id', current.id);

      await supabase
        .from('paid_event_content_sections')
        .update({ position: current.position })
        .eq('id', target.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-sections', eventId] });
    },
  });

  const handleSubmit = () => {
    if (!formData.title) {
      toast({ title: 'Podaj tytuł sekcji', variant: 'destructive' });
      return;
    }

    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (section: ContentSection) => {
    setEditingSection(section);
    setFormData(section);
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setFormData(defaultSection);
  };

  const closeDialog = () => {
    setEditingSection(null);
    setIsCreating(false);
    setFormData(defaultSection);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-muted-foreground">
          Sekcje treści ({sections.length})
        </h4>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-1" />
          Dodaj sekcję
        </Button>
      </div>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            Brak sekcji treści. Kliknij "Dodaj sekcję" aby rozpocząć.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sections.map((section, index) => (
            <Card key={section.id} className={!section.is_active ? 'opacity-50' : ''}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{section.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {SECTION_TYPES.find(t => t.value === section.section_type)?.label || 'Własna'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveMutation.mutate({ id: section.id, direction: 'up' })}
                      disabled={index === 0}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveMutation.mutate({ id: section.id, direction: 'down' })}
                      disabled={index === sections.length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(section)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm('Usunąć tę sekcję?')) {
                          deleteMutation.mutate(section.id);
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

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || !!editingSection} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Edytuj sekcję' : 'Nowa sekcja'}
            </DialogTitle>
            <DialogDescription>
              Konfiguruj sekcję treści dla strony wydarzenia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Typ sekcji</Label>
                <Select
                  value={formData.section_type || 'custom'}
                  onValueChange={(value) => setFormData({ ...formData, section_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ikona</Label>
                <Select
                  value={formData.icon_name || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, icon_name: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz ikonę" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Tytuł sekcji *</Label>
              <Input
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Np. O szkoleniu"
              />
            </div>

            <div>
              <Label>Treść (HTML)</Label>
              <Textarea
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Możesz używać HTML..."
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kolor tła (opcjonalnie)</Label>
                <Input
                  value={formData.background_color || ''}
                  onChange={(e) => setFormData({ ...formData, background_color: e.target.value || null })}
                  placeholder="#f5f5f5"
                />
              </div>
              <div>
                <Label>Kolor tekstu (opcjonalnie)</Label>
                <Input
                  value={formData.text_color || ''}
                  onChange={(e) => setFormData({ ...formData, text_color: e.target.value || null })}
                  placeholder="#333333"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Sekcja aktywna (widoczna)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Anuluj
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingSection ? 'Zapisz zmiany' : 'Dodaj sekcję'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
