import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, CheckCircle, XCircle, User, Calendar, Ticket, Search } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface VerificationResult {
  valid: boolean;
  message: string;
  ticket?: {
    ticket_code: string;
    buyer_name: string;
    buyer_email: string;
    event_title: string;
    event_date: string;
    is_checked_in: boolean;
    checked_in_at: string | null;
  };
  checked_in?: boolean;
}

export const TicketVerification: React.FC = () => {
  const { toast } = useToast();
  const [ticketCode, setTicketCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input for scanner mode
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const verifyTicket = async (code: string, performCheckIn = false) => {
    if (!code.trim()) return;
    
    setIsVerifying(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get Supabase URL from the client
      const supabaseUrl = 'https://xzlhssqqbajqhnsmbucf.supabase.co';
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/verify-event-ticket`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ 
            ticket_code: code.trim(),
            perform_check_in: performCheckIn 
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        setResult({
          valid: false,
          message: data.error || 'Błąd weryfikacji biletu',
        });
        toast({ 
          title: 'Bilet nieprawidłowy', 
          description: data.error,
          variant: 'destructive' 
        });
      } else {
        setResult({
          valid: true,
          message: data.message || 'Bilet prawidłowy',
          ticket: data.ticket,
          checked_in: data.checked_in,
        });
        
        if (data.checked_in) {
          toast({ 
            title: 'Check-in wykonany!', 
            description: `Zarejestrowano wejście dla: ${data.ticket?.buyer_name}` 
          });
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setResult({
        valid: false,
        message: 'Błąd połączenia z serwerem',
      });
      toast({ 
        title: 'Błąd', 
        description: 'Nie udało się zweryfikować biletu',
        variant: 'destructive' 
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyTicket(ticketCode, false);
  };

  const handleCheckIn = () => {
    if (result?.ticket?.ticket_code) {
      verifyTicket(result.ticket.ticket_code, true);
    }
  };

  const resetVerification = () => {
    setTicketCode('');
    setResult(null);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Weryfikacja biletów
          </CardTitle>
          <CardDescription>
            Wprowadź kod biletu lub zeskanuj kod QR przy użyciu czytnika
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="ticket-code">Kod biletu</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    id="ticket-code"
                    value={ticketCode}
                    onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                    placeholder="Wprowadź lub zeskanuj kod..."
                    className="pl-10 font-mono text-lg"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={isVerifying || !ticketCode.trim()}>
                  {isVerifying ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Sprawdź
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={result.valid ? 'border-green-500' : 'border-destructive'}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              {result.valid ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-600">Bilet prawidłowy</span>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-destructive" />
                  <span className="text-destructive">Bilet nieprawidłowy</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.valid && result.ticket ? (
              <>
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{result.ticket.buyer_name}</span>
                    <span className="text-muted-foreground">({result.ticket.buyer_email})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{result.ticket.event_title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {format(new Date(result.ticket.event_date), 'dd MMMM yyyy, HH:mm', { locale: pl })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Kod:</span>
                    <code className="font-mono bg-muted px-2 py-1 rounded">
                      {result.ticket.ticket_code}
                    </code>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  {result.ticket.is_checked_in || result.checked_in ? (
                    <Badge variant="outline" className="text-green-600 border-green-600 text-base py-2 px-4">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Check-in wykonany
                      {result.ticket.checked_in_at && (
                        <span className="ml-2 text-muted-foreground">
                          ({format(new Date(result.ticket.checked_in_at), 'HH:mm', { locale: pl })})
                        </span>
                      )}
                    </Badge>
                  ) : (
                    <Button onClick={handleCheckIn} size="lg" className="w-full">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Wykonaj check-in
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">{result.message}</p>
            )}

            <Button variant="outline" onClick={resetVerification} className="w-full">
              Skanuj kolejny bilet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instrukcja</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Podłącz czytnik kodów QR/kreskowych do komputera</p>
          <p>• Czytnik automatycznie wprowadzi kod w pole tekstowe</p>
          <p>• Naciśnij Enter lub kliknij "Sprawdź" aby zweryfikować bilet</p>
          <p>• Kliknij "Wykonaj check-in" aby zarejestrować wejście uczestnika</p>
        </CardContent>
      </Card>
    </div>
  );
};
