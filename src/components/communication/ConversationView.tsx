import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Send, User, Users, MoreVertical, Archive, CheckCircle, Play, Trash2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PrivateChatThread, PrivateChatMessage } from '@/types/privateChat';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationViewProps {
  thread: PrivateChatThread;
  messages: PrivateChatMessage[];
  loading: boolean;
  onSendMessage: (content: string) => Promise<boolean>;
  onBack: () => void;
  onUpdateStatus: (status: 'active' | 'closed' | 'archived') => void;
  onDelete: () => void;
  getOtherParticipant: (thread: PrivateChatThread) => any;
  getThreadDisplayName: (thread: PrivateChatThread) => string;
}

export const ConversationView = ({
  thread,
  messages,
  loading,
  onSendMessage,
  onBack,
  onUpdateStatus,
  onDelete,
  getOtherParticipant,
  getThreadDisplayName,
}: ConversationViewProps) => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayName = getThreadDisplayName(thread);
  const isActive = thread.status === 'active';

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const success = await onSendMessage(newMessage.trim());
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

  const formatMessageTime = (date: string) => {
    try {
      return format(new Date(date), 'HH:mm', { locale: pl });
    } catch {
      return '';
    }
  };

  const formatMessageDate = (date: string) => {
    try {
      return format(new Date(date), 'd MMMM yyyy', { locale: pl });
    } catch {
      return '';
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: PrivateChatMessage[] }[] = [];
  let currentDate = '';
  
  messages.forEach(msg => {
    const msgDate = formatMessageDate(msg.created_at);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          thread.is_group ? 'bg-accent' : 'bg-primary/10'
        }`}>
          {thread.is_group ? (
            <Users className="h-5 w-5 text-accent-foreground" />
          ) : (
            <User className="h-5 w-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{displayName}</h3>
            <Badge 
              variant={thread.status === 'active' ? 'default' : 'secondary'}
              className="text-[10px]"
            >
              {thread.status === 'active' ? 'Aktywny' : thread.status === 'closed' ? 'Zamknięty' : 'Archiwum'}
            </Badge>
          </div>
          {thread.subject && (
            <p className="text-sm text-muted-foreground truncate">{thread.subject}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {thread.status === 'active' ? (
              <DropdownMenuItem onClick={() => onUpdateStatus('closed')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Zamknij wątek
              </DropdownMenuItem>
            ) : thread.status === 'closed' ? (
              <DropdownMenuItem onClick={() => onUpdateStatus('active')}>
                <Play className="h-4 w-4 mr-2" />
                Wznów wątek
              </DropdownMenuItem>
            ) : null}
            
            {thread.status !== 'archived' && (
              <DropdownMenuItem onClick={() => onUpdateStatus('archived')}>
                <Archive className="h-4 w-4 mr-2" />
                Archiwizuj
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Usuń wątek
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                  <div className="h-16 w-48 bg-muted animate-pulse rounded-lg" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Brak wiadomości</p>
              <p className="text-sm mt-1">Rozpocznij rozmowę!</p>
            </div>
          ) : (
            groupedMessages.map(({ date, messages: dayMessages }) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{date}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                
                {dayMessages.map(msg => {
                  const isOwn = msg.sender_id === user?.id;
                  const senderName = msg.sender
                    ? `${msg.sender.first_name || ''} ${msg.sender.last_name || ''}`.trim() || msg.sender.email
                    : 'Nieznany';

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
                        {!isOwn && thread.is_group && (
                          <p className="text-xs text-muted-foreground mb-1 ml-1">
                            {senderName}
                          </p>
                        )}
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${
                            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {formatMessageTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        {isActive ? (
          <div className="flex gap-2">
            <Textarea
              placeholder="Napisz wiadomość..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="resize-none min-h-[40px] max-h-[120px]"
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className="flex-shrink-0 h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-sm">
              Wątek {thread.status === 'closed' ? 'zamknięty' : 'zarchiwizowany'}
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => onUpdateStatus('active')}
            >
              Wznów
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
