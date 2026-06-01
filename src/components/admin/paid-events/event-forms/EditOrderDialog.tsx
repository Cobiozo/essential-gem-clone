import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface OrderRow {
  __orderId: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  email_confirmed_at: string | null;
}

interface Props {
  open: boolean;
  order: OrderRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const EditOrderDialog: React.FC<Props> = ({ open, order, onOpenChange, onSaved }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resetConfirmation, setResetConfirmation] = useState(false);

  useEffect(() => {
    if (order) {
      setFirstName(order.first_name || '');
      setLastName(order.last_name || '');
      setEmail(order.email || '');
      setPhone(order.phone || '');
      setResetConfirmation(false);
    }
  }, [order]);

  const save = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('no_order');
      const { data, error } = await supabase.functions.invoke('admin-update-event-order', {
        body: {
          orderId: order.__orderId,
          firstName,
          lastName,
          email,
          phone: phone || null,
          resetConfirmation,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Zapisano zmiany' });
      qc.invalidateQueries({ queryKey: ['event-form-submissions-orders'] });
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: 'Błąd zapisu', description: e.message, variant: 'destructive' }),
  });

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edytuj rezerwację</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Imię</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label>Nazwisko</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {order.email_confirmed_at && (
            <label className="flex items-start gap-2 text-sm pt-2">
              <Checkbox checked={resetConfirmation} onCheckedChange={(v) => setResetConfirmation(!!v)} />
              <span className="text-muted-foreground">
                Wymagaj ponownego potwierdzenia adresu email (cofnij potwierdzenie i unieważnij obecny bilet — będzie trzeba wysłać nową prośbę o potwierdzenie).
              </span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Zapisywanie…' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditOrderDialog;
