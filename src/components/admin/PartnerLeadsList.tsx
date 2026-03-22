import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, Phone, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface PartnerLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  notes: string | null;
  contact_reason: string | null;
  created_at: string;
  user_id: string;
  partner_name?: string;
}

export const PartnerLeadsList: React.FC = () => {
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_contacts')
        .select('id, first_name, last_name, email, phone_number, notes, contact_reason, created_at, user_id')
        .eq('contact_source', 'Strona partnerska')
        .eq('contact_type', 'private')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set((data || []).map(d => d.user_id))];
      let profilesMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        if (profiles) {
          profilesMap = Object.fromEntries(
            profiles.map(p => [p.user_id, `${p.first_name || ''} ${p.last_name || ''}`.trim()])
          );
        }
      }

      setLeads(
        (data || []).map(d => ({
          ...d,
          partner_name: profilesMap[d.user_id] || 'Nieznany',
        }))
      );
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.first_name?.toLowerCase().includes(q) ||
      l.last_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.partner_name?.toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Zebrane leady z formularzy
          <Badge variant="secondary">{leads.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po imieniu, emailu, partnerze..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Brak leadów z formularzy stron partnerskich
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Imię i nazwisko</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefon</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Formularz</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Partner</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {lead.first_name} {lead.last_name}
                    </td>
                    <td className="px-4 py-3">
                      {lead.email ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          {lead.email}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {lead.phone_number ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          {lead.phone_number}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{lead.contact_reason || 'Formularz kontaktowy'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{lead.partner_name}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(lead.created_at), 'dd MMM yyyy, HH:mm', { locale: pl })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
