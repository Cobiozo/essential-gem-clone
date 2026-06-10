import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Copy, Download, Link2, Loader2, MousePointer, Users } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  /** Optional: limit panel to a single guest (used inline in per-guest editor).
   *  If omitted, panel shows ALL guests aggregated. */
  guestUserId?: string;
}

type LinkRow = {
  id: string;
  partner_user_id: string;
  form_id: string;
  event_id: string;
  ref_code: string;
  click_count: number;
  submission_count: number;
  is_active: boolean;
  created_at: string;
  event_registration_forms?: { title: string; slug: string } | null;
  paid_events?: { title: string; event_date: string | null; location: string | null } | null;
};

type SubRow = {
  id: string;
  form_id: string;
  partner_user_id: string | null;
  partner_link_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  payment_status: string | null;
  email_status: string | null;
  created_at: string;
};

const GuestRegistrationsPanel: React.FC<Props> = ({ guestUserId }) => {
  const { toast } = useToast();
  const [openLinks, setOpenLinks] = useState<Record<string, boolean>>({});

  // 1) Get guest user IDs scope
  const { data: guestIds = [] } = useQuery({
    queryKey: ['guest-regs-ids', guestUserId ?? 'all'],
    queryFn: async () => {
      if (guestUserId) return [guestUserId];
      const { data, error } = await (supabase as any)
        .from('user_roles').select('user_id').eq('role', 'guest');
      if (error) throw error;
      return (data || []).map((r: any) => r.user_id) as string[];
    },
  });

  // 2) Partner links of guests
  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ['guest-partner-links', guestIds.join(',')],
    enabled: guestIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('paid_event_partner_links')
        .select('id, partner_user_id, form_id, event_id, ref_code, click_count, submission_count, is_active, created_at, event_registration_forms!form_id(title, slug), paid_events!event_id(title, event_date, location)')
        .in('partner_user_id', guestIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LinkRow[];
    },
  });

  // 3) Submissions for those links
  const linkIds = useMemo(() => links.map(l => l.id), [links]);
  const { data: subs = [] } = useQuery({
    queryKey: ['guest-partner-submissions', linkIds.join(',')],
    enabled: linkIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('event_form_submissions')
        .select('id, form_id, partner_user_id, partner_link_id, first_name, last_name, email, phone, status, payment_status, email_status, created_at')
        .in('partner_link_id', linkIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SubRow[];
    },
  });

  // 4) Guest profiles for display (only when aggregated)
  const { data: profiles = {} } = useQuery({
    queryKey: ['guest-regs-profiles', guestIds.join(',')],
    enabled: !guestUserId && guestIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('profiles').select('id, first_name, last_name, email').in('id', guestIds);
      const m: Record<string, any> = {};
      (data || []).forEach((p: any) => { m[p.id] = p; });
      return m;
    },
  });

  const subsByLink = useMemo(() => {
    const m: Record<string, SubRow[]> = {};
    subs.forEach(s => {
      if (!s.partner_link_id) return;
      (m[s.partner_link_id] = m[s.partner_link_id] || []).push(s);
    });
    return m;
  }, [subs]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: 'Skopiowano' }); }
    catch { toast({ title: 'Skopiuj ręcznie', description: text }); }
  };

  const exportXlsx = async () => {
    const XLSX = await import('xlsx');
    const rows = subs.map(s => {
      const link = links.find(l => l.id === s.partner_link_id);
      const guest = link ? (profiles as any)[link.partner_user_id] : null;
      return {
        'Gość promujący': guest ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() : link?.partner_user_id || '—',
        'Email gościa': guest?.email || '—',
        'Wydarzenie': link?.paid_events?.title || '—',
        'Formularz': link?.event_registration_forms?.title || '—',
        'Imię': s.first_name || '—',
        'Nazwisko': s.last_name || '—',
        'Email': s.email || '—',
        'Telefon': s.phone || '—',
        'Status': s.status || '—',
        'Płatność': s.payment_status || '—',
        'Data': s.created_at ? format(new Date(s.created_at), 'yyyy-MM-dd HH:mm') : '—',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rejestracje gości');
    XLSX.writeFile(wb, `rejestracje_gosci_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  if (linksLoading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (links.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Brak wygenerowanych linków partnerskich gości.</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-primary" /> Linki partnerskie i rejestracje gości
          </CardTitle>
          <CardDescription>
            {guestUserId
              ? 'Linki tego gościa do wydarzeń oraz osoby zarejestrowane przez te linki.'
              : 'Wszystkie linki partnerskie wygenerowane przez gości oraz zapisani uczestnicy.'}
          </CardDescription>
        </div>
        {subs.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportXlsx}>
            <Download className="h-4 w-4 mr-1" /> XLSX
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {links.map(link => {
          const linkSubs = subsByLink[link.id] || [];
          const isOpen = !!openLinks[link.id];
          const guest = (profiles as any)[link.partner_user_id];
          const url = `${window.location.origin}/event-form/${link.event_registration_forms?.slug}?ref=${link.ref_code}`;
          return (
            <div key={link.id} className="border rounded-md p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {!guestUserId && guest && (
                    <div className="text-xs text-muted-foreground mb-1">
                      Gość: <span className="font-medium text-foreground">{guest.first_name} {guest.last_name}</span> · {guest.email}
                    </div>
                  )}
                  <div className="font-medium text-sm truncate">{link.paid_events?.title || '—'}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {link.event_registration_forms?.title || '—'}
                    {link.paid_events?.event_date && ` · ${new Date(link.paid_events.event_date).toLocaleDateString('pl-PL')}`}
                    {link.paid_events?.location && ` · ${link.paid_events.location}`}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="secondary" className="gap-1"><MousePointer className="h-3 w-3" /> {link.click_count}</Badge>
                  <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> {linkSubs.length}</Badge>
                  {!link.is_active && <Badge variant="destructive" className="text-xs">nieaktywny</Badge>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input value={url} readOnly className="font-mono text-[11px]" />
                <Button size="sm" variant="outline" onClick={() => copy(url)} className="shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <Collapsible open={isOpen} onOpenChange={(o) => setOpenLinks(s => ({ ...s, [link.id]: o }))}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs h-7 px-2 -ml-2">
                    <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    Zapisani ({linkSubs.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {linkSubs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Brak rejestracji przez ten link.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-2">Imię</th>
                            <th className="text-left py-1 px-2">Nazwisko</th>
                            <th className="text-left py-1 px-2">Email</th>
                            <th className="text-left py-1 px-2">Telefon</th>
                            <th className="text-left py-1 px-2">Status</th>
                            <th className="text-left py-1 px-2">Płatność</th>
                            <th className="text-left py-1 px-2">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linkSubs.map(s => (
                            <tr key={s.id} className="border-b last:border-0">
                              <td className="py-1 px-2">{s.first_name || '—'}</td>
                              <td className="py-1 px-2">{s.last_name || '—'}</td>
                              <td className="py-1 px-2 text-muted-foreground">{s.email || '—'}</td>
                              <td className="py-1 px-2 text-muted-foreground">{s.phone || '—'}</td>
                              <td className="py-1 px-2">{s.status || '—'}</td>
                              <td className="py-1 px-2">{s.payment_status || '—'}</td>
                              <td className="py-1 px-2 text-muted-foreground">{s.created_at ? format(new Date(s.created_at), 'dd.MM.yyyy HH:mm') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default GuestRegistrationsPanel;
