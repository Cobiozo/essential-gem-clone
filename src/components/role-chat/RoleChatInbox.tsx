import { useState, useEffect, useMemo } from 'react';
import { Inbox, CheckCheck, User, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useRoleChat } from '@/hooks/useRoleChat';
import { ROLE_LABELS } from '@/types/roleChat';
import { format, isToday, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SenderInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export const RoleChatInbox = () => {
  const { user } = useAuth();
  const {
    channels,
    messages,
    loading,
    userRole,
    markAsRead,
    refetch,
  } = useRoleChat({ enableRealtime: true });
  
  const [senderProfiles, setSenderProfiles] = useState<Record<string, SenderInfo>>({});
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  
  // Get channels where user is recipient (can read)
  const incomingChannels = useMemo(() => {
    return channels.filter(c => c.target_role === userRole && c.is_active);
  }, [channels, userRole]);
  
  // Get messages for incoming channels
  const incomingMessages = useMemo(() => {
    const channelIds = incomingChannels.map(c => c.id);
    return messages
      .filter(m => m.channel_id && channelIds.includes(m.channel_id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [messages, incomingChannels]);
  
  // Group messages by sender role
  const messagesBySender = useMemo(() => {
    const grouped: Record<string, typeof incomingMessages> = {};
    incomingMessages.forEach(msg => {
      const key = msg.sender_role;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(msg);
    });
    return grouped;
  }, [incomingMessages]);
  
  // Fetch sender profiles
  useEffect(() => {
    const fetchSenderProfiles = async () => {
      const senderIds = [...new Set(incomingMessages.map(m => m.sender_id))];
      if (senderIds.length === 0) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', senderIds);
      
      if (data) {
        const profiles: Record<string, SenderInfo> = {};
        data.forEach(p => {
          profiles[p.user_id] = {
            id: p.user_id,
            first_name: p.first_name,
            last_name: p.last_name,
          };
        });
        setSenderProfiles(profiles);
      }
    };
    
    fetchSenderProfiles();
  }, [incomingMessages]);
  
  // Get sender display name
  const getSenderName = (senderId: string, senderRole: string) => {
    const profile = senderProfiles[senderId];
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return ROLE_LABELS[senderRole] || senderRole;
  };
  
  // Format date helper
  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: pl });
    }
    if (isYesterday(date)) {
      return `Wczoraj, ${format(date, 'HH:mm', { locale: pl })}`;
    }
    return format(date, 'dd MMM, HH:mm', { locale: pl });
  };
  
  // Mark all from sender as read
  const handleMarkAllAsRead = async (senderRole: string) => {
    const unreadMessages = messagesBySender[senderRole]?.filter(m => !m.is_read) || [];
    for (const msg of unreadMessages) {
      await markAsRead(msg.id);
    }
  };
  
  // Count unread per sender
  const getUnreadCount = (senderRole: string) => {
    return messagesBySender[senderRole]?.filter(m => !m.is_read).length || 0;
  };
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If viewing a specific sender's messages
  if (selectedSender) {
    const senderMessages = messagesBySender[selectedSender] || [];
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSender(null)}
              className="gap-2"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Powrót
            </Button>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4" />
              Od: {ROLE_LABELS[selectedSender] || selectedSender}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkAllAsRead(selectedSender)}
              disabled={getUnreadCount(selectedSender) === 0}
              className="gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Oznacz jako przeczytane
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {senderMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Brak wiadomości od {ROLE_LABELS[selectedSender]}
              </div>
            ) : (
              <div className="space-y-3">
                {senderMessages.map(message => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      message.is_read 
                        ? 'bg-background border-border' 
                        : 'bg-primary/5 border-primary/20'
                    }`}
                    onClick={() => !message.is_read && markAsRead(message.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {getSenderName(message.sender_id, message.sender_role)}
                          </span>
                          {!message.is_read && (
                            <Badge variant="default" className="h-5 text-xs">
                              Nowa
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatMessageDate(message.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }
  
  // Sender list view
  const senderRoles = Object.keys(messagesBySender);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Inbox className="h-5 w-5" />
            Wiadomości od przełożonych
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {senderRoles.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nie masz jeszcze żadnych wiadomości od przełożonych
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Tutaj pojawią się wiadomości od {userRole === 'client' ? 'specjalistów, partnerów i administratorów' : 
                userRole === 'specjalista' ? 'partnerów i administratorów' : 'administratorów'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {senderRoles.map(senderRole => {
              const msgs = messagesBySender[senderRole];
              const unreadCount = getUnreadCount(senderRole);
              const latestMessage = msgs[0];
              
              return (
                <button
                  key={senderRole}
                  onClick={() => setSelectedSender(senderRole)}
                  className={`w-full p-4 rounded-lg border text-left transition-all hover:shadow-md ${
                    unreadCount > 0 
                      ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' 
                      : 'bg-background border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        unreadCount > 0 ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        <User className={`h-5 w-5 ${unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {ROLE_LABELS[senderRole] || senderRole}
                          </span>
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                        {latestMessage && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {latestMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {latestMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatMessageDate(latestMessage.created_at)}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
