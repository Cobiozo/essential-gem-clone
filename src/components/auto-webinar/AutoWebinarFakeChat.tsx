import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAutoWebinarFakeChat } from '@/hooks/useAutoWebinarFakeChat';
import { cn } from '@/lib/utils';

interface AutoWebinarFakeChatProps {
  configId: string | null;
  startOffset: number;
  isPlaying: boolean;
}

export const AutoWebinarFakeChat: React.FC<AutoWebinarFakeChatProps> = ({
  configId,
  startOffset,
  isPlaying,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { messages, sendMessage } = useAutoWebinarFakeChat(configId, startOffset, isPlaying);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Bubble notification state
  const [bubble, setBubble] = useState<{ author: string; content: string } | null>(null);
  const lastSeenCountRef = useRef(0);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Update lastSeenCount when chat is open
  useEffect(() => {
    if (isOpen) {
      lastSeenCountRef.current = messages.length;
      setBubble(null);
      clearTimeout(bubbleTimerRef.current);
    }
  }, [isOpen, messages.length]);

  // Show bubble when chat is closed and new messages arrive
  useEffect(() => {
    if (isOpen) return;
    if (messages.length > lastSeenCountRef.current && messages.length > 0) {
      const latest = messages[messages.length - 1];
      if (latest.isFake) {
        setBubble({ author: latest.author_name, content: latest.content });
        clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = setTimeout(() => setBubble(null), 3000);
      }
      lastSeenCountRef.current = messages.length;
    }
  }, [messages.length, isOpen, messages]);

  // Cleanup timer
  useEffect(() => {
    return () => clearTimeout(bubbleTimerRef.current);
  }, []);

  // Auto-scroll when new messages appear
  useEffect(() => {
    if (messages.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    sendMessage(text);
    setInputValue('');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600',
      'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const unreadCount = messages.length - lastSeenCountRef.current;

  return (
    <>
      {/* Floating bubble notification */}
      {!isOpen && bubble && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute bottom-16 right-4 z-20 max-w-[260px] bg-background/95 backdrop-blur-md border border-border rounded-xl px-3 py-2 shadow-lg animate-fade-in cursor-pointer text-left"
        >
          <p className="text-xs font-semibold text-foreground truncate">{bubble.author}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{bubble.content}</p>
        </button>
      )}

      {/* Chat toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white/90 rounded-full px-4 py-2.5 text-sm font-medium hover:bg-black/70 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Czat
          {messages.length > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
              {messages.length > 99 ? '99+' : messages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="absolute top-0 right-0 bottom-0 w-72 sm:w-80 z-20 flex flex-col bg-background/95 backdrop-blur-md border-l border-border shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Czat spotkania</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Brak wiadomości
              </p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-2 items-start">
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarFallback className={cn('text-[10px] text-white', getAvatarColor(msg.author_name))}>
                    {getInitials(msg.author_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight">
                    {msg.author_name}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug break-words">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Napisz wiadomość..."
                className="h-8 text-xs"
              />
              <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!inputValue.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
