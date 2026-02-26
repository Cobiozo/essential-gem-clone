import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BookOpenCheck, Loader2, Plus, RotateCcw, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderTeamMembers } from '@/hooks/useLeaderTeamMembers';
import { useToast } from '@/hooks/use-toast';

const LeaderTrainingMgmtView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { teamMembers, teamMemberIds, loading: teamLoading } = useLeaderTeamMembers();
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');

  // Fetch training progress via RPC
  const { data: progress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['leader-training-progress', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leader_team_training_progress', {
        p_leader_user_id: user!.id,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch available modules
  const { data: modules = [] } = useQuery({
    queryKey: ['training-modules-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_modules')
        .select('id, title')
        .eq('is_active', true)
        .order('position');
      if (error) throw error;
      return data || [];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('training_assignments').insert({
        user_id: selectedUserId,
        module_id: selectedModuleId,
        assigned_by: user!.id,
      });
      if (error) throw error;

      await supabase.from('platform_team_actions').insert({
        leader_user_id: user!.id,
        action_type: 'assign_training',
        new_value: `${selectedUserId}:${selectedModuleId}`,
      });
    },
    onSuccess: () => {
      toast({ title: 'Moduł przypisany' });
      queryClient.invalidateQueries({ queryKey: ['leader-training-progress'] });
      setAssignDialog(false);
    },
    onError: (err: any) => {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async ({ userId, moduleId }: { userId: string; moduleId: string }) => {
      // Delete progress for this user+module
      const { data: lessons } = await supabase
        .from('training_lessons')
        .select('id')
        .eq('module_id', moduleId);
      const lessonIds = (lessons || []).map(l => l.id);

      if (lessonIds.length > 0) {
        await supabase
          .from('training_progress')
          .delete()
          .eq('user_id', userId)
          .in('lesson_id', lessonIds);
      }

      // Reset assignment
      await supabase
        .from('training_assignments')
        .update({ is_completed: false, completed_at: null, last_activity_at: null })
        .eq('user_id', userId)
        .eq('module_id', moduleId);

      await supabase.from('platform_team_actions').insert({
        leader_user_id: user!.id,
        action_type: 'reset_training_progress',
        new_value: `${userId}:${moduleId}`,
      });
    },
    onSuccess: () => {
      toast({ title: 'Postęp zresetowany' });
      queryClient.invalidateQueries({ queryKey: ['leader-training-progress'] });
    },
  });

  // Group progress by user
  const progressByUser = progress.reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.user_id]) acc[item.user_id] = [];
    acc[item.user_id].push(item);
    return acc;
  }, {});

  const isLoading = teamLoading || progressLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpenCheck className="h-5 w-5 text-primary" />
              Zarządzanie szkoleniami zespołu
            </CardTitle>
            <CardDescription>Przypisuj moduły, podglądaj i resetuj postępy.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setAssignDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Przypisz moduł
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : Object.keys(progressByUser).length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Brak danych o szkoleniach zespołu</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(progressByUser).map(([userId, items]) => {
              const first = items[0];
              return (
                <div key={userId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{first.first_name} {first.last_name}</span>
                    <Badge variant="outline" className="text-xs">{first.eq_id}</Badge>
                    <Badge variant="secondary" className="text-xs">{first.role}</Badge>
                  </div>
                  {items.filter((i: any) => i.module_id).map((item: any) => (
                    <div key={`${userId}-${item.module_id}`} className="flex items-center gap-3 pl-6">
                      <span className="text-sm flex-1 min-w-0 truncate">{item.module_title || 'Moduł'}</span>
                      <Progress value={Number(item.progress_percentage)} className="w-24 h-2" />
                      <span className="text-xs text-muted-foreground w-10 text-right">{item.progress_percentage}%</span>
                      {item.is_completed && <Badge className="text-xs">✓</Badge>}
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => resetMutation.mutate({ userId, moduleId: item.module_id })}
                        disabled={resetMutation.isPending}>
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Przypisz moduł szkoleniowy</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Członek zespołu</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Wybierz osobę" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.eq_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Moduł</Label>
              <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                <SelectTrigger><SelectValue placeholder="Wybierz moduł" /></SelectTrigger>
                <SelectContent>
                  {modules.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Anuluj</Button>
            <Button onClick={() => assignMutation.mutate()} disabled={!selectedUserId || !selectedModuleId || assignMutation.isPending}>
              Przypisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Need Label import
import { Label } from '@/components/ui/label';

export default LeaderTrainingMgmtView;
