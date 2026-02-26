import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Smartphone, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderTeamMembers } from '@/hooks/useLeaderTeamMembers';
import { useToast } from '@/hooks/use-toast';

const LeaderPushView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { teamMembers, teamMemberIds } = useLeaderTeamMembers();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const recipients = sendToAll ? teamMemberIds : selectedIds;
      if (recipients.length === 0) throw new Error('Brak odbiorców');

      let successCount = 0;
      for (const uid of recipients) {
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: { userId: uid, title, body },
          });
          successCount++;
        } catch (err) {
          console.error('Push error for', uid, err);
        }
      }

      await supabase.from('platform_team_actions').insert({
        leader_user_id: user!.id,
        action_type: 'send_team_push',
        new_value: `${title} (${successCount}/${recipients.length})`,
      });

      return successCount;
    },
    onSuccess: (count) => {
      toast({ title: 'Wysłano', description: `Push wysłany do ${count} osób` });
      setTitle('');
      setBody('');
    },
    onError: (err: any) => {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    },
  });

  const toggleMember = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Push do zespołu
        </CardTitle>
        <CardDescription>Wyślij powiadomienia push do członków zespołu.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 border rounded-lg p-4">
          <div>
            <Label>Tytuł</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tytuł push" />
          </div>
          <div>
            <Label>Treść</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Treść powiadomienia" rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={sendToAll} onCheckedChange={(v) => setSendToAll(!!v)} id="push-all" />
            <label htmlFor="push-all" className="text-sm">Cały zespół ({teamMemberIds.length} osób)</label>
          </div>
          {!sendToAll && (
            <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2">
              {teamMembers.map(m => (
                <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                  <Checkbox checked={selectedIds.includes(m.id)} onCheckedChange={() => toggleMember(m.id)} />
                  {m.first_name} {m.last_name}
                </label>
              ))}
            </div>
          )}
          <Button onClick={() => sendMutation.mutate()} disabled={!title || !body || sendMutation.isPending}>
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Wyślij push
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderPushView;
