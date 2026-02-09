import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Radio, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PartnerBroadcast {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  can_broadcast: boolean;
  permission_id?: string;
}

export const BroadcastLeadersCard = () => {
  const [partners, setPartners] = useState<PartnerBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPartners = async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'partner');
      if (rolesError) throw rolesError;

      const partnerIds = roles?.map(r => r.user_id) || [];
      if (partnerIds.length === 0) { setPartners([]); return; }

      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', partnerIds)
        .order('last_name', { ascending: true });
      if (profError) throw profError;

      const { data: permissions, error: permError } = await supabase
        .from('leader_permissions')
        .select('id, user_id, can_broadcast')
        .in('user_id', partnerIds);
      if (permError) throw permError;

      const permMap = new Map(permissions?.map(p => [p.user_id, p]) || []);

      setPartners((profiles || []).map(p => ({
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        can_broadcast: permMap.get(p.user_id)?.can_broadcast || false,
        permission_id: permMap.get(p.user_id)?.id,
      })));
    } catch (error) {
      console.error('Error loading partners:', error);
      toast.error('Błąd pobierania partnerów');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPartners(); }, []);

  const toggleBroadcast = async (partner: PartnerBroadcast, value: boolean) => {
    setSaving(partner.user_id);
    try {
      if (partner.permission_id) {
        const { error } = await supabase
          .from('leader_permissions')
          .update({ can_broadcast: value })
          .eq('id', partner.permission_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leader_permissions')
          .insert({ user_id: partner.user_id, can_host_private_meetings: true, can_broadcast: value });
        if (error) throw error;
      }
      toast.success(value ? 'Nadano rolę Lidera' : 'Usunięto rolę Lidera');
      loadPartners();
    } catch (error) {
      console.error('Error toggling broadcast:', error);
      toast.error('Błąd aktualizacji uprawnień');
    } finally {
      setSaving(null);
    }
  };

  const filtered = partners.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.first_name?.toLowerCase().includes(q) || p.last_name?.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          Liderzy — kanały jednokierunkowe
        </CardTitle>
        <CardDescription>
          Nadaj partnerowi rolę Lidera, aby mógł wysyłać wiadomości broadcast do swoich partnerów, specjalistów i klientów
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj partnera..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Lider (broadcast)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(partner => (
              <TableRow key={partner.user_id}>
                <TableCell className="font-medium">
                  {partner.first_name} {partner.last_name}
                  {partner.can_broadcast && (
                    <Badge variant="secondary" className="ml-2 text-xs">Lider</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{partner.email}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={partner.can_broadcast}
                    onCheckedChange={(checked) => toggleBroadcast(partner, checked)}
                    disabled={saving === partner.user_id}
                  />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'Nie znaleziono partnerów' : 'Brak partnerów w systemie'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
