import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Send, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderTeamMembers } from '@/hooks/useLeaderTeamMembers';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const LeaderNotificationsView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { teamMembers, teamMemberIds } = useLeaderTeamMembers();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['leader-sent-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_notifications').select('id, title, message, created_at, user_id').eq('sender_id', user!.id).eq('source_module', 'leader_panel').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const recipients = sendToAll ? teamMemberIds : selectedIds;
      if (recipients.length === 0) throw new Error('Brak odbiorców');
      const notifications = recipients.map(uid => ({ user_id: uid, notification_type: 'leader_message', source_module: 'leader_panel', title, message, sender_id: user!.id }));
      const { error } = await supabase.from('user_notifications').insert(notifications);
      if (error) throw error;
      await supabase.from('platform_team_actions').insert({ leader_user_id: user!.id, action_type: 'send_notification', new_value: `${title} (${recipients.length} odbiorców)` });
    },
    onSuccess: () => { toast({ title: 'Wysłano' }); setTitle(''); setMessage(''); queryClient.invalidateQueries({ queryKey: ['leader-sent-notifications'] }); },
    onError: (err: any) => { toast({ title: 'Błąd', description: err.message, variant: 'destructive' }); },
  });

  const toggleMember = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Powiadomienia do zespołu</CardTitle>
        <CardDescription>Wyślij powiadomienia in-app do członków zespołu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 border rounded-lg p-4">
          <div><Label>Tytuł</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tytuł powiadomienia" /></div>
          <div><Label>Treść</Label><Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Treść powiadomienia" rows={3} /></div>
          <div className="flex items-center gap-2"><Checkbox checked={sendToAll} onCheckedChange={(v) => setSendToAll(!!v)} id="send-all" /><label htmlFor="send-all" className="text-sm">Cały zespół ({teamMemberIds.length} osób)</label></div>
          {!sendToAll && <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2">{teamMembers.map(m => (<label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"><Checkbox checked={selectedIds.includes(m.id)} onCheckedChange={() => toggleMember(m.id)} />{m.first_name} {m.last_name} <span className="text-xs text-muted-foreground">({m.eq_id})</span></label>))}</div>}
          <Button onClick={() => sendMutation.mutate()} disabled={!title || !message || sendMutation.isPending}>{sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Wyślij</Button>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Historia wysłanych</h4>
          {historyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : history.length === 0 ? <p className="text-sm text-muted-foreground">Brak historii</p> : (
            <div className="space-y-2 max-h-60 overflow-y-auto">{history.map(n => (<div key={n.id} className="text-sm border rounded p-2"><div className="flex items-center justify-between"><span className="font-medium">{n.title}</span><span className="text-xs text-muted-foreground">{n.created_at ? format(new Date(n.created_at), 'dd.MM.yyyy HH:mm', { locale: pl }) : ''}</span></div><p className="text-muted-foreground text-xs mt-1 line-clamp-2">{n.message}</p></div>))}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderNotificationsView;
