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
  UserCheck,
  CalendarPlus,
  ClipboardList,
  BookOpenCheck,
  Library,
  Bell,
  Mail,
  Smartphone,
  Contact,
  UserCog,
  Sun,
  Info,
  Link,
  BarChart3,
  Award,
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
  can_approve_registrations: boolean;
  // New delegated permissions
  can_create_team_events: boolean;
  can_manage_event_registrations: boolean;
  can_manage_team_training: boolean;
  can_manage_knowledge_base: boolean;
  can_send_team_notifications: boolean;
  can_send_team_emails: boolean;
  can_send_team_push: boolean;
  can_view_team_contacts: boolean;
  can_manage_team_contacts: boolean;
  can_manage_daily_signal: boolean;
  can_manage_important_info: boolean;
  can_manage_team_reflinks: boolean;
  can_view_team_reports: boolean;
  can_manage_certificates: boolean;
  permission_id?: string;
  // Calculator access
  has_influencer_calc: boolean;
  has_specialist_calc: boolean;
}

type LeaderPermField =
  | 'individual_meetings_enabled'
  | 'can_view_team_progress'
  | 'can_view_org_tree'
  | 'can_approve_registrations'
  | 'can_create_team_events'
  | 'can_manage_event_registrations'
  | 'can_manage_team_training'
  | 'can_manage_knowledge_base'
  | 'can_send_team_notifications'
  | 'can_send_team_emails'
  | 'can_send_team_push'
  | 'can_view_team_contacts'
  | 'can_manage_team_contacts'
  | 'can_manage_daily_signal'
  | 'can_manage_important_info'
  | 'can_manage_team_reflinks'
  | 'can_view_team_reports'
  | 'can_manage_certificates';

