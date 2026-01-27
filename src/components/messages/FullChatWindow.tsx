import { useEffect, useRef } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { UnifiedChannel, UnifiedMessage } from '@/hooks/useUnifiedChat';
import { MessageBubble } from '@/components/unified-chat/MessageBubble';
import { MessageInput } from '@/components/unified-chat/MessageInput';

interface FullChatWindowProps {
  channel: UnifiedChannel;
  messages: UnifiedMessage[];
  loading: boolean;
  onSend: (content: string) => Promise<boolean>;
  onBack: () => void;
}

export const FullChatWindow = ({
  channel,
  messages,
  loading,
  onSend,
  onBack,
}: FullChatWindowProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

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
            className="md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h3 className="font-semibold text-foreground">{channel.name}</h3>
        </div>
        <Button variant="ghost" size="icon">
          <Search className="h-4 w-4" />
        </Button>
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
              <p className="text-sm">Brak wiadomości w tym kanale</p>
              {channel.canSend && (
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
                    <MessageBubble message={message} />
                  </div>
                );
              })}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      {channel.canSend ? (
        <MessageInput onSend={onSend} />
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
