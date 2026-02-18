import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string | null;
  content: string;
  created_at: string;
}

interface MeetingChatProps {
  roomId: string;
  userId: string;
  displayName: string;
  onClose: () => void;
  onNewMessage: () => void;
}

export const MeetingChat: React.FC<MeetingChatProps> = ({
  roomId,
  userId,
  displayName,
  onClose,
  onNewMessage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load existing messages
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('meeting_chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (data) setMessages(data as ChatMessage[]);
    };
    load();
  }, [roomId]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`meeting-chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, msg]);
          if (msg.user_id !== userId) {
            onNewMessage();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId, onNewMessage]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    await supabase.from('meeting_chat_messages').insert({
      room_id: roomId,
      user_id: userId,
      display_name: displayName,
      content: text,
    });

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Czat w spotkaniu</h3>
        <button onClick={onClose} className="text-zinc-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-zinc-500 text-xs text-center py-8">
              Brak wiadomości. Napisz coś!
            </p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.user_id === userId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {isOwn ? 'Ty' : msg.display_name || 'Uczestnik'}
                  </span>
                  <span className="text-[10px] text-zinc-600">{formatTime(msg.created_at)}</span>
                </div>
                <div
                  className={`max-w-[85%] px-3 py-1.5 rounded-xl text-sm ${
                    isOwn
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Napisz wiadomość..."
          className="flex-1 bg-zinc-800 text-white text-sm rounded-full px-4 py-2 outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
};
