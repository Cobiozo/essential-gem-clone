import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, CreditCard, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EventPaymentMethodsPanelProps {
  eventId: string;
  onDataChange: () => void;
}

interface PaymentConfig {
  payment_method_payu: boolean;
  payment_method_transfer: boolean;
  transfer_payment_details: string | null;
}

export const EventPaymentMethodsPanel: React.FC<EventPaymentMethodsPanelProps> = ({
  eventId,
  onDataChange,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PaymentConfig | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['paid-event-payment-config', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_events')
        .select('payment_method_payu, payment_method_transfer, transfer_payment_details')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return data as PaymentConfig;
    },
  });

  useEffect(() => {
    if (data && !draft) setDraft(data);
  }, [data, draft]);

  const updateMutation = useMutation({
    mutationFn: async (payload: PaymentConfig) => {
      // Validation: at least one method required
      if (!payload.payment_method_payu && !payload.payment_method_transfer) {
        throw new Error('Włącz przynajmniej jedną metodę płatności');
      }
      if (payload.payment_method_transfer && !(payload.transfer_payment_details || '').trim()) {
        throw new Error('Uzupełnij dane do przelewu');
      }
      const { error } = await supabase
        .from('paid_events')
        .update(payload)
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paid-event-payment-config', eventId] });
      queryClient.invalidateQueries({ queryKey: ['paid-event-public', eventId] });
      toast({ title: 'Zapisano metody płatności' });
      onDataChange();
    },
    onError: (err: Error) => {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading || !draft) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const isDirty =
    draft.payment_method_payu !== data?.payment_method_payu ||
    draft.payment_method_transfer !== data?.payment_method_transfer ||
    (draft.transfer_payment_details || '') !== (data?.transfer_payment_details || '');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Metody płatności
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PayU */}
        <div className="flex items-start justify-between gap-3 p-3 rounded-md border bg-muted/30">
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium text-sm">
              <CreditCard className="w-4 h-4 text-primary" />
              Płatność online (PayU)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gość przechodzi do PayU i płaci kartą / BLIK / przelewem online. Bilet QR generowany automatycznie po opłaceniu.
            </p>
          </div>
          <Switch
            checked={draft.payment_method_payu}
            onCheckedChange={(v) => setDraft({ ...draft, payment_method_payu: v })}
          />
        </div>

        {/* Transfer */}
        <div className="flex items-start justify-between gap-3 p-3 rounded-md border bg-muted/30">
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Banknote className="w-4 h-4 text-primary" />
              Płatność przelewem (rejestracja + email)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gość rezerwuje miejsce, dostaje email z danymi do przelewu. Po zaksięgowaniu wpłaty admin oznacza zamówienie jako opłacone i system wysyła bilet QR.
            </p>
          </div>
          <Switch
            checked={draft.payment_method_transfer}
            onCheckedChange={(v) => setDraft({ ...draft, payment_method_transfer: v })}
          />
        </div>

        {draft.payment_method_transfer && (
          <div>
            <Label htmlFor="transfer-details">Dane do przelewu *</Label>
            <Textarea
              id="transfer-details"
              value={draft.transfer_payment_details || ''}
              onChange={(e) => setDraft({ ...draft, transfer_payment_details: e.target.value })}
              placeholder={
                'Odbiorca: Pure Life Sp. z o.o.\n' +
                'Numer konta: PL00 0000 0000 0000 0000 0000 0000\n' +
                'BIC/SWIFT: XXXXXXXX\n' +
                'Tytuł przelewu: Bilet [Imię Nazwisko] – TEST KRAKÓW\n' +
                'Termin: 7 dni od rejestracji'
              }
              rows={6}
              className="mt-1 font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Treść zostanie umieszczona w emailu do gościa po jego rezerwacji.
            </p>
          </div>
        )}

        <Button
          size="sm"
          onClick={() => updateMutation.mutate(draft)}
          disabled={!isDirty || updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Zapisz metody płatności
        </Button>
      </CardContent>
    </Card>
  );
};
