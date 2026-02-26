import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLeaderTeamMembers } from '@/hooks/useLeaderTeamMembers';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const LeaderCertificatesView: React.FC = () => {
  const { teamMembers, teamMemberIds, loading: teamLoading } = useLeaderTeamMembers();

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['leader-team-certificates', teamMemberIds],
    queryFn: async () => {
      if (teamMemberIds.length === 0) return [];
      const { data, error } = await supabase.from('certificates').select('id, user_id, module_id, issued_at, file_url').in('user_id', teamMemberIds).order('issued_at', { ascending: false });
      if (error) throw error;
      const moduleIds = [...new Set(data.map(c => c.module_id))];
      let modulesMap: Record<string, string> = {};
      if (moduleIds.length > 0) { const { data: modules } = await supabase.from('training_modules').select('id, title').in('id', moduleIds); (modules || []).forEach(m => { modulesMap[m.id] = m.title; }); }
      return data.map(c => ({ ...c, module_title: modulesMap[c.module_id] || 'Moduł' }));
    },
    enabled: teamMemberIds.length > 0,
  });

  const memberMap = new Map(teamMembers.map(m => [m.id, m]));
  const loading = teamLoading || isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" />Certyfikaty zespołu</CardTitle>
        <CardDescription>Podgląd certyfikatów wydanych członkom zespołu (tylko do odczytu).</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : certificates.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">Brak certyfikatów</p> : (
          <div className="space-y-2">{certificates.map((c: any) => { const m = memberMap.get(c.user_id); return (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary shrink-0" /><span className="font-medium text-sm truncate">{m ? `${m.first_name} ${m.last_name}` : '—'}</span><Badge variant="outline" className="text-xs">{c.module_title}</Badge></div>
                <p className="text-xs text-muted-foreground mt-1">Wydany: {c.issued_at ? format(new Date(c.issued_at), 'dd MMM yyyy', { locale: pl }) : '—'}</p>
              </div>
              {c.file_url && <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0"><ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" /></a>}
            </div>
          ); })}</div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderCertificatesView;
