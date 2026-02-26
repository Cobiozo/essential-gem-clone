import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link, Loader2, MousePointerClick, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLeaderTeamMembers } from '@/hooks/useLeaderTeamMembers';

const LeaderReflinksView: React.FC = () => {
  const { teamMembers, teamMemberIds, loading: teamLoading } = useLeaderTeamMembers();

  const { data: reflinks = [], isLoading } = useQuery({
    queryKey: ['leader-team-reflinks', teamMemberIds],
    queryFn: async () => {
      if (teamMemberIds.length === 0) return [];
      const { data, error } = await supabase.from('user_reflinks').select('id, reflink_code, creator_user_id, click_count, registration_count, target_role, is_active, expires_at').in('creator_user_id', teamMemberIds).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: teamMemberIds.length > 0,
  });

  const memberMap = new Map(teamMembers.map(m => [m.id, m]));
  const loading = teamLoading || isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Link className="h-5 w-5 text-primary" />Reflinki zespołu</CardTitle>
        <CardDescription>Podgląd reflinków członków zespołu (tylko do odczytu).</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : reflinks.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">Brak reflinków</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2 px-2">Członek</th><th className="text-left py-2 px-2">Kod</th><th className="text-left py-2 px-2">Rola</th><th className="text-right py-2 px-2">Kliknięcia</th><th className="text-right py-2 px-2">Rejestracje</th><th className="text-left py-2 px-2">Status</th></tr></thead>
              <tbody>{reflinks.map(r => { const m = memberMap.get(r.creator_user_id); return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 px-2">{m ? `${m.first_name} ${m.last_name}` : '—'}</td>
                  <td className="py-2 px-2 font-mono text-xs">{r.reflink_code}</td>
                  <td className="py-2 px-2"><Badge variant="outline" className="text-xs">{r.target_role}</Badge></td>
                  <td className="py-2 px-2 text-right"><span className="flex items-center justify-end gap-1"><MousePointerClick className="h-3 w-3" /> {r.click_count}</span></td>
                  <td className="py-2 px-2 text-right"><span className="flex items-center justify-end gap-1"><UserPlus className="h-3 w-3" /> {r.registration_count}</span></td>
                  <td className="py-2 px-2"><Badge variant={r.is_active ? 'default' : 'secondary'} className="text-xs">{r.is_active ? 'Aktywny' : 'Nieaktywny'}</Badge></td>
                </tr>
              ); })}</tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderReflinksView;
