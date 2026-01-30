import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CreditCard, ArrowRight, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TicketInfo {
  id: string;
  name: string;
  price: number;
}

interface PurchaseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  ticket: TicketInfo | null;
  currency?: string;
}

export const PurchaseDrawer: React.FC<PurchaseDrawerProps> = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  ticket,
  currency = 'PLN',
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    acceptTerms: false,
    acceptMarketing: false,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticket) return;

    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: 'Uzupełnij dane',
        description: 'Imię, nazwisko i email są wymagane',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.acceptTerms) {
      toast({
        title: 'Akceptacja regulaminu',
        description: 'Musisz zaakceptować regulamin aby kontynuować',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call PayU create order edge function
      const { data, error } = await supabase.functions.invoke('payu-create-order', {
        body: {
          eventId,
          ticketId: ticket.id,
          buyerFirstName: formData.firstName,
          buyerLastName: formData.lastName,
          buyerEmail: formData.email,
          buyerPhone: formData.phone || null,
          acceptMarketing: formData.acceptMarketing,
        },
      });

      if (error) throw error;

      if (data?.redirectUri) {
        // Redirect to PayU payment page
        window.location.href = data.redirectUri;
      } else {
        throw new Error('Brak URL przekierowania');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: 'Błąd płatności',
        description: error.message || 'Wystąpił błąd podczas tworzenia zamówienia',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!ticket) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle>Kup bilet</DrawerTitle>
            <DrawerDescription>
              {eventTitle} - {ticket.name}
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSubmit} className="px-4 space-y-4">
            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Bilet:</span>
                <span className="font-medium">{ticket.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Do zapłaty:</span>
                <span className="text-xl font-bold text-primary">
                  {formatPrice(ticket.price)}
                </span>
              </div>
            </div>

            {/* Personal Data */}
            <div className="space-y-3">
              <h3 className="font-medium">Dane kupującego</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">Imię *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Jan"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nazwisko *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Kowalski"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jan@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+48 123 456 789"
                />
              </div>
            </div>

            {/* Consents */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, acceptTerms: checked === true })
                  }
                />
                <Label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                  Akceptuję <a href="/page/regulamin" className="text-primary underline" target="_blank">regulamin</a> i <a href="/page/polityka-prywatnosci" className="text-primary underline" target="_blank">politykę prywatności</a> *
                </Label>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="marketing"
                  checked={formData.acceptMarketing}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, acceptMarketing: checked === true })
                  }
                />
                <Label htmlFor="marketing" className="text-sm leading-tight cursor-pointer">
                  Wyrażam zgodę na otrzymywanie informacji marketingowych
                </Label>
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Płatność zabezpieczona przez PayU</span>
            </div>
          </form>

          <DrawerFooter className="pt-4">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Przetwarzanie...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Przejdź do płatności
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
