import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderTeamMembers } from '@/hooks/useLeaderTeamMembers';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const LeaderEmailView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { teamMembers, teamMemberIds, loading: teamLoading } = useLeaderTeamMembers();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [sending, setSending] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, name, subject')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['leader-email-logs', user?.id],
    queryFn: async () => {
      if (!teamMemberIds.length) return [];
      const { data, error } = await supabase
        .from('email_logs')
        .select('id, recipient_email, subject, status, created_at')
        .in('recipient_user_id', teamMemberIds)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && teamMemberIds.length > 0,
  });

  const handleSend = async () => {
    if (!selectedTemplateId) return;
    const recipients = sendToAll ? teamMembers : teamMembers.filter(m => selectedIds.includes(m.id));
    if (recipients.length === 0) { toast({ title: 'Brak odbiorców', variant: 'destructive' }); return; }

    setSending(true);
    let successCount = 0;
    for (const member of recipients) {
      if (!member.email) continue;
      try {
        await supabase.functions.invoke('send-single-email', {
          body: {
            recipientEmail: member.email,
            recipientUserId: member.id,
            templateId: selectedTemplateId,
            variables: {
              firstName: member.first_name || '',
              lastName: member.last_name || '',
            },
          },
        });
        successCount++;
      } catch (err) {
        console.error('Email send error for', member.email, err);
      }
    }

    await supabase.from('platform_team_actions').insert({
      leader_user_id: user!.id,
      action_type: 'send_team_email',
      new_value: `template:${selectedTemplateId} (${successCount}/${recipients.length})`,
    });

    toast({ title: 'Wysłano', description: `${successCount} z ${recipients.length} emaili wysłanych` });
    setSending(false);
  };

  const toggleMember = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Emaile do zespołu
        </CardTitle>
        <CardDescription>Wysyłaj emaile grupowe do członków zespołu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 border rounded-lg p-4">
          <div>
            <Label>Szablon email</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger><SelectValue placeholder="Wybierz szablon" /></SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} — {t.subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={sendToAll} onCheckedChange={(v) => setSendToAll(!!v)} id="email-all" />
            <label htmlFor="email-all" className="text-sm">Cały zespół ({teamMemberIds.length} osób)</label>
          </div>
          {!sendToAll && (
            <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2">
              {teamMembers.map(m => (
                <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                  <Checkbox checked={selectedIds.includes(m.id)} onCheckedChange={() => toggleMember(m.id)} />
                  {m.first_name} {m.last_name} <span className="text-xs text-muted-foreground">({m.email})</span>
                </label>
              ))}
            </div>
          )}
          <Button onClick={handleSend} disabled={!selectedTemplateId || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Wyślij emaile
          </Button>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Historia emaili</h4>
          {historyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak historii</p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {history.map(e => (
                <div key={e.id} className="text-sm border rounded p-2 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{e.subject}</span>
                    <span className="text-xs text-muted-foreground ml-2">{e.recipient_email}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {e.created_at ? format(new Date(e.created_at), 'dd.MM HH:mm', { locale: pl }) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderEmailView;
