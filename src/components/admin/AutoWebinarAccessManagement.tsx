import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Radio, Loader2 } from 'lucide-react';

interface PartnerAccess {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  can_access_auto_webinar: boolean;
  permission_id?: string;
}

export const AutoWebinarAccessManagement: React.FC = () => {
  const { toast } = useToast();
  const [partners, setPartners] = useState<PartnerAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { loadPartners(); }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes, permsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, first_name, last_name, email').order('last_name'),
        supabase.from('user_roles').select('user_id, role').eq('role', 'partner'),
        supabase.from('leader_permissions').select('id, user_id, can_access_auto_webinar'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (permsRes.error) throw permsRes.error;

      const partnerIds = new Set(rolesRes.data?.map(r => r.user_id) || []);
      const permMap = new Map(permsRes.data?.map(p => [p.user_id, p]) || []);

      setPartners(
        (profilesRes.data || [])
          .filter(p => partnerIds.has(p.user_id))
          .map(profile => {
            const perm = permMap.get(profile.user_id);
            return {
              user_id: profile.user_id,
              first_name: profile.first_name,
              last_name: profile.last_name,
              email: profile.email,
              can_access_auto_webinar: perm?.can_access_auto_webinar || false,
              permission_id: perm?.id,
            };
          })
      );
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleAccess = async (partner: PartnerAccess, value: boolean) => {
    setSaving(partner.user_id);
    try {
      if (partner.permission_id) {
        const { error } = await supabase
          .from('leader_permissions')
          .update({ can_access_auto_webinar: value } as any)
          .eq('id', partner.permission_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leader_permissions')
          .insert({ user_id: partner.user_id, can_access_auto_webinar: value } as any);
        if (error) throw error;
      }

      toast({
        title: 'Zapisano',
        description: value ? 'Dostęp do auto-webinaru włączony' : 'Dostęp do auto-webinaru wyłączony',
      });
      loadPartners();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
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
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          Dostęp do Auto-Webinaru
        </CardTitle>
        <CardDescription>
          Zarządzaj dostępem partnerów do widżetu zaproszeniowego auto-webinaru na dashboardzie.
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
              <TableHead className="text-center">Dostęp do Auto-Webinaru</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((partner) => (
              <TableRow key={partner.user_id}>
                <TableCell className="font-medium">
                  {partner.first_name} {partner.last_name}
                </TableCell>
                <TableCell className="text-muted-foreground">{partner.email}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={partner.can_access_auto_webinar}
                    onCheckedChange={(checked) => toggleAccess(partner, checked)}
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
