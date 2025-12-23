import { useState } from 'react';
import { MessageSquare, Send, ChevronLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useRoleChat } from '@/hooks/useRoleChat';
import { ROLE_LABELS, getRolesUserCanMessageTo } from '@/types/roleChat';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export const RoleChatWidget = () => {
  const {
    channels,
    messages,
    unreadCount,
    loading,
    userRole,
    selectedChannel,
    setSelectedChannel,
    sendMessage,
  } = useRoleChat();

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const availableRoles = getRolesUserCanMessageTo(userRole);
  const canSend = availableRoles.length > 0;

  // Filter channels where user is sender (can write) or recipient (can read)
  const sendableChannels = channels.filter(c => c.sender_role === userRole);
  const receivableChannels = channels.filter(c => c.target_role === userRole);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedChannel) return;

    setSending(true);
    const success = await sendMessage(selectedChannel.target_role, newMessage.trim());
    if (success) {
      setNewMessage('');
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Channel list view
  if (!selectedChannel) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Czat wewnętrzny
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Channels where user can send */}
          {sendableChannels.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Wyślij wiadomość do:
              </h3>
              <div className="space-y-2">
                {sendableChannels.map(channel => (
                  <Button
                    key={channel.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setSelectedChannel(channel)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {ROLE_LABELS[channel.target_role] || channel.target_role}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Channels where user can receive */}
          {receivableChannels.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Wiadomości od:
              </h3>
              <div className="space-y-2">
                {receivableChannels.map(channel => (
                  <Button
                    key={channel.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setSelectedChannel(channel)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {ROLE_LABELS[channel.sender_role] || channel.sender_role}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {sendableChannels.length === 0 && receivableChannels.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              Brak dostępnych kanałów czatu
            </p>
          )}

          {!canSend && (
            <p className="text-sm text-muted-foreground text-center">
              Jako {ROLE_LABELS[userRole]} możesz tylko odbierać wiadomości.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Chat view
  const channelMessages = messages.filter(m => m.channel_id === selectedChannel.id);
  const isUserSender = selectedChannel.sender_role === userRole;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelectedChannel(null)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg">
            {isUserSender 
              ? `Do: ${ROLE_LABELS[selectedChannel.target_role]}`
              : `Od: ${ROLE_LABELS[selectedChannel.sender_role]}`
            }
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[300px] border rounded-md p-3">
          {channelMessages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Brak wiadomości w tym kanale
            </p>
          ) : (
            <div className="space-y-3">
              {channelMessages.map(message => {
                const isOwn = message.sender_id === message.sender_id && message.sender_role === userRole;
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {format(new Date(message.created_at), 'dd MMM, HH:mm', { locale: pl })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {isUserSender && (
          <div className="flex gap-2">
            <Textarea
              placeholder="Napisz wiadomość..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className="h-[60px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!isUserSender && (
          <p className="text-sm text-muted-foreground text-center">
            Tylko {ROLE_LABELS[selectedChannel.sender_role]} może wysyłać wiadomości w tym kanale.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
