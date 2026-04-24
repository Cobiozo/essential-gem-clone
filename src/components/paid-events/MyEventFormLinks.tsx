import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link2, Copy, Check, Users, MousePointer, FileText, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MyEventFormLinksProps {
  /** Optional: scope panel to a single paid event (event detail page). */
  eventId?: string;
  /** Optional: hide the section header (useful when embedded under another title). */
  compact?: boolean;
}

/**
 * Personal partner-link panel for active event registration forms.
 * - Without `eventId`: shows all active forms (used on /paid-events listing).
 * - With `eventId`: shows only the form(s) for that specific paid event
 *   (used on /event/:slug detail page so partners can grab their ref link in context).
 * Each partner can generate their own ref link tracking clicks + submissions per form.
 */
export const MyEventFormLinks: React.FC<MyEventFormLinksProps> = ({ eventId, compact }) => {
  const { user, isPartner, isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // List of active forms with embedded paid_event data
  const { data: forms = [] } = useQuery({
    queryKey: ['active-event-forms-public', eventId ?? 'all'],
    enabled: !!user && (isPartner || isAdmin),
    queryFn: async () => {
      let q = supabase
        .from('event_registration_forms')
        .select('id, slug, title, event_id, paid_events!event_registration_forms_event_id_fkey(id, title, event_date, location, is_published)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (eventId) q = q.eq('event_id', eventId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).filter((f: any) => f.paid_events?.is_published);
    },
  });

  // Existing partner links for current user
  const { data: myLinks = {} } = useQuery({
    queryKey: ['my-event-form-partner-links', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_event_partner_links')
        .select('id, form_id, ref_code, click_count, is_active')
        .eq('partner_user_id', user!.id);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach(l => { map[l.form_id] = l; });
      return map;
    },
  });

  // Submission counts per form for current partner
  const { data: subCounts = {} } = useQuery({
    queryKey: ['my-event-form-sub-counts', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_form_submissions')
        .select('form_id')
        .eq('partner_user_id', user!.id);
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => { map[r.form_id] = (map[r.form_id] || 0) + 1; });
      return map;
    },
  });

  const generateLink = useMutation({
    mutationFn: async (form: any) => {
      if (!user?.id) throw new Error('Musisz być zalogowany');
      // ref_code: short eq_id-like + random
      const refCode = `${user.id.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`;
      const { data, error } = await supabase
        .from('paid_event_partner_links')
        .insert({
          partner_user_id: user.id,
          form_id: form.id,
          event_id: form.event_id,
          ref_code: refCode,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-event-form-partner-links'] });
      toast({ title: 'Twój link został wygenerowany' });
    },
    onError: (e: Error) => toast({ title: 'Błąd', description: e.message, variant: 'destructive' }),
  });

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
      toast({ title: 'Link skopiowany' });
    } catch {
      toast({ title: 'Skopiuj ręcznie', description: text });
    }
  };

  if (!user || (!isPartner && !isAdmin) || forms.length === 0) return null;

  const headerTitle = eventId
    ? 'Twój link partnerski do formularza rejestracyjnego'
    : 'Moje linki partnerskie do formularzy rejestracyjnych';
  const headerDesc = eventId
    ? 'Udostępniaj swój link, aby zapraszać gości na to wydarzenie. Statystyki (kliknięcia, zapisani) liczone są indywidualnie.'
    : 'Udostępniaj poniższe linki, aby zapraszać gości na wydarzenia. Statystyki zaproszeń (kliknięcia, zapisani) liczone są indywidualnie dla każdego linku.';

  return (
    <section>
      {!compact && (
        <>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            {headerTitle}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{headerDesc}</p>
        </>
      )}

      <div className="space-y-3">
        {forms.map((form: any) => {
          const link = (myLinks as any)[form.id];
          const subs = (subCounts as any)[form.id] || 0;
          const url = link ? `${window.location.origin}/event-form/${form.slug}?ref=${link.ref_code}` : null;
          return (
            <Card key={form.id}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-medium truncate">{form.title}</h3>
                    </div>
                    {form.paid_events && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {form.paid_events.title}
                        {form.paid_events.event_date && (
                          <span>· {new Date(form.paid_events.event_date).toLocaleDateString('pl-PL')}</span>
                        )}
                        {form.paid_events.location && <span>· {form.paid_events.location}</span>}
                      </div>
                    )}
                  </div>
                  {link && (
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary" className="gap-1">
                        <MousePointer className="h-3 w-3" /> {link.click_count} kliknięć
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" /> {subs} zapisanych
                      </Badge>
                    </div>
                  )}
                </div>

                {url ? (
                  <div className="flex items-center gap-2">
                    <Input value={url} readOnly className="font-mono text-xs" />
                    <Button size="sm" variant="outline" onClick={() => copy(url, link.id)}>
                      {copiedId === link.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateLink.mutate(form)}
                    disabled={generateLink.isPending}
                  >
                    <Link2 className="w-4 h-4 mr-1" /> Wygeneruj mój link
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default MyEventFormLinks;
