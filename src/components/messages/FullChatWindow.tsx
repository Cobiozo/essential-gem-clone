import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import type { UnifiedChannel, UnifiedMessage, TeamMemberChannel } from '@/hooks/useUnifiedChat';
import { MessageBubble } from '@/components/unified-chat/MessageBubble';
import { MessageInput } from '@/components/unified-chat/MessageInput';
import { ConversationActions } from './ConversationActions';
import { supabase } from '@/integrations/supabase/client';

interface FullChatWindowProps {
  channel: UnifiedChannel | null;
  directMember?: TeamMemberChannel | null;
  messages: UnifiedMessage[];
  loading: boolean;
  onSend: (content: string, messageType?: string, attachmentUrl?: string, attachmentName?: string) => Promise<boolean>;
  onBack: () => void;
  // Admin conversation props
  isAdmin?: boolean;
  adminConversationStatus?: string | null;
  onCloseConversation?: () => void;
  // Conversation settings
  onDeleteConversation?: (userId: string) => void;
  onArchiveConversation?: (userId: string) => void;
  onBlockUser?: (userId: string) => void;
  onUnblockUser?: (userId: string) => void;
  isConversationArchived?: boolean;
  isConversationBlocked?: boolean;
  onDeleteMessage?: (messageId: string) => Promise<boolean>;
  recipientChatDisabled?: boolean;
}

export const FullChatWindow = ({
  channel,
  directMember,
  messages,
  loading,
  onSend,
  onBack,
  isAdmin = false,
  adminConversationStatus,
  onCloseConversation,
  onDeleteConversation,
  onArchiveConversation,
  onBlockUser,
  onUnblockUser,
  isConversationArchived = false,
  isConversationBlocked = false,
  onDeleteMessage,
  recipientChatDisabled = false,
}: FullChatWindowProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [otherUserDeletedConvo, setOtherUserDeletedConvo] = useState(false);

  // Check if the other user has deleted the conversation
  useEffect(() => {
    if (!directMember) {
      setOtherUserDeletedConvo(false);
      return;
    }
    const checkOtherUserDeletion = async () => {
      const { data } = await supabase
        .from('conversation_user_settings')
        .select('deleted_at')
        .eq('user_id', directMember.userId)
        .eq('other_user_id', (await supabase.auth.getUser()).data.user?.id || '')
        .maybeSingle();
      setOtherUserDeletedConvo(!!data?.deleted_at);
    };
    checkOtherUserDeletion();
  }, [directMember]);
  
  // Determine display name and capabilities
  const displayName = directMember 
    ? `${directMember.firstName} ${directMember.lastName}`
    : channel?.name || '';
  
  const canSend = recipientChatDisabled
    ? false
    : adminConversationStatus === 'closed' 
      ? false 
      : directMember ? true : channel?.canSend;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Header */}
      <header className="h-14 px-4 border-b border-border flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile back button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Show avatar for direct member */}
          {directMember && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={directMember.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {directMember.firstName?.charAt(0)}{directMember.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          )}
          
          <h3 className="font-semibold text-foreground">{displayName}</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Admin close conversation button */}
          {isAdmin && directMember && adminConversationStatus === 'open' && onCloseConversation && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCloseConversation}
              className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
            >
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Zakończ konwersację</span>
            </Button>
          )}
          {isAdmin && directMember && adminConversationStatus === 'closed' && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              🔒 Zamknięta
            </span>
          )}
          {/* Conversation actions menu */}
          {directMember && onDeleteConversation && onArchiveConversation && onBlockUser && onUnblockUser && (
            <ConversationActions
              otherUserId={directMember.userId}
              otherUserName={`${directMember.firstName} ${directMember.lastName}`}
              isArchived={isConversationArchived}
              isBlocked={isConversationBlocked}
              onDelete={onDeleteConversation}
              onArchive={onArchiveConversation}
              onBlock={onBlockUser}
              onUnblock={onUnblockUser}
            />
          )}
        </div>
      </header>

      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {otherUserDeletedConvo && (
                <p className="text-xs text-muted-foreground/70 mb-2">
                  ℹ️ {directMember?.firstName} usunął(ęła) historię tej rozmowy
                </p>
              )}
              <p className="text-sm">
                {directMember 
                  ? `Rozpocznij rozmowę z ${directMember.firstName}` 
                  : 'Brak wiadomości w tym kanale'}
              </p>
              {canSend && (
                <p className="text-xs mt-1">Wyślij pierwszą wiadomość poniżej</p>
              )}
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                const showDateSeparator =
                  !prevMessage ||
                  new Date(message.createdAt).toDateString() !==
                    new Date(prevMessage.createdAt).toDateString();

                return (
                  <div key={message.id}>
                    {showDateSeparator && (
                      <DateSeparator date={new Date(message.createdAt)} />
                    )}
                    <MessageBubble message={message} onDelete={onDeleteMessage} />
                  </div>
                );
              })}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      {canSend ? (
        <MessageInput onSend={onSend} />
      ) : recipientChatDisabled ? (
        <div className="p-4 border-t border-border bg-muted/50 text-center shrink-0">
          <p className="text-sm text-muted-foreground">
            🚫 Ten użytkownik nie ma włączonego czatu. Wysyłanie wiadomości jest niemożliwe.
          </p>
        </div>
      ) : adminConversationStatus === 'closed' ? (
        <div className="p-4 border-t border-border bg-muted/50 text-center shrink-0">
          <p className="text-sm text-muted-foreground">
            🔒 Konwersacja została zamknięta przez administratora
          </p>
        </div>
      ) : (
        <div className="p-4 border-t border-border bg-muted/50 text-center shrink-0">
          <p className="text-sm text-muted-foreground">
            Ten kanał jest tylko do odbioru wiadomości
          </p>
        </div>
      )}
    </div>
  );
};

interface DateSeparatorProps {
  date: Date;
}

const DateSeparator = ({ date }: DateSeparatorProps) => {
  const formatDate = (d: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Dzisiaj';
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Wczoraj';
    }
    return d.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="flex items-center gap-4 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium">
        {formatDate(date)}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};
