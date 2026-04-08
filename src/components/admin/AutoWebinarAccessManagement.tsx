import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, UserCheck, Users } from 'lucide-react';

interface PartnerAccess {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  can_access_auto_webinar: boolean;
  permission_id?: string;
  granted_by_name?: string | null;
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
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('leader_permissions').select('id, user_id, can_access_auto_webinar, auto_webinar_granted_by'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (permsRes.error) throw permsRes.error;

      const roleMap = new Map<string, string>();
      rolesRes.data?.forEach(r => roleMap.set(r.user_id, r.role));
      // Eligible: partners/specjaliści OR anyone with active auto-webinar access
      const baseEligibleIds = new Set(
        rolesRes.data?.filter(r => ['partner', 'specjalista'].includes(r.role)).map(r => r.user_id) || []
      );
      const permMap = new Map(permsRes.data?.map(p => [p.user_id, p]) || []);
      // Add users who have active access regardless of role
      permsRes.data?.forEach(p => {
        if (p.can_access_auto_webinar) baseEligibleIds.add(p.user_id);
      });
      const eligibleIds = baseEligibleIds;

      // Collect granted_by IDs to fetch names
      const grantedByIds = new Set<string>();
      permsRes.data?.forEach(p => {
        if ((p as any).auto_webinar_granted_by) grantedByIds.add((p as any).auto_webinar_granted_by);
      });

      let granterNames = new Map<string, string>();
      if (grantedByIds.size > 0) {
        const { data: granterProfiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', Array.from(grantedByIds));
        granterProfiles?.forEach(gp => {
          granterNames.set(gp.user_id, `${gp.first_name || ''} ${gp.last_name || ''}`.trim());
        });
      }

      setPartners(
        (profilesRes.data || [])
          .filter(p => eligibleIds.has(p.user_id))
          .map(profile => {
            const perm = permMap.get(profile.user_id);
            const grantedBy = (perm as any)?.auto_webinar_granted_by;
            return {
              user_id: profile.user_id,
              first_name: profile.first_name,
              last_name: profile.last_name,
              email: profile.email,
              role: roleMap.get(profile.user_id) || 'partner',
              can_access_auto_webinar: perm?.can_access_auto_webinar || false,
              permission_id: perm?.id,
              granted_by_name: perm?.can_access_auto_webinar
                ? (grantedBy ? granterNames.get(grantedBy) || 'Lider' : 'Administrator')
                : null,
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
          .update({ can_access_auto_webinar: value, auto_webinar_granted_by: null } as any)
          .eq('id', partner.permission_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leader_permissions')
          .insert({ user_id: partner.user_id, can_access_auto_webinar: value, auto_webinar_granted_by: null } as any);
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

  const withAccess = filtered.filter(p => p.can_access_auto_webinar);
  const withoutAccess = filtered.filter(p => !p.can_access_auto_webinar);

  const roleBadge = (role: string) => (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
      {role === 'specjalista' ? 'Specjalista' : 'Partner'}
    </Badge>
  );

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
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj partnera lub specjalistę..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column — without access */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              Bez dostępu
              <Badge variant="secondary" className="ml-auto">{withoutAccess.length}</Badge>
            </CardTitle>
            <CardDescription>Partnerzy i specjaliści bez dostępu do auto-webinaru</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {withoutAccess.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {searchQuery ? 'Nie znaleziono' : 'Wszyscy mają dostęp'}
              </p>
            ) : (
              withoutAccess.map(partner => (
                <div
                  key={partner.user_id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {partner.first_name} {partner.last_name}
                      {roleBadge(partner.role)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{partner.email}</p>
                  </div>
                  <Switch
                    checked={false}
                    onCheckedChange={() => toggleAccess(partner, true)}
                    disabled={saving === partner.user_id}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right column — with access */}
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-primary" />
              Z dostępem
              <Badge className="ml-auto bg-primary text-primary-foreground">{withAccess.length}</Badge>
            </CardTitle>
            <CardDescription>Użytkownicy z aktywnym dostępem do auto-webinaru</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {withAccess.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {searchQuery ? 'Nie znaleziono' : 'Brak użytkowników z dostępem'}
              </p>
            ) : (
              withAccess.map(partner => (
                <div
                  key={partner.user_id}
                  className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {partner.first_name} {partner.last_name}
                      {roleBadge(partner.role)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{partner.email}</p>
                    <p className="text-xs text-primary mt-1 font-medium">
                      Nadane przez: {partner.granted_by_name}
                    </p>
                  </div>
                  <Switch
                    checked={true}
                    onCheckedChange={() => toggleAccess(partner, false)}
                    disabled={saving === partner.user_id}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
