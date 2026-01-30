import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, ArrowRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketType {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  benefits?: string[];
  highlightText?: string | null;
  isFeatured?: boolean;
  available?: number | null;
  maxPerOrder?: number;
}

interface PaidEventSidebarProps {
  tickets: TicketType[];
  eventDate: string;
  sidebarTitle?: string;
  ctaText?: string;
  maxTickets?: number | null;
  ticketsSold?: number | null;
  onPurchase: (ticketId: string) => void;
  currency?: string;
}

export const PaidEventSidebar: React.FC<PaidEventSidebarProps> = ({
  tickets,
  eventDate,
  sidebarTitle = 'Rejestracja',
  ctaText = 'Zapisz się',
  maxTickets,
  ticketsSold,
  onPurchase,
  currency = 'PLN',
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    tickets.find(t => t.isFeatured)?.id || tickets[0]?.id || null
  );
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  // Calculate countdown
  useEffect(() => {
    const targetDate = new Date(eventDate).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setCountdown({ days, hours, minutes });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [eventDate]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const availableSpots = maxTickets ? maxTickets - (ticketsSold || 0) : null;
  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <Card className="sticky top-20 shadow-lg border-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{sidebarTitle}</CardTitle>
        
        {/* Countdown Timer */}
        {countdown && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <Clock className="w-4 h-4" />
            <span>
              Do wydarzenia: <strong>{countdown.days}d {countdown.hours}h {countdown.minutes}m</strong>
            </span>
          </div>
        )}

        {/* Availability */}
        {availableSpots !== null && (
          <div className="flex items-center gap-2 text-sm mt-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className={availableSpots < 10 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              {availableSpots > 0 
                ? `Dostępnych miejsc: ${availableSpots}` 
                : 'Brak miejsc'}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Ticket Options */}
        {tickets.length > 1 ? (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={cn(
                  'w-full text-left p-4 rounded-lg border-2 transition-all',
                  selectedTicketId === ticket.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{ticket.name}</div>
                    {ticket.highlightText && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {ticket.highlightText}
                      </Badge>
                    )}
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {formatPrice(ticket.price)}
                  </div>
                </div>
                {ticket.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {ticket.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : tickets.length === 1 ? (
          <div className="text-center py-2">
            <div className="text-3xl font-bold text-primary">
              {formatPrice(tickets[0].price)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">brutto (z VAT)</div>
          </div>
        ) : null}

        {/* Benefits List */}
        {selectedTicket?.benefits && selectedTicket.benefits.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <div className="text-sm font-medium text-muted-foreground">Cena zawiera:</div>
            <ul className="space-y-2">
              {selectedTicket.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA Button */}
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={() => selectedTicketId && onPurchase(selectedTicketId)}
          disabled={!selectedTicketId || availableSpots === 0}
        >
          {ctaText}
          <ArrowRight className="w-4 h-4" />
        </Button>

        {availableSpots !== null && availableSpots < 10 && availableSpots > 0 && (
          <p className="text-xs text-center text-destructive">
            Zostało tylko {availableSpots} {availableSpots === 1 ? 'miejsce' : 'miejsc'}!
          </p>
        )}
      </CardContent>
    </Card>
  );
};
