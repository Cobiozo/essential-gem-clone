import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  guest_token_id?: string | null;
  _optimistic?: boolean;
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Helper: check if a message belongs to the current user (authenticated or guest)
  const isOwnMessage = useCallback((msg: ChatMessage) => {
    if (guestTokenId) {
      return msg.guest_token_id === guestTokenId || msg.user_id === userId;
    }
    return msg.user_id === userId;
  }, [userId, guestTokenId]);

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

  // Subscribe to new messages with reconnect logic
  useEffect(() => {
    const setupChannel = () => {
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch {}
      }

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
              // Deduplicate: replace optimistic message or skip if already exists
              const existingIdx = prev.findIndex(m => m.id === msg.id);
              if (existingIdx >= 0) return prev;
              
              // Replace optimistic message (match by content + user + approximate time)
              const optimisticIdx = prev.findIndex(m => 
                m._optimistic && 
                m.content === msg.content && 
                (m.user_id === msg.user_id || m.guest_token_id === msg.guest_token_id)
              );
              if (optimisticIdx >= 0) {
                const updated = [...prev];
                updated[optimisticIdx] = msg;
                return updated;
              }

              return [...prev, msg];
            });
            if (!isOwnMessage(msg)) {
              onNewMessage();
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[MeetingChat] Channel error, reconnecting in 3s...');
            setTimeout(setupChannel, 3000);
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId, userId, onNewMessage, isOwnMessage]);

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

    // Optimistic update
    const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      room_id: roomId,
      user_id: guestTokenId ? '' : userId,
      guest_token_id: guestTokenId || null,
      display_name: displayName,
      content: messageText,
      created_at: new Date().toISOString(),
      target_user_id: targetUserId !== 'all' ? targetUserId : null,
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);

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
        setSending(false);
        return;
      }
      setSendError(true);
      setInput(messageText);
      // Remove optimistic message on final failure
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
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
  // Fixed for guest users: check guest_token_id as well
  const visibleMessages = messages.filter((msg) => {
    if (!msg.target_user_id) return true; // public
    if (guestTokenId) {
      return msg.guest_token_id === guestTokenId || msg.target_user_id === userId || msg.user_id === userId;
    }
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
            const isOwn = isOwnMessage(msg);
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
                  } ${msg._optimistic ? 'opacity-60' : ''}`}
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
