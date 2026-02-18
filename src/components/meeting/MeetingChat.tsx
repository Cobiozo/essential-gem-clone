import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, X, MessageCircleOff, Lock } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string | null;
  content: string;
  created_at: string;
  target_user_id?: string | null;
}

interface Participant {
  peerId: string;
  displayName: string;
  userId?: string;
}

interface MeetingChatProps {
  roomId: string;
  userId: string;
  displayName: string;
  onClose: () => void;
  onNewMessage: () => void;
  chatDisabled?: boolean;
  participants?: Participant[];
  guestTokenId?: string;
}

export const MeetingChat: React.FC<MeetingChatProps> = ({
  roomId,
  userId,
  displayName,
  onClose,
  onNewMessage,
  chatDisabled = false,
  participants = [],
  guestTokenId,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>('all');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load existing messages
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('meeting_chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) {
        console.error('[MeetingChat] Failed to load messages:', error);
      }
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
          setMessages((prev) => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
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

  const handleSend = async (retryCount = 0) => {
    const text = input.trim();
    if (!text || sending || chatDisabled) return;
    setSending(true);
    setSendError(false);

    const messageText = text;
    setInput('');

    const insertData: Record<string, string> = {
      room_id: roomId,
      display_name: displayName,
      content: messageText,
    };

    if (guestTokenId) {
      insertData.guest_token_id = guestTokenId;
    } else {
      insertData.user_id = userId;
    }

    if (targetUserId !== 'all') {
      insertData.target_user_id = targetUserId;
    }

    const { error } = await supabase.from('meeting_chat_messages').insert(insertData as any);

    if (error) {
      console.error('[MeetingChat] Send error:', error);
      if (retryCount < 2) {
        setTimeout(() => handleSend(retryCount + 1), 1000);
        return;
      }
      setSendError(true);
      setInput(messageText);
    }

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

  // Filter messages: show public + private messages where user is sender or receiver
  const visibleMessages = messages.filter((msg) => {
    if (!msg.target_user_id) return true; // public
    return msg.user_id === userId || msg.target_user_id === userId;
  });

  // Get unique participants with userId for the selector
  const selectableParticipants = participants.filter(
    (p) => p.userId && p.userId !== userId
  );

  const getTargetName = (targetId: string) => {
    const p = participants.find((p) => p.userId === targetId);
    return p?.displayName || 'Uczestnik';
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
      <div className="flex-1 overflow-y-auto px-3 py-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="space-y-3 min-h-full flex flex-col justify-end">
          {visibleMessages.length === 0 && (
            <p className="text-zinc-500 text-xs text-center py-8">
              Brak wiadomości. Napisz coś!
            </p>
          )}
          {visibleMessages.map((msg) => {
            const isOwn = msg.user_id === userId;
            const isPrivate = !!msg.target_user_id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {isOwn ? 'Ty' : msg.display_name || 'Uczestnik'}
                  </span>
                  {isPrivate && (
                    <span className="text-[10px] text-purple-400 flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" />
                      {isOwn
                        ? `do ${getTargetName(msg.target_user_id!)}`
                        : 'prywatna'}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-600">{formatTime(msg.created_at)}</span>
                </div>
                <div
                  className={`max-w-[85%] px-3 py-1.5 rounded-xl text-sm ${
                    isPrivate
                      ? isOwn
                        ? 'bg-purple-600 text-white rounded-br-sm'
                        : 'bg-purple-900/50 text-purple-100 rounded-bl-sm'
                      : isOwn
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
      </div>

      {/* Input or disabled notice */}
      {chatDisabled ? (
        <div className="flex items-center justify-center gap-2 px-3 py-4 border-t border-zinc-800 text-zinc-500 text-xs">
          <MessageCircleOff className="h-4 w-4" />
          <span>Czat został wyłączony przez prowadzącego</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1 px-3 py-2 border-t border-zinc-800">
          {/* Recipient selector */}
          {selectableParticipants.length > 0 && (
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-300">
                <SelectValue placeholder="Wszyscy" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-xs text-zinc-300">
                  Wszyscy
                </SelectItem>
                {selectableParticipants.map((p) => (
                  <SelectItem
                    key={p.userId}
                    value={p.userId!}
                    className="text-xs text-zinc-300"
                  >
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-purple-400" />
                      {p.displayName}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {sendError && (
            <p className="text-red-400 text-xs">Nie udało się wysłać wiadomości. Spróbuj ponownie.</p>
          )}
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => { setInput(e.target.value); setSendError(false); }}
              onKeyDown={handleKeyDown}
              placeholder={targetUserId !== 'all' ? `Prywatna do ${getTargetName(targetUserId)}...` : 'Napisz wiadomość...'}
              className="flex-1 bg-zinc-800 text-white text-sm rounded-full px-4 py-2 outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