const LEADER_PERM_FIELDS: LeaderPermField[] = [
  'individual_meetings_enabled',
  'can_view_team_progress',
  'can_view_org_tree',
  'can_approve_registrations',
  'can_create_team_events',
  'can_manage_event_registrations',
  'can_manage_team_training',
  'can_manage_knowledge_base',
  'can_send_team_notifications',
  'can_send_team_emails',
  'can_send_team_push',
  'can_view_team_contacts',
  'can_manage_team_contacts',
  'can_manage_daily_signal',
  'can_manage_important_info',
  'can_manage_team_reflinks',
  'can_view_team_reports',
  'can_manage_certificates',
];

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
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'partner');

      const partnerIds = roles?.map(r => r.user_id) || [];
      if (partnerIds.length === 0) {
        setPartners([]);
        return;
      }

      const [profilesResult, permissionsResult, calcAccessResult, specialistCalcResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', partnerIds)
          .order('last_name', { ascending: true }),
        supabase
          .from('leader_permissions')
          .select('*')
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
        const perm = permMap.get(profile.user_id) as any;
        const calcAccess = calcMap.get(profile.user_id);
        const specAccess = specCalcMap.get(profile.user_id);

        const result: PartnerLeaderData = {
          user_id: profile.user_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          individual_meetings_enabled: perm?.individual_meetings_enabled || false,
          can_view_team_progress: perm?.can_view_team_progress || false,
          can_view_org_tree: perm?.can_view_org_tree || false,
          can_approve_registrations: perm?.can_approve_registrations || false,
          can_create_team_events: perm?.can_create_team_events || false,
          can_manage_event_registrations: perm?.can_manage_event_registrations || false,
          can_manage_team_training: perm?.can_manage_team_training || false,
          can_manage_knowledge_base: perm?.can_manage_knowledge_base || false,
          can_send_team_notifications: perm?.can_send_team_notifications || false,
          can_send_team_emails: perm?.can_send_team_emails || false,
          can_send_team_push: perm?.can_send_team_push || false,
          can_view_team_contacts: perm?.can_view_team_contacts || false,
          can_manage_team_contacts: perm?.can_manage_team_contacts || false,
          can_manage_daily_signal: perm?.can_manage_daily_signal || false,
          can_manage_important_info: perm?.can_manage_important_info || false,
          can_manage_team_reflinks: perm?.can_manage_team_reflinks || false,
          can_view_team_reports: perm?.can_view_team_reports || false,
          can_manage_certificates: perm?.can_manage_certificates || false,
          permission_id: perm?.id,
          has_influencer_calc: calcAccess?.has_access || false,
          has_specialist_calc: specAccess?.has_access || false,
        };
        return result;
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

    const { data, error } = await supabase
      .from('leader_permissions')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  };

  const toggleLeaderPermission = async (userId: string, field: LeaderPermField, value: boolean) => {
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

  const toggleCalculatorAccess = async (userId: string, calcType: 'influencer' | 'specialist', value: boolean) => {
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
    LEADER_PERM_FIELDS.some(f => p[f]) || p.has_influencer_calc || p.has_specialist_calc;

  const columns: Array<{
    key: string;
    label: string;
    icon: React.ElementType;
    type: 'leader' | 'calc_influencer' | 'calc_specialist';
    group: string;
  }> = [
    // Existing
    { key: 'individual_meetings_enabled', label: 'Spotkania', icon: CalendarDays, type: 'leader', group: 'Podstawowe' },
    { key: 'can_view_team_progress', label: 'Szkolenia', icon: GraduationCap, type: 'leader', group: 'Podstawowe' },
    { key: 'can_view_org_tree', label: 'Struktura', icon: TreePine, type: 'leader', group: 'Podstawowe' },
    { key: 'can_approve_registrations', label: 'Zatwierdzanie', icon: UserCheck, type: 'leader', group: 'Podstawowe' },
    // New - Events
    { key: 'can_create_team_events', label: 'Wydarzenia', icon: CalendarPlus, type: 'leader', group: 'Wydarzenia' },
    { key: 'can_manage_event_registrations', label: 'Rejestracje', icon: ClipboardList, type: 'leader', group: 'Wydarzenia' },
    // New - Training & Knowledge
    { key: 'can_manage_team_training', label: 'Zarz. szkoleniami', icon: BookOpenCheck, type: 'leader', group: 'Szkolenia' },
    { key: 'can_manage_knowledge_base', label: 'Baza wiedzy', icon: Library, type: 'leader', group: 'Szkolenia' },
    // New - Communication
    { key: 'can_send_team_notifications', label: 'Powiadomienia', icon: Bell, type: 'leader', group: 'Komunikacja' },
    { key: 'can_send_team_emails', label: 'Emaile', icon: Mail, type: 'leader', group: 'Komunikacja' },
    { key: 'can_send_team_push', label: 'Push', icon: Smartphone, type: 'leader', group: 'Komunikacja' },
    // New - Contacts
    { key: 'can_view_team_contacts', label: 'Kontakty', icon: Contact, type: 'leader', group: 'Kontakty' },
    { key: 'can_manage_team_contacts', label: 'Edycja kontaktów', icon: UserCog, type: 'leader', group: 'Kontakty' },
    // New - Content
    { key: 'can_manage_daily_signal', label: 'Sygnał Dnia', icon: Sun, type: 'leader', group: 'Treść' },
    { key: 'can_manage_important_info', label: 'Ważne info', icon: Info, type: 'leader', group: 'Treść' },
    { key: 'can_manage_team_reflinks', label: 'Reflinki', icon: Link, type: 'leader', group: 'Treść' },
    // New - Reports & Certificates
    { key: 'can_view_team_reports', label: 'Raporty', icon: BarChart3, type: 'leader', group: 'Raporty' },
    { key: 'can_manage_certificates', label: 'Certyfikaty', icon: Award, type: 'leader', group: 'Raporty' },
    // Calculators
    { key: 'has_influencer_calc', label: 'Kalk. Influencer', icon: Calculator, type: 'calc_influencer', group: 'Kalkulatory' },
    { key: 'has_specialist_calc', label: 'Kalk. Specjalista', icon: UserRound, type: 'calc_specialist', group: 'Kalkulatory' },
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
                    <TableHead className="min-w-[180px] sticky left-0 bg-background z-10">Partner</TableHead>
                    {columns.map(col => (
                      <TableHead key={col.key} className="text-center min-w-[90px]">
                        <div className="flex flex-col items-center gap-1">
                          <col.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-[10px] leading-tight">{col.label}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">
                        Brak partnerów
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(partner => (
                      <TableRow key={partner.user_id} className={hasAnyFeature(partner) ? 'bg-primary/5' : ''}>
                        <TableCell className="sticky left-0 bg-background z-10">
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

                        {columns.map(col => (
                          <TableCell key={col.key} className="text-center">
                            <Switch
                              checked={(partner as any)[col.key]}
                              disabled={saving === `${partner.user_id}-${col.key}` || saving === `${partner.user_id}-calc-${col.type === 'calc_influencer' ? 'influencer' : 'specialist'}`}
                              onCheckedChange={v => {
                                if (col.type === 'calc_influencer') {
                                  toggleCalculatorAccess(partner.user_id, 'influencer', v);
                                } else if (col.type === 'calc_specialist') {
                                  toggleCalculatorAccess(partner.user_id, 'specialist', v);
                                } else {
                                  toggleLeaderPermission(partner.user_id, col.key as LeaderPermField, v);
                                }
                              }}
                            />
                          </TableCell>
                        ))}
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
