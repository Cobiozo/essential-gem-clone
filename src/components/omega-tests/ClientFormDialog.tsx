import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { OmegaTestClient, OmegaTestClientInput } from '@/hooks/useOmegaTestClients';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: OmegaTestClient | null;
  onSubmit: (data: OmegaTestClientInput) => void;
  isLoading?: boolean;
}

export const ClientFormDialog: React.FC<ClientFormDialogProps> = ({ open, onOpenChange, initial, onSubmit, isLoading }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setFirstName(initial?.first_name ?? '');
      setLastName(initial?.last_name ?? '');
      setEmail(initial?.email ?? '');
      setPhone(initial?.phone ?? '');
      setNotes(initial?.notes ?? '');
    }
  }, [open, initial]);

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edytuj klienta' : 'Dodaj klienta'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Imię *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Nazwisko *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">E-mail (opcjonalnie)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="np. klient@example.com" />
            <p className="text-[11px] text-muted-foreground mt-1">Wymagane, jeśli chcesz wysyłać klientowi powiadomienia o teście.</p>
          </div>
          <div>
            <Label className="text-xs">Telefon (opcjonalnie)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48..." />
          </div>
          <div>
            <Label className="text-xs">Notatka (opcjonalnie)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Skąd kontakt, kontekst..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button variant="action" disabled={!canSave || isLoading} onClick={handleSave}>
            {initial ? 'Zapisz zmiany' : 'Dodaj klienta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
