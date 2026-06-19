import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderTeamMembers } from '@/hooks/useLeaderTeamMembers';
import { Search, Loader2, UserCheck, Users, Trophy, GraduationCap, RefreshCw } from 'lucide-react';

interface TeamMemberAccess {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  has_access: boolean;
  has_certificate: boolean;
  level: number;
}

const LeaderChallengeAccessView: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { teamMembers, loading: teamLoading, refetch: refetchTeam } = useLeaderTeamMembers();
  const [accessMap, setAccessMap] = useState<Map<string, boolean>>(new Map());
  const [certMap, setCertMap] = useState<Map<string, boolean>>(new Map());
  const [permLoading, setPermLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const teamIdsKey = teamMembers.map(m => m.id).sort().join(',');

  useEffect(() => {
    if (teamLoading) return;
    if (teamMembers.length === 0) {
      setAccessMap(new Map());
      setCertMap(new Map());
      setPermLoading(false);
      return;
    }
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamLoading, teamIdsKey]);

  const loadPermissions = async () => {
    setPermLoading(true);
    try {
      const userIds = teamMembers.map(m => m.id);
      const { data, error } = await supabase.rpc('leader_get_team_challenge_access', { p_user_ids: userIds });
      if (error) throw error;
      const am = new Map<string, boolean>();
      const cm = new Map<string, boolean>();
      (data as any[])?.forEach(p => {
        am.set(p.user_id, !!p.has_access);
        cm.set(p.user_id, !!p.has_szybki_start_cert);
      });
      setAccessMap(am);
      setCertMap(cm);
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setPermLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchTeam();
      await loadPermissions();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleAccess = async (userId: string, value: boolean) => {
    setSaving(userId);
    try {
      const { error } = await supabase.rpc('leader_update_challenge_access', {
        p_target_user_id: userId,
        p_grant_access: value,
      });
      if (error) throw error;
      setAccessMap(prev => new Map(prev).set(userId, value));
      toast({
        title: 'Zapisano',
        description: value ? 'Dostęp do Wyzwania włączony' : 'Dostęp do Wyzwania wyłączony',
      });
    } catch (error: any) {
      const details = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(' • ');
      toast({ title: 'Błąd', description: details || 'Nie udało się zapisać', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const loading = teamLoading || permLoading;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const members: TeamMemberAccess[] = teamMembers.map(m => ({
    user_id: m.id,
    first_name: m.first_name,
    last_name: m.last_name,
    email: m.email,
    has_access: accessMap.get(m.id) || false,
    has_certificate: certMap.get(m.id) || false,
    level: m.level,
  }));

  const filtered = members.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.first_name?.toLowerCase().includes(q) ||
      m.last_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  });

  const withAccess = filtered.filter(m => m.has_access);
  const withoutAccess = filtered.filter(m => !m.has_access);

  const renderMemberRow = (member: TeamMemberAccess, showEnabled: boolean) => {
    const hasCert = member.has_certificate;
    return (
      <div
        key={member.user_id}
        className={`flex items-center justify-between rounded-lg border p-3 ${
          showEnabled ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">
              {member.first_name} {member.last_name}
            </p>
            {!hasCert && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-300 text-orange-600 whitespace-nowrap">
                      <GraduationCap className="h-3 w-3 mr-0.5" />
                      Brak certyfikatu
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Wymaga ukończenia szkolenia „Szybki Start" i wygenerowania certyfikatu</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        </div>
        {hasCert ? (
          <Switch
            checked={showEnabled}
            onCheckedChange={() => toggleAccess(member.user_id, !showEnabled)}
            disabled={saving === member.user_id}
          />
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div><Switch checked={false} disabled /></div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Wymaga certyfikatu „Szybki Start"</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Zarządzanie dostępem do Wyzwania 90-dniowego</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Włącz lub wyłącz dostęp do modułu Wyzwania 90-dniowego dla członków Twojej struktury.
        <span className="block mt-1 text-orange-600 font-medium">
          ⚠️ Warunek: użytkownik musi posiadać certyfikat ukończenia szkolenia „Szybki Start".
        </span>
      </p>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj użytkownika..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || teamLoading || permLoading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Odśwież
        </Button>
      </div>

      {teamMembers.length === 0 && !teamLoading && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground text-center">
            Nie znaleziono użytkowników w Twojej strukturze.
            <span className="block mt-1 text-xs">
              Twoje eq_id: <code className="font-mono">{profile?.eq_id ?? 'brak'}</code>
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              Bez dostępu
              <Badge variant="secondary" className="ml-auto">{withoutAccess.length}</Badge>
            </CardTitle>
            <CardDescription>Użytkownicy bez dostępu do Wyzwania</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {withoutAccess.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {searchQuery ? 'Nie znaleziono' : 'Wszyscy mają dostęp'}
              </p>
            ) : (
              withoutAccess.map(member => renderMemberRow(member, false))
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-primary" />
              Z dostępem
              <Badge className="ml-auto bg-primary text-primary-foreground">{withAccess.length}</Badge>
            </CardTitle>
            <CardDescription>Użytkownicy z aktywnym dostępem do Wyzwania</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {withAccess.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {searchQuery ? 'Nie znaleziono' : 'Brak użytkowników z dostępem'}
              </p>
            ) : (
              withAccess.map(member => renderMemberRow(member, true))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderChallengeAccessView;
