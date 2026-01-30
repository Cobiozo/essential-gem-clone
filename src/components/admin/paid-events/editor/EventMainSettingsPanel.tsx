import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventMainSettingsPanelProps {
  eventId: string;
  onDataChange: () => void;
}

export const EventMainSettingsPanel: React.FC<EventMainSettingsPanelProps> = ({
  eventId,
  onDataChange,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    datetime: false,
    visibility: false,
  });

  // Fetch event data
  const { data: event, isLoading } = useQuery({
    queryKey: ['paid-event-edit', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (event) {
      setFormData(event);
    }
  }, [event]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const { error } = await supabase
        .from('paid_events')
        .update(data)
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-edit', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-preview', eventId] });
      toast({ title: 'Zapisano zmiany' });
      onDataChange();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Collapsible open={expandedSections.basic} onOpenChange={() => toggleSection('basic')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Podstawowe informacje</span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', expandedSections.basic && 'rotate-180')} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Tytuł wydarzenia</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="Nazwa wydarzenia"
                />
                <p className="text-xs text-muted-foreground mt-1">Klucz: event.title</p>
              </div>

              <div>
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug || ''}
                  onChange={(e) => handleFieldChange('slug', e.target.value)}
                  placeholder="wydarzenie-url"
                />
                <p className="text-xs text-muted-foreground mt-1">Klucz: event.slug</p>
              </div>

              <div>
                <Label htmlFor="short_description">Krótki opis</Label>
                <Input
                  id="short_description"
                  value={formData.short_description || ''}
                  onChange={(e) => handleFieldChange('short_description', e.target.value)}
                  placeholder="Krótki opis do listy"
                />
              </div>

              <div>
                <Label htmlFor="description">Pełny opis</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Szczegółowy opis wydarzenia"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="banner_url">URL banera</Label>
                <Input
                  id="banner_url"
                  value={formData.banner_url || ''}
                  onChange={(e) => handleFieldChange('banner_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Date & Location */}
      <Collapsible open={expandedSections.datetime} onOpenChange={() => toggleSection('datetime')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Data i lokalizacja</span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', expandedSections.datetime && 'rotate-180')} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event_date">Data rozpoczęcia</Label>
                  <Input
                    id="event_date"
                    type="datetime-local"
                    value={formData.event_date?.slice(0, 16) || ''}
                    onChange={(e) => handleFieldChange('event_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="event_end_date">Data zakończenia</Label>
                  <Input
                    id="event_end_date"
                    type="datetime-local"
                    value={formData.event_end_date?.slice(0, 16) || ''}
                    onChange={(e) => handleFieldChange('event_end_date', e.target.value || null)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Lokalizacja</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  placeholder="Np. Warszawa, ul. Przykładowa 1"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_online || false}
                  onCheckedChange={(checked) => handleFieldChange('is_online', checked)}
                />
                <Label>Wydarzenie online</Label>
              </div>

              {formData.is_online && (
                <div>
                  <Label htmlFor="stream_url">Link do transmisji</Label>
                  <Input
                    id="stream_url"
                    value={formData.stream_url || ''}
                    onChange={(e) => handleFieldChange('stream_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div>
                <Label htmlFor="max_tickets">Limit biletów</Label>
                <Input
                  id="max_tickets"
                  type="number"
                  min="1"
                  value={formData.max_tickets || ''}
                  onChange={(e) => handleFieldChange('max_tickets', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Brak limitu"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Visibility */}
      <Collapsible open={expandedSections.visibility} onOpenChange={() => toggleSection('visibility')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Status i widoczność</span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', expandedSections.visibility && 'rotate-180')} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active ?? true}
                    onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
                  />
                  <span className="text-sm">Aktywne</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_published ?? false}
                    onCheckedChange={(checked) => handleFieldChange('is_published', checked)}
                  />
                  <span className="text-sm">Opublikowane</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-sm font-medium">Widoczność dla ról</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'visible_to_partners', label: 'Partnerzy' },
                    { key: 'visible_to_clients', label: 'Klienci' },
                    { key: 'visible_to_specjalista', label: 'Specjaliści' },
                    { key: 'visible_to_everyone', label: 'Wszyscy' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={formData[key] ?? true}
                        onCheckedChange={(checked) => handleFieldChange(key, checked)}
                      />
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={updateMutation.isPending}
        className="w-full"
      >
        {updateMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Zapisz zmiany
      </Button>
    </div>
  );
};
