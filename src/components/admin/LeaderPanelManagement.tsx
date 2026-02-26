import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, Loader2, Crown, CalendarDays, GraduationCap, Calculator,
  UserRound, TreePine, UserCheck, CalendarPlus, ClipboardList,
  BookOpenCheck, Library, Bell, Mail, Smartphone, Contact, UserCog,
  Sun, Info, Link, BarChart3, Award, ChevronDown, ToggleLeft, ToggleRight,
} from 'lucide-react';

interface PartnerLeaderData {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  individual_meetings_enabled: boolean;
  can_view_team_progress: boolean;
  can_view_org_tree: boolean;
  can_approve_registrations: boolean;
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
  has_influencer_calc: boolean;
  has_specialist_calc: boolean;
}

type LeaderPermField =
  | 'individual_meetings_enabled' | 'can_view_team_progress' | 'can_view_org_tree'
  | 'can_approve_registrations' | 'can_create_team_events' | 'can_manage_event_registrations'
  | 'can_manage_team_training' | 'can_manage_knowledge_base' | 'can_send_team_notifications'
  | 'can_send_team_emails' | 'can_send_team_push' | 'can_view_team_contacts'
  | 'can_manage_team_contacts' | 'can_manage_daily_signal' | 'can_manage_important_info'
  | 'can_manage_team_reflinks' | 'can_view_team_reports' | 'can_manage_certificates';

const LEADER_PERM_FIELDS: LeaderPermField[] = [
  'individual_meetings_enabled', 'can_view_team_progress', 'can_view_org_tree',
  'can_approve_registrations', 'can_create_team_events', 'can_manage_event_registrations',
  'can_manage_team_training', 'can_manage_knowledge_base', 'can_send_team_notifications',
  'can_send_team_emails', 'can_send_team_push', 'can_view_team_contacts',
  'can_manage_team_contacts', 'can_manage_daily_signal', 'can_manage_important_info',
  'can_manage_team_reflinks', 'can_view_team_reports', 'can_manage_certificates',
];

interface ColumnDef {
  key: string;
  label: string;
  icon: React.ElementType;
  type: 'leader' | 'calc_influencer' | 'calc_specialist';
  group: string;
}

const columns: ColumnDef[] = [
  { key: 'individual_meetings_enabled', label: 'Spotkania', icon: CalendarDays, type: 'leader', group: 'Podstawowe' },
  { key: 'can_view_team_progress', label: 'Szkolenia', icon: GraduationCap, type: 'leader', group: 'Podstawowe' },
  { key: 'can_view_org_tree', label: 'Struktura', icon: TreePine, type: 'leader', group: 'Podstawowe' },
  { key: 'can_approve_registrations', label: 'Zatwierdzanie', icon: UserCheck, type: 'leader', group: 'Podstawowe' },
  { key: 'can_create_team_events', label: 'Wydarzenia', icon: CalendarPlus, type: 'leader', group: 'Wydarzenia' },
  { key: 'can_manage_event_registrations', label: 'Rejestracje', icon: ClipboardList, type: 'leader', group: 'Wydarzenia' },
  { key: 'can_manage_team_training', label: 'Zarz. szkoleniami', icon: BookOpenCheck, type: 'leader', group: 'Szkolenia' },
  { key: 'can_manage_knowledge_base', label: 'Baza wiedzy', icon: Library, type: 'leader', group: 'Szkolenia' },
  { key: 'can_send_team_notifications', label: 'Powiadomienia', icon: Bell, type: 'leader', group: 'Komunikacja' },
  { key: 'can_send_team_emails', label: 'Emaile', icon: Mail, type: 'leader', group: 'Komunikacja' },
  { key: 'can_send_team_push', label: 'Push', icon: Smartphone, type: 'leader', group: 'Komunikacja' },
  { key: 'can_view_team_contacts', label: 'Kontakty', icon: Contact, type: 'leader', group: 'Kontakty' },
  { key: 'can_manage_team_contacts', label: 'Edycja kontaktów', icon: UserCog, type: 'leader', group: 'Kontakty' },
  { key: 'can_manage_daily_signal', label: 'Sygnał Dnia', icon: Sun, type: 'leader', group: 'Treść' },
  { key: 'can_manage_important_info', label: 'Ważne info', icon: Info, type: 'leader', group: 'Treść' },
  { key: 'can_manage_team_reflinks', label: 'Reflinki', icon: Link, type: 'leader', group: 'Treść' },
  { key: 'can_view_team_reports', label: 'Raporty', icon: BarChart3, type: 'leader', group: 'Raporty' },
  { key: 'can_manage_certificates', label: 'Certyfikaty', icon: Award, type: 'leader', group: 'Raporty' },
  { key: 'has_influencer_calc', label: 'Kalk. Influencer', icon: Calculator, type: 'calc_influencer', group: 'Kalkulatory' },
  { key: 'has_specialist_calc', label: 'Kalk. Specjalista', icon: UserRound, type: 'calc_specialist', group: 'Kalkulatory' },
];

