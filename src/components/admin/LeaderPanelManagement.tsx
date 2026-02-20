import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  Loader2,
  Crown,
  CalendarDays,
  GraduationCap,
  Calculator,
  UserRound,
  TreePine,
  Users,
} from 'lucide-react';

interface PartnerLeaderData {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  // Leader permissions
  individual_meetings_enabled: boolean;
  can_view_team_progress: boolean;
  can_view_org_tree: boolean;
  permission_id?: string;
  // Calculator access
  has_influencer_calc: boolean;
  has_specialist_calc: boolean;
}

export const LeaderPanelManagement: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [partners, setPartners] = useState<PartnerLeaderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all partner profiles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'partner');

      const partnerIds = roles?.map(r => r.user_id) || [];
      if (partnerIds.length === 0) {
        setPartners([]);
        return;
      }

      // Fetch profiles, leader_permissions, and calculator access in parallel
      const [profilesResult, permissionsResult, calcAccessResult, specialistCalcResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', partnerIds)
          .order('last_name', { ascending: true }),
        supabase
          .from('leader_permissions')
          .select('id, user_id, individual_meetings_enabled, can_view_team_progress, can_view_org_tree')
          .in('user_id', partnerIds),
        supabase
          .from('calculator_user_access')
          .select('user_id, has_access')
          .in('user_id', partnerIds),
        supabase
          .from('specialist_calculator_user_access')
          .select('user_id, has_access')
          .in('user_id', partnerIds),
      ]);

      const permMap = new Map(permissionsResult.data?.map(p => [p.user_id, p]) || []);
      const calcMap = new Map(calcAccessResult.data?.map(c => [c.user_id, c]) || []);
      const specCalcMap = new Map(specialistCalcResult.data?.map(c => [c.user_id, c]) || []);

      const combined: PartnerLeaderData[] = (profilesResult.data || []).map(profile => {
        const perm = permMap.get(profile.user_id);
        const calcAccess = calcMap.get(profile.user_id);
        const specAccess = specCalcMap.get(profile.user_id);
        return {
          user_id: profile.user_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          individual_meetings_enabled: perm?.individual_meetings_enabled || false,
          can_view_team_progress: perm?.can_view_team_progress || false,
          can_view_org_tree: perm?.can_view_org_tree || false,
          permission_id: perm?.id,
          has_influencer_calc: calcAccess?.has_access || false,
          has_specialist_calc: specAccess?.has_access || false,
        };
      });

      setPartners(combined);
    } catch (error) {
      console.error('Error loading leader panel data:', error);
      toast({ title: 'Błąd', description: 'Nie udało się załadować danych', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const ensureLeaderPermission = async (userId: string): Promise<string> => {
    const partner = partners.find(p => p.user_id === userId);
    if (partner?.permission_id) return partner.permission_id;

    // Create new permission record
    const { data, error } = await supabase
      .from('leader_permissions')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  };

  const toggleLeaderPermission = async (
    userId: string,
    field: 'individual_meetings_enabled' | 'can_view_team_progress' | 'can_view_org_tree',
    value: boolean
  ) => {
    setSaving(`${userId}-${field}`);
    try {
      const permId = await ensureLeaderPermission(userId);

      const { error } = await supabase
        .from('leader_permissions')
        .update({ [field]: value })
        .eq('id', permId);

      if (error) throw error;

      setPartners(prev =>
        prev.map(p =>
          p.user_id === userId ? { ...p, [field]: value, permission_id: permId } : p
        )
      );

      toast({ title: 'Sukces', description: 'Uprawnienie zaktualizowane' });
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować uprawnienia', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const toggleCalculatorAccess = async (
    userId: string,
    calcType: 'influencer' | 'specialist',
    value: boolean
  ) => {
    const key = `${userId}-calc-${calcType}`;
    setSaving(key);
    try {
      const table = calcType === 'influencer' ? 'calculator_user_access' : 'specialist_calculator_user_access';

      if (value) {
        await supabase
          .from(table)
          .upsert({ user_id: userId, has_access: true, granted_by: user?.id }, { onConflict: 'user_id' });
      } else {
        await supabase.from(table).delete().eq('user_id', userId);
      }

      setPartners(prev =>
        prev.map(p =>
          p.user_id === userId
            ? {
                ...p,
                has_influencer_calc: calcType === 'influencer' ? value : p.has_influencer_calc,
                has_specialist_calc: calcType === 'specialist' ? value : p.has_specialist_calc,
              }
            : p
        )
      );

      toast({ title: 'Sukces', description: `Dostęp do kalkulatora ${value ? 'przyznany' : 'odebrany'}` });
    } catch (error) {
      console.error('Error toggling calculator access:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować dostępu', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const filtered = partners.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      (p.first_name || '').toLowerCase().includes(q) ||
      (p.last_name || '').toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  });

  const hasAnyFeature = (p: PartnerLeaderData) =>
    p.individual_meetings_enabled ||
    p.can_view_team_progress ||
    p.can_view_org_tree ||
    p.has_influencer_calc ||
    p.has_specialist_calc;

  const columns = [
    { key: 'individual_meetings_enabled', label: 'Spotkania', icon: CalendarDays, type: 'leader' as const },
    { key: 'can_view_team_progress', label: 'Szkolenia', icon: GraduationCap, type: 'leader' as const },
    { key: 'can_view_org_tree', label: 'Moja struktura', icon: TreePine, type: 'leader' as const },
    { key: 'has_influencer_calc', label: 'Kalk. Influencer', icon: Calculator, type: 'calc_influencer' as const },
    { key: 'has_specialist_calc', label: 'Kalk. Specjalista', icon: UserRound, type: 'calc_specialist' as const },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Panel Lidera — zarządzanie uprawnieniami
          </CardTitle>
          <CardDescription>
            Przydziel partnerom dostęp do poszczególnych modułów Panelu Lidera.
            Każdy moduł jest widoczny tylko wtedy, gdy jest włączony dla danego użytkownika.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj partnera..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={loadData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Odśwież'}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Partner</TableHead>
                    {columns.map(col => (
                      <TableHead key={col.key} className="text-center min-w-[110px]">
                        <div className="flex flex-col items-center gap-1">
                          <col.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs">{col.label}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Brak partnerów
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(partner => (
                      <TableRow key={partner.user_id} className={hasAnyFeature(partner) ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {hasAnyFeature(partner) && <Crown className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                            <div>
                              <p className="font-medium text-sm">
                                {partner.first_name} {partner.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{partner.email}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Spotkania */}
                        <TableCell className="text-center">
                          <Switch
                            checked={partner.individual_meetings_enabled}
                            disabled={saving === `${partner.user_id}-individual_meetings_enabled`}
                            onCheckedChange={v =>
                              toggleLeaderPermission(partner.user_id, 'individual_meetings_enabled', v)
                            }
                          />
                        </TableCell>

                        {/* Szkolenia */}
                        <TableCell className="text-center">
                          <Switch
                            checked={partner.can_view_team_progress}
                            disabled={saving === `${partner.user_id}-can_view_team_progress`}
                            onCheckedChange={v =>
                              toggleLeaderPermission(partner.user_id, 'can_view_team_progress', v)
                            }
                          />
                        </TableCell>

                        {/* Moja struktura */}
                        <TableCell className="text-center">
                          <Switch
                            checked={partner.can_view_org_tree}
                            disabled={saving === `${partner.user_id}-can_view_org_tree`}
                            onCheckedChange={v =>
                              toggleLeaderPermission(partner.user_id, 'can_view_org_tree', v)
                            }
                          />
                        </TableCell>

                        {/* Kalkulator Influencer */}
                        <TableCell className="text-center">
                          <Switch
                            checked={partner.has_influencer_calc}
                            disabled={saving === `${partner.user_id}-calc-influencer`}
                            onCheckedChange={v =>
                              toggleCalculatorAccess(partner.user_id, 'influencer', v)
                            }
                          />
                        </TableCell>

                        {/* Kalkulator Specjalista */}
                        <TableCell className="text-center">
                          <Switch
                            checked={partner.has_specialist_calc}
                            disabled={saving === `${partner.user_id}-calc-specialist`}
                            onCheckedChange={v =>
                              toggleCalculatorAccess(partner.user_id, 'specialist', v)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderPanelManagement;
