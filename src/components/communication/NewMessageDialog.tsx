import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Send, User, Users, MessageSquare, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChatPermissions } from '@/hooks/useChatPermissions';
import { usePrivateChat } from '@/hooks/usePrivateChat';
import { toast } from 'sonner';

interface UserResult {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role?: string;
}

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThreadCreated?: (threadId: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  partner: 'Partner',
  specjalista: 'Specjalista',
  client: 'Klient',
};

export const NewMessageDialog = ({ open, onOpenChange, onThreadCreated }: NewMessageDialogProps) => {
  const { user } = useAuth();
  const { canMessageRole, getTargetRoles, canSendGroup } = useChatPermissions();
  const { createOrGetThread, createGroupThread } = usePrivateChat();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  const targetRoles = getTargetRoles();
  const isGroupMode = selectedUsers.length > 1;

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        // Build query
        let query = supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .neq('user_id', user?.id)
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(20);

        const { data: profiles, error } = await query;
        if (error) throw error;

        // Get roles for found users
        const userIds = profiles?.map(p => p.user_id) || [];
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        const roleMap = new Map(roles?.map(r => [r.user_id, r.role]));

        // Filter by permissions and role filter
        const filteredResults = (profiles || [])
          .map(p => ({ ...p, role: roleMap.get(p.user_id) || 'client' }))
          .filter(p => {
            // Check if current user can message this role
            if (!canMessageRole(p.role)) return false;
            // Apply role filter
            if (roleFilter !== 'all' && p.role !== roleFilter) return false;
            // Exclude already selected users
            if (selectedUsers.some(s => s.user_id === p.user_id)) return false;
            return true;
          });

        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, roleFilter, user, canMessageRole, selectedUsers]);

  const handleSelectUser = (userResult: UserResult) => {
    setSelectedUsers(prev => [...prev, userResult]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  const handleSend = async () => {
    if (selectedUsers.length === 0 || !message.trim()) return;

    setSending(true);
    try {
      let thread;

      if (selectedUsers.length === 1) {
        // 1:1 chat
        thread = await createOrGetThread({
          participant_id: selectedUsers[0].user_id,
          subject: subject.trim() || undefined,
          initial_message: message.trim(),
        });
      } else {
        // Group chat
        if (!subject.trim()) {
          toast.error('Temat jest wymagany dla czatów grupowych');
          setSending(false);
          return;
        }
        thread = await createGroupThread({
          participant_ids: selectedUsers.map(u => u.user_id),
          subject: subject.trim(),
          initial_message: message.trim(),
        });
      }

      if (thread) {
        onThreadCreated?.(thread.id);
        toast.success('Wiadomość wysłana');
        handleClose();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Nie udało się wysłać wiadomości');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setSubject('');
    setMessage('');
    setRoleFilter('all');
    onOpenChange(false);
  };

  const getUserDisplayName = (u: UserResult) => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return name || u.email;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Nowa wiadomość
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(u => (
                <Badge key={u.user_id} variant="secondary" className="gap-1 pr-1">
                  {getUserDisplayName(u)}
                  <button
                    onClick={() => handleRemoveUser(u.user_id)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label>Do:</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj użytkownika..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filtruj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie role</SelectItem>
                  {targetRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role] || role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <ScrollArea className="max-h-40 border rounded-md">
              <div className="p-2 space-y-1">
                {searchResults.map(u => (
                  <button
                    key={u.user_id}
                    onClick={() => handleSelectUser(u)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md text-left"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getUserDisplayName(u)}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[u.role || 'client']}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {searching && (
            <p className="text-sm text-muted-foreground text-center">Szukanie...</p>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              Temat {isGroupMode && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="subject"
              placeholder="Temat rozmowy..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="space-y-2 flex-1 flex flex-col">
            <Label htmlFor="message">Wiadomość *</Label>
            <Textarea
              id="message"
              placeholder="Napisz wiadomość..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 min-h-[100px]"
            />
          </div>

          {/* Group chat indicator */}
          {isGroupMode && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
              <Users className="h-4 w-4" />
              Czat grupowy z {selectedUsers.length} osobami
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Anuluj
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || selectedUsers.length === 0 || !message.trim() || (isGroupMode && !subject.trim())}
          >
            {sending ? 'Wysyłanie...' : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Wyślij
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
