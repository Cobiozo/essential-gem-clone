import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OmegaTestClient, OmegaTestClientInput } from '@/hooks/useOmegaTestClients';
import { CARRIERS, CARRIER_CUSTOM_VALUE, isKnownCarrier } from '@/lib/carriers';
import { Truck } from 'lucide-react';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: OmegaTestClient | null;
  onSubmit: (data: OmegaTestClientInput) => void;
  isLoading?: boolean;
}

const NONE_VALUE = '__none__';

export const ClientFormDialog: React.FC<ClientFormDialogProps> = ({ open, onOpenChange, initial, onSubmit, isLoading }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [testNumber, setTestNumber] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrierSelect, setCarrierSelect] = useState<string>(NONE_VALUE);
  const [carrierCustom, setCarrierCustom] = useState('');

  useEffect(() => {
    if (open) {
      setFirstName(initial?.first_name ?? '');
      setLastName(initial?.last_name ?? '');
      setEmail(initial?.email ?? '');
      setPhone(initial?.phone ?? '');
      setNotes(initial?.notes ?? '');
      setTestNumber(initial?.test_number ?? '');
      setTrackingNumber(initial?.tracking_number ?? '');

      const c = initial?.carrier ?? null;
      if (!c) {
        setCarrierSelect(NONE_VALUE);
        setCarrierCustom('');
      } else if (isKnownCarrier(c)) {
        setCarrierSelect(c);
        setCarrierCustom('');
      } else {
        setCarrierSelect(CARRIER_CUSTOM_VALUE);
        setCarrierCustom(c);
      }
    }
  }, [open, initial]);

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0;

  const resolveCarrier = (): string | null => {
    if (carrierSelect === NONE_VALUE) return null;
    if (carrierSelect === CARRIER_CUSTOM_VALUE) {
      const v = carrierCustom.trim();
      return v.length > 0 ? v : null;
    }
    return carrierSelect;
  };

  const handleSave = () => {
    if (!canSave) return;
    onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      test_number: testNumber.trim() || null,
      tracking_number: trackingNumber.trim() || null,
      carrier: resolveCarrier(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Sekcja: wysyłka testu */}
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Truck className="h-3.5 w-3.5 text-primary" />
              Wysyłka testu (opcjonalnie)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Numer testu</Label>
                <Input value={testNumber} onChange={(e) => setTestNumber(e.target.value)} placeholder="np. OM-12345" />
              </div>
              <div>
                <Label className="text-xs">Nr listu przewozowego</Label>
                <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="tracking..." />
              </div>
            </div>
            <div>
              <Label className="text-xs">Przewoźnik</Label>
              <Select value={carrierSelect} onValueChange={setCarrierSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz przewoźnika" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={NONE_VALUE}>— brak —</SelectItem>
                  {CARRIERS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value={CARRIER_CUSTOM_VALUE}>Inny / wpisz ręcznie…</SelectItem>
                </SelectContent>
              </Select>
              {carrierSelect === CARRIER_CUSTOM_VALUE && (
                <Input
                  className="mt-2"
                  value={carrierCustom}
                  onChange={(e) => setCarrierCustom(e.target.value)}
                  placeholder="Nazwa przewoźnika"
                />
              )}
            </div>
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
