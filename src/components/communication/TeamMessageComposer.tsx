import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Send, CheckSquare, Square, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivateChat } from '@/hooks/usePrivateChat';
import { toast } from 'sonner';

interface TeamMember {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  eq_id: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  partner: 'Partner',
  specjalista: 'Specjalista',
  client: 'Klient',
};

interface TeamMessageComposerProps {
  onMessageSent?: () => void;
}

export const TeamMessageComposer = ({ onMessageSent }: TeamMessageComposerProps) => {
  const { user, profile } = useAuth();
  const { createGroupThread, createOrGetThread } = usePrivateChat();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch team members from team_contacts where linked_user_id exists
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user || !profile?.eq_id) return;

      try {
        // Get contacts that are linked to real users (team members)
        const { data: contacts, error } = await supabase
          .from('team_contacts')
          .select('linked_user_id, first_name, last_name, email, role, eq_id')
          .eq('user_id', user.id)
          .eq('contact_type', 'team_member')
          .eq('is_active', true)
          .not('linked_user_id', 'is', null);

        if (error) throw error;

        // Get roles for linked users
        const linkedUserIds = contacts?.map(c => c.linked_user_id).filter(Boolean) || [];
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', linkedUserIds);

        const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

        const members: TeamMember[] = (contacts || []).map(c => ({
          user_id: c.linked_user_id!,
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email || '',
          role: roleMap.get(c.linked_user_id!) || c.role || 'client',
          eq_id: c.eq_id,
        }));

        setTeamMembers(members);
      } catch (error) {
        console.error('Error fetching team members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [user, profile?.eq_id]);

  const filteredMembers = teamMembers.filter(m => 
    roleFilter === 'all' || m.role === roleFilter
  );

  const handleSelectAll = () => {
    const allIds = new Set(filteredMembers.map(m => m.user_id));
    setSelectedIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const toggleMember = (userId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSend = async () => {
    if (selectedIds.size === 0 || !message.trim()) return;

    const selectedMembers = teamMembers.filter(m => selectedIds.has(m.user_id));
    
    if (selectedMembers.length === 0) {
      toast.error('Wybierz co najmniej jedną osobę');
      return;
    }

    if (selectedMembers.length > 1 && !subject.trim()) {
      toast.error('Temat jest wymagany dla wiadomości grupowych');
      return;
    }

    setSending(true);
    try {
      if (selectedMembers.length === 1) {
        // Single recipient - create 1:1 thread
        await createOrGetThread({
          participant_id: selectedMembers[0].user_id,
          subject: subject.trim() || undefined,
          initial_message: message.trim(),
        });
      } else {
        // Multiple recipients - create group thread
        await createGroupThread({
          participant_ids: selectedMembers.map(m => m.user_id),
          subject: subject.trim(),
          initial_message: message.trim(),
        });
      }

      toast.success(`Wiadomość wysłana do ${selectedMembers.length} ${selectedMembers.length === 1 ? 'osoby' : 'osób'}`);
      
      // Reset form
      setSelectedIds(new Set());
      setSubject('');
      setMessage('');
      onMessageSent?.();
    } catch (error) {
      console.error('Error sending team message:', error);
      toast.error('Nie udało się wysłać wiadomości');
    } finally {
      setSending(false);
    }
  };

  const getUserDisplayName = (m: TeamMember) => {
    const name = `${m.first_name || ''} ${m.last_name || ''}`.trim();
    return name || m.email;
  };

  const uniqueRoles = [...new Set(teamMembers.map(m => m.role))];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground py-8">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Brak członków zespołu</p>
            <p className="text-sm mt-1">
              Twoi członkowie zespołu pojawią się tutaj po rejestracji
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Wiadomość do zespołu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={sending}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Zaznacz wszystkich
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={sending || selectedIds.size === 0}
            >
              <Square className="h-4 w-4 mr-1" />
              Odznacz
            </Button>
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtruj rolę" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie role</SelectItem>
              {uniqueRoles.map(role => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role] || role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Team members list */}
        <ScrollArea className="h-[200px] border rounded-md">
          <div className="p-2 space-y-1">
            {filteredMembers.map(member => (
              <label
                key={member.user_id}
                className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.has(member.user_id)}
                  onCheckedChange={() => toggleMember(member.user_id)}
                  disabled={sending}
                />
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{getUserDisplayName(member)}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[member.role] || member.role}
                    {member.eq_id && ` • ${member.eq_id}`}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>

        {/* Selected count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Wybrano: <strong>{selectedIds.size}</strong> z {filteredMembers.length}
          </span>
          {selectedIds.size > 1 && (
            <Badge variant="secondary">Czat grupowy</Badge>
          )}
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="team-subject">
            Temat {selectedIds.size > 1 && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="team-subject"
            placeholder="Temat wiadomości..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={sending}
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="team-message">Wiadomość *</Label>
          <Textarea
            id="team-message"
            placeholder="Napisz wiadomość do zespołu..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            disabled={sending}
          />
        </div>

        {/* Send button */}
        <Button
          className="w-full"
          onClick={handleSend}
          disabled={sending || selectedIds.size === 0 || !message.trim() || (selectedIds.size > 1 && !subject.trim())}
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Wysyłanie...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Wyślij wiadomość
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
