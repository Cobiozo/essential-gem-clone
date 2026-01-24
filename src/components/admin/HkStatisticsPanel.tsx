import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, FileText, BarChart3 } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { pl } from 'date-fns/locale';

interface PartnerStats {
  partner_id: string;
  first_name: string;
  last_name: string;
  role: string;
  total_codes: number;
  used_codes: number;
}

interface MaterialStats {
  knowledge_id: string;
  title: string;
  total_shares: number;
  total_sessions: number;
}

interface RoleDistribution {
  role: string;
  count: number;
  percentage: number;
}

const HkStatisticsPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d');
  const [topPartners, setTopPartners] = useState<PartnerStats[]>([]);
  const [topMaterials, setTopMaterials] = useState<MaterialStats[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>([]);
  const [totals, setTotals] = useState({ total: 0, active: 0, used: 0, expired: 0 });

  useEffect(() => {
    fetchStatistics();
  }, [period]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      let dateFilter = {};
      if (period === '7d') {
        dateFilter = { gte: subDays(new Date(), 7).toISOString() };
      } else if (period === '30d') {
        dateFilter = { gte: subMonths(new Date(), 1).toISOString() };
      }

      // Fetch all codes with partner and material info
      let query = supabase
        .from('hk_otp_codes')
        .select(`
          id,
          partner_id,
          knowledge_id,
          used_sessions,
          is_invalidated,
          expires_at,
          created_at,
          healthy_knowledge (id, title, otp_max_sessions)
        `)
        .order('created_at', { ascending: false });

      if (period !== 'all') {
        query = query.gte('created_at', period === '7d' 
          ? subDays(new Date(), 7).toISOString() 
          : subMonths(new Date(), 1).toISOString());
      }

      const { data: codes, error } = await query;
      if (error) throw error;

      // Fetch partner profiles
      const partnerIds = [...new Set((codes || []).map(c => c.partner_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, role')
        .in('user_id', partnerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Calculate totals
      const now = new Date();
      const total = codes?.length || 0;
      const active = codes?.filter(c => 
        !c.is_invalidated && 
        new Date(c.expires_at) > now &&
        c.used_sessions < (c.healthy_knowledge?.otp_max_sessions || 3)
      ).length || 0;
      const used = codes?.filter(c => 
        c.used_sessions >= (c.healthy_knowledge?.otp_max_sessions || 3)
      ).length || 0;
      const expired = codes?.filter(c => 
        c.is_invalidated || new Date(c.expires_at) <= now
      ).length || 0;

      setTotals({ total, active, used, expired });

      // Calculate top partners
      const partnerMap = new Map<string, PartnerStats>();
      (codes || []).forEach(code => {
        const profile = profileMap.get(code.partner_id);
        if (!partnerMap.has(code.partner_id)) {
          partnerMap.set(code.partner_id, {
            partner_id: code.partner_id,
            first_name: profile?.first_name || 'Nieznany',
            last_name: profile?.last_name || '',
            role: profile?.role || 'unknown',
            total_codes: 0,
            used_codes: 0,
          });
        }
        const stats = partnerMap.get(code.partner_id)!;
        stats.total_codes++;
        if (code.used_sessions > 0) stats.used_codes++;
      });

      const topPartnersArray = Array.from(partnerMap.values())
        .sort((a, b) => b.total_codes - a.total_codes)
        .slice(0, 5);
      setTopPartners(topPartnersArray);

      // Calculate top materials
      const materialMap = new Map<string, MaterialStats>();
      (codes || []).forEach(code => {
        if (!code.healthy_knowledge) return;
        const key = code.knowledge_id;
        if (!materialMap.has(key)) {
          materialMap.set(key, {
            knowledge_id: key,
            title: code.healthy_knowledge.title || 'Nieznany',
            total_shares: 0,
            total_sessions: 0,
          });
        }
        const stats = materialMap.get(key)!;
        stats.total_shares++;
        stats.total_sessions += code.used_sessions;
      });

      const topMaterialsArray = Array.from(materialMap.values())
        .sort((a, b) => b.total_shares - a.total_shares)
        .slice(0, 5);
      setTopMaterials(topMaterialsArray);

      // Calculate role distribution
      const roleMap = new Map<string, number>();
      (codes || []).forEach(code => {
        const profile = profileMap.get(code.partner_id);
        const role = profile?.role || 'unknown';
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      });

      const roleDistArray: RoleDistribution[] = Array.from(roleMap.entries())
        .map(([role, count]) => ({
          role,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);
      setRoleDistribution(roleDistArray);

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'partner': return 'Partner';
      case 'specjalista': return 'Specjalista';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-yellow-500';
      case 'partner': return 'bg-blue-500';
      case 'specjalista': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex justify-end">
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Wybierz okres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Ostatnie 7 dni</SelectItem>
            <SelectItem value="30d">Ostatnie 30 dni</SelectItem>
            <SelectItem value="all">Wszystko</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totals.total}</div>
            <p className="text-sm text-muted-foreground">Wszystkie kody</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{totals.active}</div>
            <p className="text-sm text-muted-foreground">Aktywne</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{totals.used}</div>
            <p className="text-sm text-muted-foreground">Wykorzystane</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{totals.expired}</div>
            <p className="text-sm text-muted-foreground">Wygasłe</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Partners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              TOP 5 najbardziej aktywnych
            </CardTitle>
            <CardDescription>Partnerzy generujący najwięcej kodów</CardDescription>
          </CardHeader>
          <CardContent>
            {topPartners.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Brak danych</p>
            ) : (
              <div className="space-y-3">
                {topPartners.map((partner, index) => (
                  <div key={partner.partner_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="font-medium">
                          {partner.first_name} {partner.last_name}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {getRoleLabel(partner.role)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{partner.total_codes} kodów</p>
                      <p className="text-xs text-muted-foreground">
                        {partner.used_codes} użytych
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Materials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" />
              TOP 5 materiałów
            </CardTitle>
            <CardDescription>Najczęściej udostępniane materiały</CardDescription>
          </CardHeader>
          <CardContent>
            {topMaterials.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Brak danych</p>
            ) : (
              <div className="space-y-3">
                {topMaterials.map((material, index) => (
                  <div key={material.knowledge_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <p className="font-medium truncate max-w-[180px]">
                        {material.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{material.total_shares} udostępnień</p>
                      <p className="text-xs text-muted-foreground">
                        {material.total_sessions} sesji
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Podział wg roli
          </CardTitle>
          <CardDescription>Kto generuje kody dostępu</CardDescription>
        </CardHeader>
        <CardContent>
          {roleDistribution.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Brak danych</p>
          ) : (
            <div className="space-y-3">
              {/* Visual bar */}
              <div className="flex h-8 rounded-lg overflow-hidden">
                {roleDistribution.map((role) => (
                  <div
                    key={role.role}
                    className={`${getRoleColor(role.role)} flex items-center justify-center text-white text-xs font-medium`}
                    style={{ width: `${Math.max(role.percentage, 5)}%` }}
                    title={`${getRoleLabel(role.role)}: ${role.percentage}%`}
                  >
                    {role.percentage >= 15 ? `${role.percentage}%` : ''}
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4">
                {roleDistribution.map((role) => (
                  <div key={role.role} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${getRoleColor(role.role)}`} />
                    <span className="text-sm">
                      {getRoleLabel(role.role)}: {role.count} ({role.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HkStatisticsPanel;