const TOTAL_PERMS = columns.length;

const groupedColumns = columns.reduce<Record<string, ColumnDef[]>>((acc, col) => {
  (acc[col.group] ||= []).push(col);
  return acc;
}, {});

const GROUP_ORDER = ['Podstawowe', 'Wydarzenia', 'Szkolenia', 'Komunikacja', 'Kontakty', 'Treść', 'Raporty', 'Kalkulatory'];

function countActive(p: PartnerLeaderData): number {
  return columns.filter(col => (p as any)[col.key]).length;
}

export const LeaderPanelManagement: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [partners, setPartners] = useState<PartnerLeaderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'partner');
      const partnerIds = roles?.map(r => r.user_id) || [];
      if (partnerIds.length === 0) { setPartners([]); return; }

      const [profilesResult, permissionsResult, calcAccessResult, specialistCalcResult] = await Promise.all([
        supabase.from('profiles').select('user_id, first_name, last_name, email').in('user_id', partnerIds).order('last_name', { ascending: true }),
        supabase.from('leader_permissions').select('*').in('user_id', partnerIds),
        supabase.from('calculator_user_access').select('user_id, has_access').in('user_id', partnerIds),
        supabase.from('specialist_calculator_user_access').select('user_id, has_access').in('user_id', partnerIds),
      ]);

      const permMap = new Map(permissionsResult.data?.map(p => [p.user_id, p]) || []);
      const calcMap = new Map(calcAccessResult.data?.map(c => [c.user_id, c]) || []);
      const specCalcMap = new Map(specialistCalcResult.data?.map(c => [c.user_id, c]) || []);

      const combined: PartnerLeaderData[] = (profilesResult.data || []).map(profile => {
        const perm = permMap.get(profile.user_id) as any;
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
    const { data, error } = await supabase.from('leader_permissions').upsert({ user_id: userId }, { onConflict: 'user_id' }).select('id').single();
    if (error) throw error;
    return data.id;
  };

  const toggleLeaderPermission = async (userId: string, field: LeaderPermField, value: boolean) => {
    setSaving(`${userId}-${field}`);
    try {
      const permId = await ensureLeaderPermission(userId);
      const { error } = await supabase.from('leader_permissions').update({ [field]: value }).eq('id', permId);
      if (error) throw error;
      setPartners(prev => prev.map(p => p.user_id === userId ? { ...p, [field]: value, permission_id: permId } : p));
      toast({ title: 'Sukces', description: 'Uprawnienie zaktualizowane' });
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować uprawnienia', variant: 'destructive' });
    } finally { setSaving(null); }
  };

  const toggleCalculatorAccess = async (userId: string, calcType: 'influencer' | 'specialist', value: boolean) => {
    setSaving(`${userId}-calc-${calcType}`);
    try {
      const table = calcType === 'influencer' ? 'calculator_user_access' : 'specialist_calculator_user_access';
      if (value) {
        await supabase.from(table).upsert({ user_id: userId, has_access: true, granted_by: user?.id }, { onConflict: 'user_id' });
      } else {
        await supabase.from(table).delete().eq('user_id', userId);
      }
      setPartners(prev => prev.map(p => p.user_id === userId ? {
        ...p,
        has_influencer_calc: calcType === 'influencer' ? value : p.has_influencer_calc,
        has_specialist_calc: calcType === 'specialist' ? value : p.has_specialist_calc,
      } : p));
      toast({ title: 'Sukces', description: `Dostęp do kalkulatora ${value ? 'przyznany' : 'odebrany'}` });
    } catch (error) {
      console.error('Error toggling calculator access:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować dostępu', variant: 'destructive' });
    } finally { setSaving(null); }
  };

  const toggleAllForPartner = async (partner: PartnerLeaderData, enable: boolean) => {
    setSaving(`${partner.user_id}-all`);
    try {
      const permId = await ensureLeaderPermission(partner.user_id);
      const leaderUpdate: Record<string, boolean> = {};
      LEADER_PERM_FIELDS.forEach(f => { leaderUpdate[f] = enable; });
      await supabase.from('leader_permissions').update(leaderUpdate).eq('id', permId);

      const calcTable = 'calculator_user_access';
      const specTable = 'specialist_calculator_user_access';
      if (enable) {
        await Promise.all([
          supabase.from(calcTable).upsert({ user_id: partner.user_id, has_access: true, granted_by: user?.id }, { onConflict: 'user_id' }),
          supabase.from(specTable).upsert({ user_id: partner.user_id, has_access: true, granted_by: user?.id }, { onConflict: 'user_id' }),
        ]);
      } else {
        await Promise.all([
          supabase.from(calcTable).delete().eq('user_id', partner.user_id),
          supabase.from(specTable).delete().eq('user_id', partner.user_id),
        ]);
      }

      setPartners(prev => prev.map(p => {
        if (p.user_id !== partner.user_id) return p;
        const updated = { ...p, permission_id: permId, has_influencer_calc: enable, has_specialist_calc: enable };
        LEADER_PERM_FIELDS.forEach(f => { (updated as any)[f] = enable; });
        return updated;
      }));
      toast({ title: 'Sukces', description: enable ? 'Wszystkie uprawnienia włączone' : 'Wszystkie uprawnienia wyłączone' });
    } catch (error) {
      console.error('Error toggling all:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować uprawnień', variant: 'destructive' });
    } finally { setSaving(null); }
  };

  const filtered = partners.filter(p => {
    const q = searchQuery.toLowerCase();
    return (p.first_name || '').toLowerCase().includes(q) || (p.last_name || '').toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  const toggleOpen = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Szukaj partnera..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" onClick={loadData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Odśwież'}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Brak partnerów</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(partner => {
                const active = countActive(partner);
                const isOpen = openIds.has(partner.user_id);
                const isSavingAll = saving === `${partner.user_id}-all`;

                return (
                  <Collapsible key={partner.user_id} open={isOpen} onOpenChange={() => toggleOpen(partner.user_id)}>
                    <div className={`border rounded-lg transition-colors ${active > 0 ? 'bg-primary/5 border-primary/20' : 'border-border'}`}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg">
                          {active > 0 && <Crown className="h-4 w-4 text-primary flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{partner.first_name} {partner.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{partner.email}</p>
                          </div>
                          <Badge variant={active > 0 ? 'default' : 'secondary'} className="flex-shrink-0">
                            {active}/{TOTAL_PERMS}
                          </Badge>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-1 border-t border-border/50">
                          <div className="flex gap-2 mb-3">
                            <Button
                              size="sm" variant="outline"
                              disabled={isSavingAll}
                              onClick={() => toggleAllForPartner(partner, true)}
                              className="text-xs gap-1"
                            >
                              <ToggleRight className="h-3.5 w-3.5" /> Włącz wszystko
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              disabled={isSavingAll}
                              onClick={() => toggleAllForPartner(partner, false)}
                              className="text-xs gap-1"
                            >
                              <ToggleLeft className="h-3.5 w-3.5" /> Wyłącz wszystko
                            </Button>
                            {isSavingAll && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center" />}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {GROUP_ORDER.map(groupName => {
                              const cols = groupedColumns[groupName];
                              if (!cols) return null;
                              return (
                                <div key={groupName}>
                                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{groupName}</p>
                                  <div className="space-y-1.5">
                                    {cols.map(col => {
                                      const checked = (partner as any)[col.key] as boolean;
                                      const isSavingThis = saving === `${partner.user_id}-${col.key}` || saving === `${partner.user_id}-calc-${col.type === 'calc_influencer' ? 'influencer' : 'specialist'}`;
                                      return (
                                        <label key={col.key} className="flex items-center gap-2 cursor-pointer group">
                                          <Switch
                                            checked={checked}
                                            disabled={isSavingThis || isSavingAll}
                                            onCheckedChange={v => {
                                              if (col.type === 'calc_influencer') toggleCalculatorAccess(partner.user_id, 'influencer', v);
                                              else if (col.type === 'calc_specialist') toggleCalculatorAccess(partner.user_id, 'specialist', v);
                                              else toggleLeaderPermission(partner.user_id, col.key as LeaderPermField, v);
                                            }}
                                            className="scale-90"
                                          />
                                          <col.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                          <span className="text-xs truncate">{col.label}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderPanelManagement;
