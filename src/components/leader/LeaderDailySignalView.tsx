import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sun, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const LeaderDailySignalView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [mainMessage, setMainMessage] = useState('');
  const [explanation, setExplanation] = useState('');

  const { data: signals = [], isLoading } = useQuery({
    queryKey: ['leader-daily-signals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('daily_signals').select('*').eq('created_by', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('daily_signals').insert({ main_message: mainMessage, explanation, created_by: user!.id, generated_by_ai: false, is_approved: true, source: 'leader' });
      if (error) throw error;
      await supabase.from('platform_team_actions').insert({ leader_user_id: user!.id, action_type: 'create_daily_signal', new_value: mainMessage });
    },
    onSuccess: () => { toast({ title: 'Sygnał utworzony' }); queryClient.invalidateQueries({ queryKey: ['leader-daily-signals'] }); setFormOpen(false); setMainMessage(''); setExplanation(''); },
    onError: (err: any) => { toast({ title: 'Błąd', description: err.message, variant: 'destructive' }); },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isUsed }: { id: string; isUsed: boolean }) => {
      const { error } = await supabase.from('daily_signals').update({ is_used: !isUsed }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leader-daily-signals'] }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5 text-primary" />Sygnał Dnia</CardTitle><CardDescription>Twórz i zarządzaj sygnałami dnia.</CardDescription></div>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nowy sygnał</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : signals.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">Brak sygnałów</p> : (
          <div className="space-y-3">{signals.map(s => (
            <div key={s.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="font-medium text-sm">{s.main_message}</span>{s.is_used && <Badge className="text-xs">Aktywny</Badge>}</div>
                <Switch checked={s.is_used} onCheckedChange={() => toggleMutation.mutate({ id: s.id, isUsed: s.is_used })} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.explanation}</p>
              <span className="text-xs text-muted-foreground">{s.created_at ? format(new Date(s.created_at), 'dd.MM.yyyy', { locale: pl }) : ''}</span>
            </div>
          ))}</div>
        )}
      </CardContent>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nowy Sygnał Dnia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Główna wiadomość</Label><Input value={mainMessage} onChange={e => setMainMessage(e.target.value)} /></div>
            <div><Label>Wyjaśnienie</Label><Textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Anuluj</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!mainMessage || !explanation || createMutation.isPending}>Utwórz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LeaderDailySignalView;
