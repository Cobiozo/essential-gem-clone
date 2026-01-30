import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, GripVertical, Check } from 'lucide-react';

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

interface TicketBenefitsEditorProps {
  ticket: Ticket;
  onUpdate: () => void;
}

export const TicketBenefitsEditor: React.FC<TicketBenefitsEditorProps> = ({
  ticket,
  onUpdate,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [benefits, setBenefits] = useState<string[]>(
    Array.isArray(ticket.benefits) ? ticket.benefits : []
  );
  const [newBenefit, setNewBenefit] = useState('');
  const [highlightText, setHighlightText] = useState(ticket.highlight_text || '');
  const [isFeatured, setIsFeatured] = useState(ticket.is_featured || false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setBenefits(Array.isArray(ticket.benefits) ? ticket.benefits : []);
    setHighlightText(ticket.highlight_text || '');
    setIsFeatured(ticket.is_featured || false);
    setHasChanges(false);
  }, [ticket]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('paid_event_tickets')
        .update({
          benefits: benefits,
          highlight_text: highlightText || null,
          is_featured: isFeatured,
        })
        .eq('id', ticket.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-tickets'] });
      toast({ title: 'Zapisano zmiany' });
      setHasChanges(false);
      onUpdate();
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  const addBenefit = () => {
    if (!newBenefit.trim()) return;
    setBenefits([...benefits, newBenefit.trim()]);
    setNewBenefit('');
    setHasChanges(true);
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateBenefit = (index: number, value: string) => {
    const updated = [...benefits];
    updated[index] = value;
    setBenefits(updated);
    setHasChanges(true);
  };

  const moveBenefit = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= benefits.length) return;

    const updated = [...benefits];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setBenefits(updated);
    setHasChanges(true);
  };

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{ticket.name}</h4>
          <span className="text-sm text-muted-foreground">{ticket.price} PLN</span>
        </div>

        {/* Highlight Text */}
        <div>
          <Label className="text-xs">Tekst wyróżnienia (badge)</Label>
          <Input
            value={highlightText}
            onChange={(e) => {
              setHighlightText(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Np. Bestseller, Promocja"
            className="h-8 text-sm"
          />
        </div>

        {/* Is Featured */}
        <div className="flex items-center gap-2">
          <Switch
            checked={isFeatured}
            onCheckedChange={(checked) => {
              setIsFeatured(checked);
              setHasChanges(true);
            }}
          />
          <Label className="text-xs">Bilet wyróżniony (domyślnie zaznaczony)</Label>
        </div>

        {/* Benefits List */}
        <div>
          <Label className="text-xs">Cena zawiera:</Label>
          <div className="space-y-2 mt-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab flex-shrink-0" />
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <Input
                  value={benefit}
                  onChange={(e) => updateBenefit(index, e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeBenefit(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add New Benefit */}
          <div className="flex items-center gap-2 mt-2">
            <Input
              value={newBenefit}
              onChange={(e) => setNewBenefit(e.target.value)}
              placeholder="Dodaj nowy element..."
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addBenefit()}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={addBenefit}
              disabled={!newBenefit.trim()}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <Button
            size="sm"
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// Wrapper component for managing multiple tickets
interface TicketsEditorProps {
  eventId: string;
  tickets: Ticket[];
  onRefresh: () => void;
}

export const TicketsEditor: React.FC<TicketsEditorProps> = ({
  eventId,
  tickets,
  onRefresh,
}) => {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Brak biletów do edycji. Najpierw dodaj bilety dla tego wydarzenia.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">
        Edycja benefitów biletów ({tickets.length})
      </h4>
      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <TicketBenefitsEditor
            key={ticket.id}
            ticket={ticket}
            onUpdate={onRefresh}
          />
        ))}
      </div>
    </div>
  );
};
