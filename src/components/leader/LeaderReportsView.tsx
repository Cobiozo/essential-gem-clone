import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Loader2, Users, UserCheck, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderTeamMembers } from '@/hooks/useLeaderTeamMembers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const LeaderReportsView: React.FC = () => {
  const { user } = useAuth();
  const { teamMembers, loading: teamLoading } = useLeaderTeamMembers();

  const { data: trainingData = [], isLoading: trainingLoading } = useQuery({
    queryKey: ['leader-reports-training', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leader_team_training_progress', { p_leader_user_id: user!.id });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const totalMembers = teamMembers.length;
  const roleBreakdown = teamMembers.reduce((acc: Record<string, number>, m) => { const role = m.role || 'other'; acc[role] = (acc[role] || 0) + 1; return acc; }, {});

  const memberProgress = trainingData.reduce((acc: Record<string, { name: string; avg: number; count: number }>, item: any) => {
    if (!item.module_id) return acc;
    if (!acc[item.user_id]) acc[item.user_id] = { name: `${item.first_name || ''} ${(item.last_name || '').charAt(0)}.`, avg: 0, count: 0 };
    acc[item.user_id].avg += Number(item.progress_percentage);
    acc[item.user_id].count++;
    return acc;
  }, {});

  const chartData = Object.values(memberProgress).map(m => ({ name: m.name, progress: m.count > 0 ? Math.round(m.avg / m.count) : 0 })).sort((a, b) => b.progress - a.progress).slice(0, 15);
  const isLoading = teamLoading || trainingLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Raporty i statystyki</CardTitle>
        <CardDescription>Dashboard ze statystykami zespołu.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 text-center"><Users className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{totalMembers}</p><p className="text-xs text-muted-foreground">Członków</p></div>
              <div className="border rounded-lg p-4 text-center"><UserCheck className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{Object.keys(roleBreakdown).length}</p><p className="text-xs text-muted-foreground">Ról</p><div className="flex gap-1 justify-center mt-1 flex-wrap">{Object.entries(roleBreakdown).map(([role, count]) => <Badge key={role} variant="outline" className="text-xs">{role}: {count}</Badge>)}</div></div>
              <div className="border rounded-lg p-4 text-center"><GraduationCap className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{Object.keys(memberProgress).length}</p><p className="text-xs text-muted-foreground">Ze szkoleniami</p></div>
            </div>
            {chartData.length > 0 && <div><h4 className="text-sm font-medium mb-3">Średni postęp szkoleniowy (%)</h4><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ left: 80 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="progress" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderReportsView;
