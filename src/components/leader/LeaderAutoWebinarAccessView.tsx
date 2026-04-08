import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLeaderTeamMembers } from '@/hooks/useLeaderTeamMembers';
import { Search, Loader2, UserCheck, Users, Radio } from 'lucide-react';

interface TeamMemberAccess {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  can_access_auto_webinar: boolean;
  level: number;
}

const LeaderAutoWebinarAccessView: React.FC = () => {
  const { toast } = useToast();
  const { teamMembers, loading: teamLoading } = useLeaderTeamMembers();
  const [accessMap, setAccessMap] = useState<Map<string, boolean>>(new Map());
  const [permLoading, setPermLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const permissionsLoaded = useRef(false);

  useEffect(() => {
    if (teamLoading) return;
    if (permissionsLoaded.current) return;
    if (teamMembers.length === 0) {
      setPermLoading(false);
      return;
    }
    loadPermissions();
  }, [teamLoading]);

  const loadPermissions = async () => {
    setPermLoading(true);
    try {
      const userIds = teamMembers.map(m => m.id);
      const { data, error } = await supabase
        .rpc('leader_get_team_auto_webinar_access', { p_user_ids: userIds });

      if (error) throw error;

      const map = new Map<string, boolean>();
      (data as any[])?.forEach(p => map.set(p.user_id, p.can_access_auto_webinar || false));
      setAccessMap(map);
      permissionsLoaded.current = true;
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setPermLoading(false);
    }
  };

  const toggleAccess = async (userId: string, value: boolean) => {
    setSaving(userId);
    try {
      const { error } = await supabase.rpc('leader_update_auto_webinar_access', {
        p_target_user_id: userId,
        p_grant_access: value,
      });
      if (error) throw error;

      setAccessMap(prev => new Map(prev).set(userId, value));
      toast({
        title: 'Zapisano',
        description: value ? 'Dostęp do auto-webinaru włączony' : 'Dostęp do auto-webinaru wyłączony',
      });
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
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
    can_access_auto_webinar: accessMap.get(m.id) || false,
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

  const withAccess = filtered.filter(m => m.can_access_auto_webinar);
  const withoutAccess = filtered.filter(m => !m.can_access_auto_webinar);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Radio className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Zarządzanie dostępem do Auto-Webinaru</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Włącz lub wyłącz dostęp do kafelków Auto-Webinar (Business Opportunity i Health Conversation) na pulpicie użytkowników w Twojej strukturze.
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj użytkownika..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              Bez dostępu
              <Badge variant="secondary" className="ml-auto">{withoutAccess.length}</Badge>
            </CardTitle>
            <CardDescription>Użytkownicy bez dostępu do auto-webinaru</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {withoutAccess.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {searchQuery ? 'Nie znaleziono' : 'Wszyscy użytkownicy mają dostęp'}
              </p>
            ) : (
              withoutAccess.map(member => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Switch
                    checked={false}
                    onCheckedChange={() => toggleAccess(member.user_id, true)}
                    disabled={saving === member.user_id}
                  />
                </div>
              ))
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
            <CardDescription>Użytkownicy z aktywnym dostępem do auto-webinaru</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {withAccess.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {searchQuery ? 'Nie znaleziono' : 'Brak użytkowników z dostępem'}
              </p>
            ) : (
              withAccess.map(member => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Switch
                    checked={true}
                    onCheckedChange={() => toggleAccess(member.user_id, false)}
                    disabled={saving === member.user_id}
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

export default LeaderAutoWebinarAccessView;
