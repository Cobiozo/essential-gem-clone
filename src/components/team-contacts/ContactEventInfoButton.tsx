import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Calendar, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { TeamContact } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface EventRegistration {
  id: string;
  status: string;
  event_title: string;
  event_date: string;
}

interface ContactEventInfoButtonProps {
  contact: TeamContact;
}

export const ContactEventInfoButton: React.FC<ContactEventInfoButtonProps> = ({ contact }) => {
  const { t, tf } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchRegistrations = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('guest_event_registrations')
        .select('id, status, events(title, start_time)')
        .eq('team_contact_id', contact.id);

      if (data) {
        const mapped: EventRegistration[] = data.map((r: any) => ({
          id: r.id,
          status: r.status,
          event_title: r.events?.title || '-',
          event_date: r.events?.start_time || '',
        }));
        setRegistrations(mapped);
      }
      setLoading(false);
    };
    fetchRegistrations();
  }, [contact.id]);

  const hasRegistrations = registrations.length > 0;

  const tooltipText = loading
    ? tf('common.loading', 'Ładowanie...')
    : hasRegistrations
      ? `${tf('teamContacts.registeredFor', 'Zarejestrowany na')} ${registrations.length} ${registrations.length === 1 ? tf('teamContacts.meeting', 'spotkanie') : tf('teamContacts.meetings', 'spotkań')}`
      : tf('teamContacts.noRegistrations', 'Brak rejestracji na spotkania');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <Badge className="bg-green-100 text-green-800 text-xs">{tf('teamContacts.registered', 'Zapisano')}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs">{tf('teamContacts.cancelled', 'Anulowany')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={loading}
                className={hasRegistrations ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-muted-foreground/80'}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : hasRegistrations ? (
                  <CalendarCheck className="w-4 h-4" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>

        <PopoverContent className="w-80" align="end">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">
              {tf('teamContacts.eventRegistrations', 'Rejestracje na spotkania')}
            </h4>
            {registrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tf('teamContacts.noRegistrations', 'Brak rejestracji na spotkania')}
              </p>
            ) : (
              <ul className="space-y-2">
                {registrations.map((reg) => (
                  <li key={reg.id} className="flex items-start justify-between gap-2 text-sm border-b pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{reg.event_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {reg.event_date ? new Date(reg.event_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                    {getStatusBadge(reg.status)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};
