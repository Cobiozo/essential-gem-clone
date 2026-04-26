import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users } from 'lucide-react';

interface MyEventFormReferralsProps {
  /** Limit results to a single form (when shown under a form card). */
  formId?: string;
  /** Limit results to a single paid event (all forms for that event). */
  eventId?: string;
}

/**
 * Lista osób, które zapisały się przez link partnerski bieżącego użytkownika.
 * Polityka SELECT na event_form_submissions: auth.uid() = partner_user_id
 * (gwarantuje, że partner widzi wyłącznie swoich poleconych).
 *
 * Partner widzi pełne dane swoich poleconych — RLS wymusza izolację.
 */
export const MyEventFormReferrals: React.FC<MyEventFormReferralsProps> = ({ formId, eventId }) => {
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['my-event-form-referrals', user?.id, formId ?? 'all', eventId ?? 'all'],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from('event_form_submissions')
        .select('id, first_name, last_name, email, phone, payment_status, status, email_confirmed_at, created_at, form_id, event_id')
        .eq('partner_user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (formId) q = q.eq('form_id', formId);
      if (eventId) q = q.eq('event_id', eventId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
        <Loader2 className="h-3 w-3 animate-spin" /> Ładowanie listy zapisanych…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-3 flex items-center gap-2">
        <Users className="h-3 w-3" /> Brak zapisanych przez Twój link.
      </div>
    );
  }

  const maskEmail = (e: string) => {
    if (!e || !e.includes('@')) return e;
    const [name, domain] = e.split('@');
    if (name.length <= 2) return `${name[0] || '•'}•@${domain}`;
    return `${name.slice(0, 2)}${'•'.repeat(Math.max(2, name.length - 2))}@${domain}`;
  };

  const maskPhone = (p: string | null) => {
    if (!p) return '—';
    const digits = p.replace(/\D/g, '');
    if (digits.length < 4) return '•••';
    return `••• ••• ${digits.slice(-3)}`;
  };

  const paymentBadge = (s: string, status: string) => {
    if (status === 'cancelled') return <Badge variant="destructive">Anulowane</Badge>;
    if (s === 'paid') return <Badge className="bg-green-600 hover:bg-green-700">Opłacone</Badge>;
    if (s === 'refunded') return <Badge variant="outline">Zwrot</Badge>;
    return <Badge variant="secondary">Oczekuje płatności</Badge>;
  };

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b">
            <th className="text-left py-2 pr-2 font-medium">Data</th>
            <th className="text-left py-2 pr-2 font-medium">Imię i nazwisko</th>
            <th className="text-left py-2 pr-2 font-medium">Email</th>
            <th className="text-left py-2 pr-2 font-medium">Telefon</th>
            <th className="text-left py-2 pr-2 font-medium">Email potw.</th>
            <th className="text-left py-2 pr-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2 pr-2 text-muted-foreground whitespace-nowrap">
                {new Date(r.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
              </td>
              <td className="py-2 pr-2 font-medium">
                {[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}
              </td>
              <td className="py-2 pr-2 text-muted-foreground break-all">{r.email || '—'}</td>
              <td className="py-2 pr-2 text-muted-foreground whitespace-nowrap">{r.phone || '—'}</td>
              <td className="py-2 pr-2">
                {r.email_confirmed_at ? (
                  <Badge variant="outline" className="border-green-600 text-green-700">Tak</Badge>
                ) : (
                  <Badge variant="outline">Czeka</Badge>
                )}
              </td>
              <td className="py-2 pr-2">{paymentBadge(r.payment_status, r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MyEventFormReferrals;
