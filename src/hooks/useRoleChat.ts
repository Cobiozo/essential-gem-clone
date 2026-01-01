import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RoleChatChannel, RoleChatMessage } from '@/types/roleChat';

interface UseRoleChatOptions {
  enableRealtime?: boolean;
}

export const useRoleChat = (options?: UseRoleChatOptions) => {
  const { user, profile } = useAuth();
  const [channels, setChannels] = useState<RoleChatChannel[]>([]);
  const [messages, setMessages] = useState<RoleChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<RoleChatChannel | null>(null);

  const enableRealtime = options?.enableRealtime ?? false;
  const userRole = profile?.role || 'client';

  const fetchChannels = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('role_chat_channels')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChannels((data || []) as RoleChatChannel[]);
    } catch (error) {
      console.error('Error fetching chat channels:', error);
    }
  }, [user]);

  const fetchMessages = useCallback(async (channelId?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('role_chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (channelId) {
        query = query.eq('channel_id', channelId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setMessages((data || []) as RoleChatMessage[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('role_chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .or(`recipient_id.eq.${user.id},and(recipient_id.is.null,recipient_role.eq.${userRole})`);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user, userRole]);

  const sendMessage = async (
    recipientRole: string,
    content: string,
    recipientId?: string
  ): Promise<boolean> => {
    if (!user || !profile) return false;

    try {
      // Find the appropriate channel
      const channel = channels.find(
        c => c.sender_role === userRole && c.target_role === recipientRole
      );

      const { error } = await supabase
        .from('role_chat_messages')
        .insert({
          channel_id: channel?.id || null,
          sender_id: user.id,
          sender_role: userRole,
          recipient_role: recipientRole,
          recipient_id: recipientId || null,
          content,
        });

      if (error) throw error;
      
      // Refresh messages
      if (selectedChannel) {
        await fetchMessages(selectedChannel.id);
      }
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('role_chat_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, is_read: true, read_at: new Date().toISOString() } : m)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markChannelAsRead = async (channelId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('role_chat_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('is_read', false)
        .or(`recipient_id.eq.${user.id},and(recipient_id.is.null,recipient_role.eq.${userRole})`);

      if (error) throw error;

      setMessages(prev =>
        prev.map(m => m.channel_id === channelId ? { ...m, is_read: true } : m)
      );
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking channel as read:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!user) return;
    fetchChannels();
    fetchUnreadCount();
  }, [user, fetchChannels, fetchUnreadCount]);

  // Realtime subscription - ONLY when enableRealtime is true
  useEffect(() => {
    if (!user || !enableRealtime) return;

    const channel = supabase
      .channel('role-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'role_chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as RoleChatMessage;
          // Only add if message is for this user
          if (
            newMessage.recipient_id === user.id ||
            (newMessage.recipient_id === null && newMessage.recipient_role === userRole)
          ) {
            setMessages(prev => [...prev, newMessage]);
            setUnreadCount(prev => prev + 1);
          }
          // Also add if this user sent it
          if (newMessage.sender_id === user.id) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole, enableRealtime]);

  // Fetch messages when channel changes
  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
      markChannelAsRead(selectedChannel.id);
    }
  }, [selectedChannel, fetchMessages]);

  return {
    channels,
    messages,
    unreadCount,
    loading,
    userRole,
    selectedChannel,
    setSelectedChannel,
    sendMessage,
    markAsRead,
    markChannelAsRead,
    refetch: () => {
      fetchChannels();
      fetchUnreadCount();
    },
  };
};
